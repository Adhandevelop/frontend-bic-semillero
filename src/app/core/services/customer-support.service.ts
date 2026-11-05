import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { PassengerService } from './passenger.service';
import { allApiPages } from './api-pagination';
import { API_BASE_URL } from '../config/api.config';
export interface CustomerServiceInfo {email:string|null;phone:string|null;whatsapp:string|null;business_hours:string|null;timezone:string|null;changes_policy_url:string|null;refunds_policy_url:string|null;privacy_policy_url:string|null;terms_url:string|null;}
export interface SupportRequest {id:number;reference:string;category:string;sale:number|null;subject:string;message:string;status:string;created_at:string;updated_at?:string;}
export interface SupportInput {category:string;sale?:number;subject:string;message:string;}
@Injectable({providedIn:'root'})
export class CustomerSupportService {
  constructor(private http:HttpClient,private session:PassengerService){}
  private options(){return {headers:new HttpHeaders({Authorization:'Bearer '+(this.session.token()??'')})};}
  contact(){return this.http.get<CustomerServiceInfo>(API_BASE_URL+'/public/customer-service/');}
  list(){const http={get:<T>(url:string,options?:{params?:Record<string,number>})=>this.http.get<T>(url,{...options,...this.options()})};return allApiPages<SupportRequest>(http as HttpClient,API_BASE_URL+'/support/requests/');}
  detail(id:number){return this.http.get<SupportRequest>(API_BASE_URL+'/support/requests/'+id+'/',this.options());}
  create(data:SupportInput){return this.http.post<SupportRequest>(API_BASE_URL+'/support/requests/',data,this.options());}
}
