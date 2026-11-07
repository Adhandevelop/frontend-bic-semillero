import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
import { SupportRequest } from './customer-support.service';
export interface AdminSupportRequest extends SupportRequest {customer:number;customer_name:string;customer_email:string;customer_telephone:string|null;sale_code?:string|null;}
export type SupportStatus='in_progress'|'resolved'|'closed';
export interface SupportFilters {status?:string;category?:string;search?:string;}
@Injectable({providedIn:'root'})
export class AdminSupportService {
  constructor(private http:HttpClient){}
  private url=API_BASE_URL+'/support/requests/';
  list(filters:SupportFilters={}){const query=new URLSearchParams();for(const[key,value]of Object.entries(filters))if(value?.trim())query.set(key,value.trim());return allApiPages<AdminSupportRequest>(this.http,this.url+(query.size?'?'+query.toString():''));}
  detail(id:number){return this.http.get<AdminSupportRequest>(this.url+id+'/');}
  updateStatus(id:number,status:SupportStatus){return this.http.patch<AdminSupportRequest>(this.url+id+'/',{status});}
}
