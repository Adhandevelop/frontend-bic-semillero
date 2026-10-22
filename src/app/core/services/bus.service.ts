import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Bus } from '../models/bus.model';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


@Injectable({
  providedIn: 'root'
})
export class BusService {
  private readonly apiUrl = `${API_BASE_URL}/fleet/buses/`;

  constructor(private http: HttpClient) {}

  listarTodos(): Observable<Bus[]> {
    return this.http.get<Bus[] | PaginatedResponse<Bus>>(this.apiUrl).pipe(
      expand((response, index) => !Array.isArray(response) && response.next
        ? this.http.get<Bus[] | PaginatedResponse<Bus>>(this.apiUrl, { params: { page: index + 2 } })
        : EMPTY),
      map(response => Array.isArray(response) ? response : response.results),
      reduce((buses, page) => buses.concat(page), [] as Bus[])
    );
  }

  listar(): Observable<Bus[]> {
    return this.http
      .get<Bus[] | PaginatedResponse<Bus>>(this.apiUrl)
      .pipe(
        map((response) =>
          Array.isArray(response) ? response : response.results
        ),
      );
  }

  obtenerPorId(id: number): Observable<Bus> {
    return this.http.get<Bus>(`${this.apiUrl}${id}/`);
  }

  crear(bus: Bus): Observable<Bus> {
    return this.http.post<Bus>(this.apiUrl, bus);
  }

  actualizar(id: number, bus: Bus): Observable<Bus> {
    return this.http.put<Bus>(`${this.apiUrl}${id}/`, bus);
  }

  actualizarParcial(id: number, bus: Partial<Bus>): Observable<Bus> {
    return this.http.patch<Bus>(`${this.apiUrl}${id}/`, bus);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  listarActivos(): Observable<Bus[]> {
    return this.http.get<Bus[]>(`${this.apiUrl}activos/`);
  }
}
