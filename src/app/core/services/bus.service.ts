import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Bus } from '../models/bus.model';

@Injectable({
  providedIn: 'root'
})
export class BusService {
  private readonly apiUrl = `${API_BASE_URL}/buses/`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Bus[]> {
    return this.http.get<Bus[]>(this.apiUrl);
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
