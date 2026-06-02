import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Viaje } from '../models/viaje.model';

@Injectable({
  providedIn: 'root'
})
export class ViajeService {
  private readonly apiUrl = 'http://127.0.0.1:8000/api/viajes/';

  constructor(private http: HttpClient) {}

  listar(): Observable<Viaje[]> {
    return this.http.get<Viaje[]>(this.apiUrl);
  }

  obtenerPorId(id: number): Observable<Viaje> {
    return this.http.get<Viaje>(`${this.apiUrl}${id}/`);
  }

  crear(viaje: Viaje): Observable<Viaje> {
    return this.http.post<Viaje>(this.apiUrl, viaje);
  }

  actualizar(id: number, viaje: Viaje): Observable<Viaje> {
    return this.http.put<Viaje>(`${this.apiUrl}${id}/`, viaje);
  }

  actualizarParcial(id: number, viaje: Partial<Viaje>): Observable<Viaje> {
    return this.http.patch<Viaje>(`${this.apiUrl}${id}/`, viaje);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }

  listarProgramados(): Observable<Viaje[]> {
    return this.http.get<Viaje[]>(`${this.apiUrl}programados/`);
  }

  listarEnCurso(): Observable<Viaje[]> {
    return this.http.get<Viaje[]>(`${this.apiUrl}en-curso/`);
  }

  listarFinalizados(): Observable<Viaje[]> {
    return this.http.get<Viaje[]>(`${this.apiUrl}finalizados/`);
  }

  iniciarViaje(id: number): Observable<Viaje> {
    return this.http.patch<Viaje>(`${this.apiUrl}${id}/iniciar/`, {});
  }

  finalizarViaje(id: number): Observable<Viaje> {
    return this.http.patch<Viaje>(`${this.apiUrl}${id}/finalizar/`, {});
  }

  cancelarViaje(id: number): Observable<Viaje> {
    return this.http.patch<Viaje>(`${this.apiUrl}${id}/cancelar/`, {});
  }
}
