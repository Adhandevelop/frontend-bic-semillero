import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { ClientSessionService } from '../services/client-session.service';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if([API_BASE_URL+'/token/',API_BASE_URL+'/token/refresh/',API_BASE_URL+'/accounts/register/',API_BASE_URL+'/accounts/password/reset/',API_BASE_URL+'/accounts/password/reset/confirm/',API_BASE_URL+'/accounts/activation/request/',API_BASE_URL+'/accounts/activation/confirm/'].includes(request.url))return next(request);
  if([API_BASE_URL+'/sales/tickets/verify/',API_BASE_URL+'/accounts/cards/verify/'].some(url=>request.url===url||request.url.startsWith(url+'?'))||request.url.startsWith(API_BASE_URL+'/public/')||/^\/api\/trips\/trips\/\d+\/seats\//.test(request.url))return next(request);
  const client=inject(ClientSessionService);
  const explicit=request.headers.get('Authorization');
  const clientToken=client.token();
  if(clientToken&&explicit==='Bearer '+clientToken&&request.url.startsWith(`${API_BASE_URL}/`)){
    const router=inject(Router);
    return next(request).pipe(catchError(err=>{
      if(err.status===401&&err.error?.code==='password_change_required'){client.requirePasswordChange();void router.navigateByUrl('/clientes/cambiar-contrasena');return throwError(()=>err);}
      if(err.status!==401)return throwError(()=>err);
      return client.renew(clientToken).pipe(switchMap(access=>next(request.clone({setHeaders:{Authorization:'Bearer '+access}}))));
    }));
  }
  const token = inject(AuthService).getToken();

  if (!token || request.headers.has('Authorization') || !request.url.startsWith(`${API_BASE_URL}/`)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
