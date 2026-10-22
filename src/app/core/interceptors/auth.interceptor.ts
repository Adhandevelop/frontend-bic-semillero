import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { API_BASE_URL } from '../config/api.config';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if([API_BASE_URL+'/token/',API_BASE_URL+'/token/refresh/',API_BASE_URL+'/accounts/register/'].includes(request.url))return next(request);
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

