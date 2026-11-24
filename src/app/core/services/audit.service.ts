import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
export interface AuditLog {id:number;actor_name?:string;actor_role?:string;module:string;action:string;target_model?:string;target_id?:string;summary:string;previous_data?:Record<string,unknown>;new_data?:Record<string,unknown>;ip_address?:string|null;created_at:string;}
export interface AuditFilters {module?:string;action?:string;actor_role?:string;search?:string;}
@Injectable({providedIn:'root'})
export class AuditService {private readonly url=API_BASE_URL+'/support/audit-logs/';constructor(private http:HttpClient){}list(filters:AuditFilters={}){const p=new URLSearchParams();for(const [key,value] of Object.entries(filters))if(value?.trim())p.set(key,value.trim());return allApiPages<AuditLog>(this.http,this.url+(p.size?'?'+p.toString():''));}trail(tripId:number){return this.http.get<{trip_id:number;state_attribution_message?:string;audit_logs:AuditLog[]}>(API_BASE_URL+'/trips/trips/'+tripId+'/audit-trail/');}}
