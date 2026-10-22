import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
export interface SaleTrip {id:number;bus:number;route:number;date_time_start:string;trip_state:string;}
export interface SaleSeat {id:number;bus:number;seat_number:string;row:string;col:string;}
export interface SaleFare {trip:number;amount_cents:number;}
export interface SaleTicket {id:number;trip:number;seat:number;status:string;ticket_code:string;}
export interface AdminSalePayload {trip:number;seat:number;identification_number:string;name:string;email:string;telephone:string;payment_method:'cash'|'card'|'transfer';}
export interface SaleResult {id:number;status:string;amount_cents:number;tickets:SaleTicket[];}
@Injectable({providedIn:'root'})
export class VentaService {
  constructor(private http:HttpClient){}
  catalogos(){return forkJoin({trips:allApiPages<SaleTrip>(this.http,API_BASE_URL+'/trips/trips/'),seats:allApiPages<SaleSeat>(this.http,API_BASE_URL+'/fleet/seats/'),fares:allApiPages<SaleFare>(this.http,API_BASE_URL+'/trips/fares/'),tickets:this.tiquetes()});}
  tiquetes():Observable<SaleTicket[]>{return allApiPages<SaleTicket>(this.http,API_BASE_URL+'/sales/tickets/');}
  crear(payload:AdminSalePayload):Observable<SaleResult>{return this.http.post<SaleResult>(API_BASE_URL+'/sales/admin-sales/',payload);}
}
