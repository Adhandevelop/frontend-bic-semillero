import { catchError, switchMap, throwError } from 'rxjs';
import { ClientSessionService } from '../services/client-session.service';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if([API_BASE_URL+'/token/',API_BASE_URL+'/token/refresh/',API_BASE_URL+'/accounts/register/'].includes(request.url))return next(request);
  if(request.url.startsWith(API_BASE_URL+'/sales/tickets/verify/?')||request.url.startsWith(API_BASE_URL+'/public/')||/^\/api\/trips\/trips\/\d+\/seats\//.test(request.url))return next(request);
  const client=inject(ClientSessionService);
  const explicit=request.headers.get('Authorization');
  const clientToken=client.token();
  if(clientToken&&explicit==='Bearer '+clientToken&&request.url.startsWith(`${API_BASE_URL}/`)){
    return next(request).pipe(catchError(err=>{
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


