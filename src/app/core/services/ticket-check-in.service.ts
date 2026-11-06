import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
export interface TicketCheckIn {id:number;checked_in_at:string;checked_in_by:{id:number;name:string};}
export interface CheckInResult {ticket_id:number;ticket_code:string;status:string;trip:number;seat:{id:number;seat_number:string};check_in:TicketCheckIn;replayed?:boolean;}
@Injectable({providedIn:'root'})
export class TicketCheckInService {
  constructor(private http:HttpClient){}
  confirm(payload:{verification_token:string;trip:number},key:string){return this.http.post<CheckInResult>(API_BASE_URL+'/sales/tickets/check-in/',payload,{headers:{'Idempotency-Key':key}});}
}
