import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
import { UserRole } from './auth.service';
export type StaffRole=Extract<UserRole,'admin'|'seller'|'dispatcher'|'auditor'|'driver'>;
export type CreatableStaffRole=Exclude<StaffRole,'driver'>;
export interface StaffRoleOption {value:StaffRole;label:string;description:string;creatable:boolean;}
export const STAFF_ROLE_OPTIONS:readonly StaffRoleOption[]=[
  {value:'admin',label:'Administrador',description:'Control total del sistema, flota, finanzas, personal y configuración.',creatable:true},
  {value:'seller',label:'Vendedor',description:'Venta de tiquetes en taquilla, registro de clientes, validación QR y soporte.',creatable:true},
  {value:'dispatcher',label:'Despachador',description:'Gestión operativa de buses, conductores, rutas, viajes, GPS y asientos.',creatable:true},
  {value:'auditor',label:'Auditor',description:'Consulta de ventas, reportes financieros y bitácora de auditoría.',creatable:true},
  {value:'driver',label:'Conductor',description:'Validación de abordaje QR y consulta de viajes asignados.',creatable:false}
];
export interface StaffUser {id:number;username:string;identification_document_code?:string;identification_number:string;name?:string;first_name?:string;last_name?:string;email?:string;telephone?:string;role:StaffRole;is_active:boolean;password_change_required?:boolean;created_by_detail?:{id:number;name?:string;username?:string;email?:string};date_joined?:string;}
export interface StaffPayload {identification_document_code:string;identification_number:string;first_name:string;last_name:string;email:string;telephone:string;role:StaffRole;username?:string;password?:string;}
export interface StaffUpdatePayload {role?:StaffRole;is_active?:boolean;first_name?:string;last_name?:string;email?:string;telephone?:string;identification_document_code?:string;identification_number?:string;}
export interface StaffFilters {role?:StaffRole;is_active?:boolean;search?:string;}
@Injectable({providedIn:'root'})
export class StaffService {
  private readonly url=API_BASE_URL+'/accounts/admins/';constructor(private http:HttpClient){}
  list(filters:StaffFilters={}){const p=new URLSearchParams();if(filters.role)p.set('role',filters.role);if(typeof filters.is_active==='boolean')p.set('is_active',String(filters.is_active));if(filters.search?.trim())p.set('search',filters.search.trim());return allApiPages<StaffUser>(this.http,this.url+(p.size?'?'+p.toString():''));}
  create(payload:StaffPayload){return this.http.post<StaffUser>(this.url,payload);}
  update(id:number,payload:StaffUpdatePayload){return this.http.patch<StaffUser>(this.url+id+'/',payload);}
  setRole(id:number,role:StaffRole){return this.update(id,{role});}
  setActive(id:number,is_active:boolean){return this.update(id,{is_active});}
}
