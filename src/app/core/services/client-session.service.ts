import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, throwError, timeout } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
@Injectable({providedIn:'root'})
export class ClientSessionService {
  private readonly accessKey='bic_passenger_access';private readonly refreshKey='bic_passenger_refresh';
  private http:HttpClient;private renewal?:Observable<string>;
  constructor(backend:HttpBackend){this.http=new HttpClient(backend);}
  token():string|null{return sessionStorage.getItem(this.accessKey)||localStorage.getItem(this.accessKey);}
  requirePasswordChange():void{const storage=sessionStorage.getItem(this.accessKey)?sessionStorage:localStorage;if(this.token())storage.setItem('bic_passenger_password_change_required','true');}
  renew(failedToken:string):Observable<string>{
    const current=this.token();if(current&&current!==failedToken)return of(current);
    if(this.renewal)return this.renewal;
    const storage=sessionStorage.getItem(this.accessKey)?sessionStorage:localStorage;
    const refresh=storage.getItem(this.refreshKey);
    if(!refresh||!current)return throwError(()=>({status:401,error:{detail:'Tu sesión venció. Inicia sesión nuevamente.'}}));
    this.renewal=this.http.post<{access:string;refresh?:string}>(API_BASE_URL+'/token/refresh/',{refresh}).pipe(
      timeout(15000),map(tokens=>{
        if(storage.getItem(this.refreshKey)!==refresh||this.token()!==current)throw {status:401};
        if(typeof tokens.access!=='string'||!tokens.access)throw {status:502};
        storage.setItem(this.accessKey,tokens.access);if(tokens.refresh)storage.setItem(this.refreshKey,tokens.refresh);return tokens.access;
      }),
      catchError(err=>{if([400,401].includes(err.status)&&storage.getItem(this.refreshKey)===refresh){storage.removeItem(this.accessKey);storage.removeItem(this.refreshKey);}return throwError(()=>err);}),
      finalize(()=>{this.renewal=undefined;}),shareReplay({bufferSize:1,refCount:false})
    );return this.renewal;
  }
}
