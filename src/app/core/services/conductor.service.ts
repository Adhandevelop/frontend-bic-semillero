import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Conductor } from '../models/conductor.model';

export interface DriverFilters {
  search?: string;
  is_active?: boolean;
  license_number?: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

@Injectable({
  providedIn: 'root'
})
export class ConductorService {
  private readonly apiUrl = `${API_BASE_URL}/fleet/drivers/`;

  constructor(private http: HttpClient) {}

  private buildPayload(conductor: Partial<Conductor>, photo?: File | null): Partial<Conductor> | FormData {
    if (!photo) return conductor;
    const formData = new FormData();
    for (const [key, value] of Object.entries(conductor)) {
      if (value === undefined || value === null || key === 'photo_url') continue;
      formData.append(key, String(value));
    }
    formData.append('photo', photo);
    return formData;
  }

  listarTodos(filters: DriverFilters = {}): Observable<Conductor[]> {
    const params: Record<string, string | number | boolean> = {
      ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
      ...(typeof filters.is_active === 'boolean' ? { is_active: filters.is_active } : {}),
      ...(filters.license_number?.trim() ? { license_number: filters.license_number.trim() } : {})
    };
    return this.http.get<Conductor[] | PaginatedResponse<Conductor>>(this.apiUrl, { params }).pipe(
      expand((response, index) =>
        !Array.isArray(response) && response.next
          ? this.http.get<Conductor[] | PaginatedResponse<Conductor>>(this.apiUrl, {
              params: { ...params, page: index + 2 }
            })
          : EMPTY
      ),
      map(response => (Array.isArray(response) ? response : response.results)),
      reduce((drivers, page) => drivers.concat(page), [] as Conductor[])
    );
  }

  listar(): Observable<Conductor[]> {
    return this.http
      .get<Conductor[] | PaginatedResponse<Conductor>>(this.apiUrl)
      .pipe(map(response => (Array.isArray(response) ? response : response.results)));
  }

  obtenerPorId(id: number): Observable<Conductor> {
    return this.http.get<Conductor>(`${this.apiUrl}${id}/`);
  }

  crear(conductor: Conductor, photo?: File | null): Observable<Conductor> {
    return this.http.post<Conductor>(this.apiUrl, this.buildPayload(conductor, photo));
  }

  actualizar(id: number, conductor: Conductor, photo?: File | null): Observable<Conductor> {
    const body = this.buildPayload(conductor, photo);
    return photo
      ? this.http.patch<Conductor>(`${this.apiUrl}${id}/`, body)
      : this.http.put<Conductor>(`${this.apiUrl}${id}/`, body);
  }

  actualizarParcial(id: number, conductor: Partial<Conductor>, photo?: File | null): Observable<Conductor> {
    return this.http.patch<Conductor>(`${this.apiUrl}${id}/`, this.buildPayload(conductor, photo));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  listarActivos(): Observable<Conductor[]> {
    return this.http.get<Conductor[]>(`${this.apiUrl}activos/`);
  }
}
