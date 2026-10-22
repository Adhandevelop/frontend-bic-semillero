import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
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
@Injectable({providedIn:'root'})
export class ClienteService {
  constructor(private http:HttpClient){}
  crear(payload:Omit<Cliente,'id'|'role'> & {password:string}):Observable<Cliente>{return this.http.post<Cliente>(API_BASE_URL+'/accounts/users/',payload);}
  buscarPorDocumento(documento:string):Observable<Cliente[]>{
    const value=documento.trim().toLocaleLowerCase();
    // Temporary exact match across all pages until the API supports this filter.
    return this.listar().pipe(map(clients=>clients.filter(c=>String(c.identification_number??'').trim().toLocaleLowerCase()===value)));
  }
  listar():Observable<Cliente[]>{
    return allApiPages<Cliente>(this.http,API_BASE_URL+'/accounts/users/').pipe(map(users=>users.filter(user=>user.role==='client')));
  }
}



