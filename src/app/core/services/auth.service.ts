import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AUTH_LOGIN_URL } from '../config/api.config';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  access?: string;
  refresh?: string;
  token?: string;
  key?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly accessTokenKey = 'transporte_access_token';
  private readonly refreshTokenKey = 'transporte_refresh_token';

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(AUTH_LOGIN_URL, credentials).pipe(
      tap((response) => {
        const accessToken = response.access || response.token || response.key;
        if (accessToken) {
          localStorage.setItem(this.accessTokenKey, accessToken);
        }
        if (response.refresh) {
          localStorage.setItem(this.refreshTokenKey, response.refresh);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  estaAutenticado(): boolean {
    return Boolean(this.getToken());
  }
}
