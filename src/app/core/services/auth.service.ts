import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError, timeout } from 'rxjs';
import { API_BASE_URL, AUTH_LOGIN_URL } from '../config/api.config';

export type AuthPhase = 'token' | 'profile';
export type AuthFailure = HttpErrorResponse & {authPhase?:AuthPhase};
interface LoginRequest { username: string; password: string; }
interface LoginResponse { access: string; refresh: string; }
interface UserProfile { id: number; username: string; role: 'client' | 'driver' | 'admin'; }
interface TokenClaims { user_id?: number | string; exp?: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly accessTokenKey = 'transporte_access_token';
  private readonly refreshTokenKey = 'transporte_refresh_token';
  private renewal?:Observable<string>;private sessionVersion=0;

  renew(expectedAccess:string|null=this.getToken()):Observable<string>{
    const access=this.getToken(),refresh=this.getRefreshToken(),version=this.sessionVersion;
    if(!access||!refresh){this.logout();return throwError(()=>new HttpErrorResponse({status:401,statusText:'Sesión administrativa vencida'}));}
    if(expectedAccess&&access!==expectedAccess)return of(access);
    if(this.renewal)return this.renewal;
    const renewal=this.http.post<{access:string;refresh?:string}>(API_BASE_URL+'/token/refresh/',{refresh}).pipe(timeout(15000),map(tokens=>{
      if(this.sessionVersion!==version||this.getToken()!==access||this.getRefreshToken()!==refresh)throw new HttpErrorResponse({status:401,statusText:'La sesión cambió durante la renovación'});
      if(typeof tokens.access!=='string'||!tokens.access.trim()||tokens.refresh!==undefined&&(typeof tokens.refresh!=='string'||!tokens.refresh.trim()))throw new HttpErrorResponse({status:502,statusText:'Respuesta de renovación incompleta'});
      localStorage.setItem(this.accessTokenKey,tokens.access);
      if(tokens.refresh)localStorage.setItem(this.refreshTokenKey,tokens.refresh);
      return tokens.access;
    }),catchError(err=>{if([400,401,403].includes(err.status)&&this.sessionVersion===version&&this.getToken()===access)this.logout();return throwError(()=>err);}),finalize(()=>{if(this.renewal===renewal)this.renewal=undefined;}),shareReplay({bufferSize:1,refCount:false}));
    this.renewal=renewal;return renewal;
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.logout();
    return this.http.post<LoginResponse>(AUTH_LOGIN_URL, credentials).pipe(
      catchError(error=>this.authFailure(error,'token')),
      switchMap(tokens => this.obtenerPerfil(tokens.access).pipe(
        map(profile => {
          if (profile.role !== 'admin') {
            throw new HttpErrorResponse({ status: 403, statusText: 'Acceso administrativo requerido' });
          }
          return tokens;
        }),
        catchError(error=>this.authFailure(error,'profile'))
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

  private authFailure(error:HttpErrorResponse,phase:AuthPhase):Observable<never>{
    console.error('[Acceso administrativo] Fallo de autenticación',{
      phase,endpoint:phase==='token'?'POST /api/token/':'GET /api/accounts/users/:id/',httpStatus:error.status??null,
    });
    return throwError(()=>Object.assign(error,{authPhase:phase}));
  }

  verificarAdministrador(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      this.logout();
      return of(false);
    }
    return (this.estaAutenticado()?of(token):this.renew(token)).pipe(switchMap(access=>this.obtenerPerfil(access)),
      map(profile => profile.role === 'admin'),
      tap(allowed => { if (!allowed) this.logout(); }),
      catchError(err => {if([400,401,403].includes(err.status))this.logout();return of(false);})
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
    this.sessionVersion++;this.renewal=undefined;
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  signOut():Observable<void>{
    const access=this.getToken(),refresh=this.getRefreshToken();this.logout();if(!access||!refresh)return of(undefined);
    return this.http.post<void>(API_BASE_URL+'/accounts/logout/',{refresh},{headers:{Authorization:'Bearer '+access}}).pipe(timeout(8000),catchError(()=>{console.warn('[Sesión administrativa] Sesión local eliminada; revocación remota sin confirmar.');return of(undefined);}));
  }
  getToken(): string | null { return localStorage.getItem(this.accessTokenKey); }
  getRefreshToken(): string | null { return localStorage.getItem(this.refreshTokenKey); }

  estaAutenticado(): boolean {
    const token = this.getToken();
    const exp = token ? this.leerToken(token)?.exp : undefined;
    return typeof exp === 'number' && exp * 1000 > Date.now();
  }
}
