import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AUTH_LOGIN_URL } from '../config/api.config';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly accessTokenKey = 'transporte_access_token';
  private readonly refreshTokenKey = 'transporte_refresh_token';

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      AUTH_LOGIN_URL,
      credentials,
    ).pipe(
      tap((response) => {
        localStorage.setItem(this.accessTokenKey, response.access);
        localStorage.setItem(this.refreshTokenKey, response.refresh);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  estaAutenticado(): boolean {
    return !!this.getToken();
  }
}