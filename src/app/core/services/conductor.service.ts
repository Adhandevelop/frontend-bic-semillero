import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Conductor } from '../models/conductor.model';

@Injectable({
  providedIn: 'root'
})
export class ConductorService {
  private readonly apiUrl = `${API_BASE_URL}/conductores/`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Conductor[]> {
    return this.http.get<Conductor[]>(this.apiUrl);
  }

  obtenerPorId(id: number): Observable<Conductor> {
    return this.http.get<Conductor>(`${this.apiUrl}${id}/`);
  }

  crear(conductor: Conductor): Observable<Conductor> {
    return this.http.post<Conductor>(this.apiUrl, conductor);
  }

  actualizar(id: number, conductor: Conductor): Observable<Conductor> {
    return this.http.put<Conductor>(`${this.apiUrl}${id}/`, conductor);
  }

  actualizarParcial(id: number, conductor: Partial<Conductor>): Observable<Conductor> {
    return this.http.patch<Conductor>(`${this.apiUrl}${id}/`, conductor);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  listarActivos(): Observable<Conductor[]> {
    return this.http.get<Conductor[]>(`${this.apiUrl}activos/`);
  }
}
