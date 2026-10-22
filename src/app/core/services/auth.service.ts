import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL, AUTH_LOGIN_URL } from '../config/api.config';

interface LoginRequest { username: string; password: string; }
interface LoginResponse { access: string; refresh: string; }
interface UserProfile { id: number; username: string; role: 'client' | 'driver' | 'admin'; }
interface TokenClaims { user_id?: number | string; exp?: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly accessTokenKey = 'transporte_access_token';
  private readonly refreshTokenKey = 'transporte_refresh_token';

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.logout();
    return this.http.post<LoginResponse>(AUTH_LOGIN_URL, credentials).pipe(
      switchMap(tokens => this.obtenerPerfil(tokens.access).pipe(
        map(profile => {
          if (profile.role !== 'admin') {
            throw new HttpErrorResponse({ status: 403, statusText: 'Acceso administrativo requerido' });
          }
          return tokens;
        })
      )),
      tap(tokens => {
        localStorage.setItem(this.accessTokenKey, tokens.access);
        localStorage.setItem(this.refreshTokenKey, tokens.refresh);
      }),
      catchError(error => {
        this.logout();
        return throwError(() => error);
      })
    );
  }

  verificarAdministrador(): Observable<boolean> {
    const token = this.getToken();
    if (!token || !this.estaAutenticado()) {
      this.logout();
      return of(false);
    }
    return this.obtenerPerfil(token).pipe(
      map(profile => profile.role === 'admin'),
      catchError(() => of(false)),
      tap(allowed => { if (!allowed) this.logout(); })
    );
  }

  private obtenerPerfil(token: string): Observable<UserProfile> {
    // SimpleJWT normally identifies the authenticated user through user_id.
    const userId = Number(this.leerToken(token)?.user_id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Token inválido' }));
    }
    return this.http.get<UserProfile>(`${API_BASE_URL}/accounts/users/${userId}/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private leerToken(token: string): TokenClaims | null {
    try {
      const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  getToken(): string | null { return localStorage.getItem(this.accessTokenKey); }
  getRefreshToken(): string | null { return localStorage.getItem(this.refreshTokenKey); }

  estaAutenticado(): boolean {
    const token = this.getToken();
    const exp = token ? this.leerToken(token)?.exp : undefined;
    return typeof exp === 'number' && exp * 1000 > Date.now();
  }
}
