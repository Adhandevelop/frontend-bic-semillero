import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
export interface BusType {id:number;name:string;code:string;max_capacity:number;}
export type BusTypeInput=Omit<BusType,'id'>;
@Injectable({providedIn:'root'})
export class BusTypeService {
  private url=API_BASE_URL+'/fleet/bus-types/';
  constructor(private http:HttpClient){}
  list(){return allApiPages<BusType>(this.http,this.url);}
  create(data:BusTypeInput){return this.http.post<BusType>(this.url,data);}
  update(id:number,data:BusTypeInput){return this.http.patch<BusType>(this.url+id+'/',data);}
  remove(id:number){return this.http.delete<void>(this.url+id+'/');}
}
