import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
import { UserRole } from './auth.service';
export type StaffRole=Extract<UserRole,'admin'|'seller'|'dispatcher'|'auditor'|'driver'>;
export interface StaffUser {id:number;username:string;identification_document_code?:string;identification_number:string;name?:string;first_name?:string;last_name?:string;email?:string;telephone?:string;role:StaffRole;is_active:boolean;password_change_required?:boolean;created_by_detail?:{id:number;name?:string;username?:string;email?:string};date_joined?:string;}
export interface StaffPayload {identification_document_code:string;identification_number:string;first_name:string;last_name:string;email:string;telephone:string;role:Exclude<StaffRole,'driver'>;username?:string;password?:string;}
export interface StaffFilters {role?:StaffRole;is_active?:boolean;search?:string;}
@Injectable({providedIn:'root'})
export class StaffService {
  private readonly url=API_BASE_URL+'/accounts/admins/';constructor(private http:HttpClient){}
  list(filters:StaffFilters={}){const p=new URLSearchParams();if(filters.role)p.set('role',filters.role);if(typeof filters.is_active==='boolean')p.set('is_active',String(filters.is_active));if(filters.search?.trim())p.set('search',filters.search.trim());return allApiPages<StaffUser>(this.http,this.url+(p.size?'?'+p.toString():''));}
  create(payload:StaffPayload){return this.http.post<StaffUser>(this.url,payload);}
  setActive(id:number,is_active:boolean){return this.http.patch<StaffUser>(this.url+id+'/',{is_active});}
}
