import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Viaje } from '../models/viaje.model';
import { allApiPages } from './api-pagination';
export interface TripFare {id:number;trip:number;amount_cents:number;}
type TripState='scheduled'|'in_progress'|'completed'|'cancelled';
interface TripDto {id:number;bus:number;driver:number;route:number;date_time_start:string;date_time_end:string|null;trip_state:TripState;}
const TO_API:Record<Viaje['estado'],TripState>={programado:'scheduled',en_curso:'in_progress',finalizado:'completed',cancelado:'cancelled'};
const FROM_API:Record<TripState,Viaje['estado']>={scheduled:'programado',in_progress:'en_curso',completed:'finalizado',cancelled:'cancelado'};
@Injectable({providedIn:'root'})
export class ViajeService {
  private readonly apiUrl=API_BASE_URL+'/trips/trips/';
  constructor(private http:HttpClient){}
  private toView(trip:TripDto):Viaje{return {id:trip.id,bus:trip.bus,conductor:trip.driver,ruta:trip.route,fecha_hora_inicio:trip.date_time_start,fecha_hora_fin:trip.date_time_end,estado:FROM_API[trip.trip_state]};}
  private payload(trip:Partial<Viaje>):Partial<TripDto>{return {...(trip.bus!==undefined?{bus:trip.bus}:{}),...(trip.conductor!==undefined?{driver:trip.conductor}:{}),...(trip.ruta!==undefined?{route:trip.ruta}:{}),...(trip.fecha_hora_inicio!==undefined?{date_time_start:trip.fecha_hora_inicio}:{}),...(trip.fecha_hora_fin!==undefined?{date_time_end:trip.fecha_hora_fin}:{}),...(trip.estado!==undefined?{trip_state:TO_API[trip.estado]}:{})};}
  listarTarifas():Observable<TripFare[]>{return allApiPages<TripFare>(this.http,API_BASE_URL+'/trips/fares/');}
  crearTarifa(trip:number,amount_cents:number):Observable<TripFare>{return this.http.post<TripFare>(API_BASE_URL+'/trips/fares/',{trip,amount_cents});}
  actualizarTarifa(id:number,amount_cents:number):Observable<TripFare>{return this.http.patch<TripFare>(API_BASE_URL+'/trips/fares/'+id+'/',{amount_cents});}
  listar():Observable<Viaje[]>{return allApiPages<TripDto>(this.http,this.apiUrl).pipe(map(trips=>trips.map(trip=>this.toView(trip))));}
  obtenerPorId(id:number):Observable<Viaje>{return this.http.get<TripDto>(this.apiUrl+id+'/').pipe(map(trip=>this.toView(trip)));}
  crear(trip:Viaje):Observable<Viaje>{return this.http.post<TripDto>(this.apiUrl,this.payload(trip)).pipe(map(trip=>this.toView(trip)));}
  actualizar(id:number,trip:Viaje):Observable<Viaje>{return this.http.put<TripDto>(this.apiUrl+id+'/',this.payload(trip)).pipe(map(trip=>this.toView(trip)));}
  actualizarParcial(id:number,trip:Partial<Viaje>):Observable<Viaje>{return this.http.patch<TripDto>(this.apiUrl+id+'/',this.payload(trip)).pipe(map(trip=>this.toView(trip)));}
  eliminar(id:number):Observable<void>{return this.http.delete<void>(this.apiUrl+id+'/');}
  listarProgramados():Observable<Viaje[]>{return this.listar().pipe(map(trips=>trips.filter(trip=>trip.estado==='programado')));}
  listarEnCurso():Observable<Viaje[]>{return this.listar().pipe(map(trips=>trips.filter(trip=>trip.estado==='en_curso')));}
  listarFinalizados():Observable<Viaje[]>{return this.listar().pipe(map(trips=>trips.filter(trip=>trip.estado==='finalizado')));}
  iniciarViaje(id:number):Observable<Viaje>{return this.actualizarParcial(id,{estado:'en_curso'});}
  finalizarViaje(id:number):Observable<Viaje>{return this.actualizarParcial(id,{estado:'finalizado'});}
  cancelarViaje(id:number):Observable<Viaje>{return this.actualizarParcial(id,{estado:'cancelado'});}
}

