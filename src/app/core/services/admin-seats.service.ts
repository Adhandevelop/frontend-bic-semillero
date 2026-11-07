import type { TicketCheckIn } from './ticket-check-in.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, timeout } from 'rxjs';
import { ManifestSale, mergeTripManifest } from '../utils/trip-manifest';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
export interface AdminSeat {id:number;bus:number;seat_number:string;row:string;col:string;}
export interface AdminSeatReading {id:number;trip:number;seat:number;time_stamp:string;created_at?:string|null;occupied:boolean;}
export interface AdminSeatTicket {check_in?:TicketCheckIn|null;id:number;sale:number;trip:number;seat:number;seat_number?:string;status:string;ticket_code:string;passenger_name?:string;passenger_identification?:string;}
export interface AdminCustomer {id:number;name:string;identification_number:string;}
export interface AdminAvailability {trip:number;server_time:string;seats:Array<{id:number;seat_number?:string;row?:string;col?:string;status:'available'|'reserved'|'sold'}>;}
@Injectable({providedIn:'root'})
export class AdminSeatsService {
  constructor(private http:HttpClient){}
  seats(bus:number){return allApiPages<AdminSeat>(this.http,API_BASE_URL+'/fleet/seats/?bus='+bus).pipe(map(seats=>seats.filter(seat=>seat.bus===bus)));}
  current(trip:number){return allApiPages<AdminSeatReading>(this.http,API_BASE_URL+'/trips/current-seat-states/').pipe(map(rows=>rows.filter(row=>row.trip===trip)));}
  history(trip:number){return allApiPages<AdminSeatReading>(this.http,API_BASE_URL+'/trips/seat-state-history/').pipe(map(rows=>rows.filter(row=>row.trip===trip)));}
  tickets(trip:number){return allApiPages<AdminSeatTicket>(this.http,API_BASE_URL+'/sales/tickets/').pipe(map(rows=>rows.filter(row=>row.trip===trip)));}
  manifest(trip:number){
    const settle=<T>(request:Observable<T>,resource:string)=>request.pipe(timeout(15000),map(data=>({data,error:''})),catchError((err:{status?:number})=>of({data:null,error:'No se pudo consultar '+resource+(err.status?' (HTTP '+err.status+')':'')+'.'})));
    return forkJoin({direct:settle(allApiPages<AdminSeatTicket>(this.http,API_BASE_URL+'/sales/tickets/'),'el listado de tiquetes'),sales:settle(allApiPages<ManifestSale>(this.http,API_BASE_URL+'/sales/sales/'),'las boletas incluidas en ventas')}).pipe(map(result=>{
      const manifest=mergeTripManifest(trip,result.direct.data??[],result.sales.data??[]);
      return {...manifest,unavailable:result.direct.data===null&&result.sales.data===null,warnings:[...manifest.warnings,...[result.direct.error,result.sales.error].filter(Boolean)]};
    }));
  }
  availability(trip:number){return this.http.get<AdminAvailability>(API_BASE_URL+'/trips/trips/'+trip+'/seats/');}
  customer(id:number){return this.http.get<AdminCustomer>(API_BASE_URL+'/accounts/customers/'+id+'/');}
}
