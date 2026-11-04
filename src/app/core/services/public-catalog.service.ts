import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
export interface PublicTerminal {id:number;name:string;city?:{id:number;name:string};}
export interface PublicRoute {id:number;origin:PublicTerminal;destination:PublicTerminal;distance_km?:string;}
export interface PublicTrip {id:number;route:PublicRoute|number;date_time_start:string;date_time_end?:string;fare_amount_cents:number|null;currency:string;}
@Injectable({providedIn:'root'})
export class PublicCatalogService {
  constructor(private http:HttpClient){}
  routes(){return allApiPages<PublicRoute>(this.http,API_BASE_URL+'/public/routes/');}
  trips(){return allApiPages<PublicTrip>(this.http,API_BASE_URL+'/public/trips/');}
  catalog(){return forkJoin({routes:this.routes(),trips:this.trips()});}
}
