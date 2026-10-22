import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
import { PassengerService, PassengerSale } from './passenger.service';
export interface OnlineTrip {id:number;bus:number;route:number;date_time_start:string;trip_state:string;}
export interface OnlineBus {id:number;plate:string;model?:string;capacity:number;}
export interface OnlineSeat {id:number;bus:number;seat_number:string;row:string;col:string;}
export interface OnlineFare {id:number;trip:number;amount_cents:number;}
export interface OnlineRoute {id:number;origin:number;destination:number;}
export interface OnlinePlace {id:number;place_name:string;}
export interface CheckoutData {sale_id:number;reference:string;public_key:string;currency:string;amount_in_cents:number;signature_integrity:string;expires_at?:string;}
export interface PaymentStatus {sale_id:number;sale_status:string;transaction_status:string;tickets:PassengerSale['tickets'];}
@Injectable({providedIn:'root'})
export class OnlineBookingService {
  constructor(private http:HttpClient,private session:PassengerService){}
  private options(){return {headers:new HttpHeaders({Authorization:'Bearer '+(this.session.token()??'')})};}
  private pages<T>(path:string){const http={get:<R>(url:string,options?:{params?:Record<string,number>})=>this.http.get<R>(url,{...options,...this.options()})};return allApiPages<T>(http as HttpClient,API_BASE_URL+path);}
  catalog(){return forkJoin({buses:this.pages<OnlineBus>('/fleet/buses/'),trips:this.pages<OnlineTrip>('/trips/trips/'),seats:this.pages<OnlineSeat>('/fleet/seats/'),fares:this.pages<OnlineFare>('/trips/fares/'),routes:this.pages<OnlineRoute>('/routes/routes/'),places:this.pages<OnlinePlace>('/geography/places/')});}
  checkout(trip:number,seat:number,redirect_url:string){return this.http.post<CheckoutData>(API_BASE_URL+'/sales/wompi/checkout/',{trip,seat,redirect_url},this.options());}
  status(sale_id:number,transaction_id:string){return this.http.post<PaymentStatus>(API_BASE_URL+'/sales/wompi/status/',{sale_id,transaction_id},this.options());}
  sale(id:number){return this.http.get<PassengerSale>(API_BASE_URL+'/sales/sales/'+id+'/',this.options());}
}

