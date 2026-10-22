import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
export interface Cliente {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  telephone: string | null;
  identification_number: string;
  role: string;
  identification_document_code?:string;
}
export interface CustomerInput {identification_document_code:string;identification_number:string;name:string;email:string;telephone:string;}
export interface CustomerDto extends CustomerInput {id:number;}
@Injectable({providedIn:'root'})
export class ClienteService {
  constructor(private http:HttpClient){}
  crear(payload:Omit<Cliente,'id'|'role'> & {password:string}):Observable<Cliente>{return this.http.post<Cliente>(API_BASE_URL+'/accounts/users/',payload);}
  private customerView(c:CustomerDto):Cliente{return {id:c.id,username:'',first_name:c.name,last_name:'',email:c.email,telephone:c.telephone,identification_number:c.identification_number,identification_document_code:c.identification_document_code,role:'client'};}
  crearCliente(payload:CustomerInput):Observable<Cliente>{return this.http.post<CustomerDto>(API_BASE_URL+'/accounts/customers/',payload).pipe(map(c=>this.customerView(c)));}
  buscarPorDocumento(documento:string):Observable<Cliente[]>{
    return this.http.get<CustomerDto>(API_BASE_URL+'/accounts/customers/search/',{params:{identification_number:documento.trim()}}).pipe(
      map(c=>[this.customerView(c)]),
      catchError(err=>err.status===404&&err.error?.detail==='Cliente no encontrado.'?of([]):throwError(()=>err))
    );
  }
  listar():Observable<Cliente[]>{
    return allApiPages<Cliente>(this.http,API_BASE_URL+'/accounts/users/').pipe(map(users=>users.filter(user=>user.role==='client')));
  }
}




