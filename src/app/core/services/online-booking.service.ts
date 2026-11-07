import { TripSalesMetadata } from '../utils/trip-sales';
﻿import { map } from 'rxjs';
import { PublicCatalogService } from './public-catalog.service';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
import { PassengerService, PassengerSale } from './passenger.service';
export interface OnlineTrip extends TripSalesMetadata {id:number;bus:number;route:number;date_time_start:string;trip_state:string;}
export interface OnlineBus {id:number;plate:string;model?:string;capacity:number;}
export interface OnlineSeat {id:number;bus:number;seat_number:string;row:string;col:string;status?:string;}
export interface OnlineFare {id:number;trip:number;amount_cents:number;}
export interface OnlineRoute {id:number;origin:number;destination:number;}
export interface OnlinePlace {id:number;place_name:string;}
export interface CheckoutData {sale_id:number;reference:string;public_key:string;currency:string;amount_in_cents:number;signature_integrity:string;expiration_time:string;signature_integrity_with_expiration:string;expires_at:string;server_time:string;quantity?:number;}
export interface PaymentStatus {sale_id:number;sale_status:string;transaction_status:string;tickets:PassengerSale['tickets'];}
export interface CheckoutPassenger {seat:number;name:string;identification_document_code:string;identification_number:string;email:string;telephone:string;}
@Injectable({providedIn:'root'})
export class OnlineBookingService {
  constructor(private http:HttpClient,private session:PassengerService,private publicApi:PublicCatalogService){}
  private options(){return {headers:new HttpHeaders({Authorization:'Bearer '+(this.session.token()??'')})};}
  private pages<T>(path:string){const http={get:<R>(url:string,options?:{params?:Record<string,number>})=>this.http.get<R>(url,{...options,...this.options()})};return allApiPages<T>(http as HttpClient,API_BASE_URL+path);}
  catalog(){return this.publicApi.catalog().pipe(map(data=>({
    trips:data.trips.filter(t=>t.currency==='COP').map(t=>({id:t.id,bus:0,route:typeof t.route==='number'?t.route:t.route.id,date_time_start:t.date_time_start,trip_state:t.trip_state??'',can_sell:t.can_sell,sales_close_at:t.sales_close_at,server_time:t.server_time,sales_block_reason:t.sales_block_reason,state_source:t.state_source,automatic_completion_at:t.automatic_completion_at})),
    buses:[] as OnlineBus[],seats:[] as OnlineSeat[],
    fares:data.trips.filter(t=>t.fare_amount_cents!==null).map(t=>({id:t.id,trip:t.id,amount_cents:t.fare_amount_cents!})),
    routes:data.routes.map(r=>({id:r.id,origin:r.origin.id,destination:r.destination.id})),
    places:data.routes.flatMap(r=>[{id:r.origin.id,place_name:r.origin.name},{id:r.destination.id,place_name:r.destination.name}])
  })));}
  availability(trip:number){return this.http.get<{trip:number;server_time:string;seats:OnlineSeat[]}>(API_BASE_URL+'/trips/trips/'+trip+'/seats/');}
  checkout(trip:number,passengers:CheckoutPassenger[],redirect_url:string,key:string){return this.http.post<CheckoutData>(API_BASE_URL+'/sales/wompi/checkout/',{trip,passengers,redirect_url},{headers:this.options().headers.set('Idempotency-Key',key)});}
  status(sale_id:number,transaction_id:string){return this.http.post<PaymentStatus>(API_BASE_URL+'/sales/wompi/status/',{sale_id,transaction_id},this.options());}
  sale(id:number){return this.http.get<PassengerSale>(API_BASE_URL+'/sales/sales/'+id+'/',this.options());}
}
