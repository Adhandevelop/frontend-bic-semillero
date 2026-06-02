import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Ruta } from '../models/ruta.model';

@Injectable({
  providedIn: 'root'
})
export class RutaService {
  private readonly apiUrl = `${API_BASE_URL}/rutas/`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(this.apiUrl);
  }

  obtenerPorId(id: number): Observable<Ruta> {
    return this.http.get<Ruta>(`${this.apiUrl}${id}/`);
  }

  crear(ruta: Ruta): Observable<Ruta> {
    return this.http.post<Ruta>(this.apiUrl, ruta);
  }

  actualizar(id: number, ruta: Ruta): Observable<Ruta> {
    return this.http.put<Ruta>(`${this.apiUrl}${id}/`, ruta);
  }

  actualizarParcial(id: number, ruta: Partial<Ruta>): Observable<Ruta> {
    return this.http.patch<Ruta>(`${this.apiUrl}${id}/`, ruta);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  listarActivas(): Observable<Ruta[]> {
    return this.http.get<Ruta[]>(`${this.apiUrl}activas/`);
  }
}
