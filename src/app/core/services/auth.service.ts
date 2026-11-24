import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL, AUTH_LOGIN_URL } from '../config/api.config';

export type UserRole='admin'|'seller'|'dispatcher'|'driver'|'auditor'|'client';
export const STAFF_ROLES:readonly UserRole[]=['admin','seller','dispatcher','driver','auditor'];
export interface UserProfile {id:number;username:string;role:UserRole;name?:string;first_name?:string;last_name?:string;email?:string;password_change_required?:boolean;}
export type AuthPhase='token'|'profile';
export type AuthFailure=HttpErrorResponse & {authPhase?:AuthPhase};
interface LoginRequest {username:string;password:string;}
interface LoginResponse {access:string;refresh:string;}
interface TokenClaims {user_id?:number|string;exp?:number;}

@Injectable({providedIn:'root'})
export class AuthService {
  private readonly http=inject(HttpClient);private readonly accessTokenKey='transporte_access_token';private readonly refreshTokenKey='transporte_refresh_token';
  private renewal?:Observable<string>;private sessionVersion=0;private profile:UserProfile|null=null;
  readonly staffRoles=STAFF_ROLES;
  renew(expectedAccess:string|null=this.getToken()):Observable<string>{
    const access=this.getToken(),refresh=this.getRefreshToken(),version=this.sessionVersion;
    if(!access||!refresh){this.logout();return throwError(()=>new HttpErrorResponse({status:401,statusText:'Sesión vencida'}));}
    if(expectedAccess&&access!==expectedAccess)return of(access);if(this.renewal)return this.renewal;
    const renewal=this.http.post<{access:string;refresh?:string}>(API_BASE_URL+'/token/refresh/',{refresh}).pipe(map(tokens=>{
      if(this.sessionVersion!==version||this.getToken()!==access||this.getRefreshToken()!==refresh||!tokens.access?.trim())throw new HttpErrorResponse({status:401,statusText:'La sesión cambió durante la renovación'});
      localStorage.setItem(this.accessTokenKey,tokens.access);if(tokens.refresh)localStorage.setItem(this.refreshTokenKey,tokens.refresh);return tokens.access;
    }),catchError(err=>{if([400,401,403].includes(err.status)&&this.sessionVersion===version)this.logout();return throwError(()=>err);}),finalize(()=>{if(this.renewal===renewal)this.renewal=undefined;}),shareReplay({bufferSize:1,refCount:false}));
    this.renewal=renewal;return renewal;
  }
  login(credentials:LoginRequest):Observable<LoginResponse>{
    this.logout();return this.http.post<LoginResponse>(AUTH_LOGIN_URL,credentials).pipe(catchError(error=>this.authFailure(error,'token')),switchMap(tokens=>this.loadProfile(tokens.access).pipe(map(profile=>{
      if(!STAFF_ROLES.includes(profile.role))throw new HttpErrorResponse({status:403,statusText:'Acceso de personal requerido'});this.profile=profile;return tokens;
    }),catchError(error=>this.authFailure(error,'profile')))),tap(tokens=>{localStorage.setItem(this.accessTokenKey,tokens.access);localStorage.setItem(this.refreshTokenKey,tokens.refresh);}),catchError(error=>{this.logout();return throwError(()=>error);}));
  }
  loadProfile(access=this.getToken()):Observable<UserProfile>{
    if(!access)return throwError(()=>new HttpErrorResponse({status:401,statusText:'Sin sesión'}));const headers={Authorization:'Bearer '+access};
    return this.http.get<UserProfile>(API_BASE_URL+'/accounts/me/',{headers}).pipe(catchError(error=>{
      if(error.status!==404)return throwError(()=>error);const id=Number(this.tokenClaims(access)?.user_id);
      return Number.isSafeInteger(id)&&id>0?this.http.get<UserProfile>(API_BASE_URL+'/accounts/users/'+id+'/',{headers}):throwError(()=>error);
    }),map(profile=>{if(!profile||!STAFF_ROLES.includes(profile.role))throw new HttpErrorResponse({status:403,statusText:'Rol no autorizado'});this.profile=profile;return profile;}));
  }
  verificarAcceso(roles:readonly UserRole[]=STAFF_ROLES):Observable<boolean>{const token=this.getToken();if(!token){this.logout();return of(false);}return (this.estaAutenticado()?of(token):this.renew(token)).pipe(switchMap(access=>this.loadProfile(access)),map(profile=>roles.includes(profile.role)),catchError(err=>{if([400,401,403].includes(err.status))this.logout();return of(false);}));}
  verificarAdministrador():Observable<boolean>{return this.verificarAcceso(['admin']);}
  currentProfile():UserProfile|null{return this.profile;}currentRole():UserRole|null{return this.profile?.role??null;}hasRole(...roles:UserRole[]):boolean{return !!this.profile&&roles.includes(this.profile.role);}
  private authFailure(error:HttpErrorResponse,phase:AuthPhase):Observable<never>{console.error('[Acceso de personal] Fallo de autenticación',{phase,endpoint:phase==='token'?'POST /api/token/':'GET /api/accounts/me/',httpStatus:error.status??null});return throwError(()=>Object.assign(error,{authPhase:phase}));}
  private tokenClaims(token:string):TokenClaims|null{try{const payload=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length/4)*4,'=')));}catch{return null;}}
  logout():void{this.sessionVersion++;this.renewal=undefined;this.profile=null;localStorage.removeItem(this.accessTokenKey);localStorage.removeItem(this.refreshTokenKey);}
  signOut():Observable<void>{const access=this.getToken(),refresh=this.getRefreshToken();this.logout();return !access||!refresh?of(undefined):this.http.post<void>(API_BASE_URL+'/accounts/logout/',{refresh},{headers:{Authorization:'Bearer '+access}}).pipe(catchError(()=>of(undefined)));}
  getToken():string|null{return localStorage.getItem(this.accessTokenKey);}getRefreshToken():string|null{return localStorage.getItem(this.refreshTokenKey);}estaAutenticado():boolean{const token=this.getToken(),exp=token?this.tokenClaims(token)?.exp:undefined;return typeof exp==='number'&&exp*1000>Date.now();}
}
