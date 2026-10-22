import type { Point } from 'geojson';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Ruta } from '../models/ruta.model';
import { allApiPages } from './api-pagination';
interface RouteDto {id:number;origin:number;destination:number;distance_km:string|number;}
interface PlaceDto {id:number;place_name:string;place_point?:Point;}
@Injectable({providedIn:'root'})
export class RutaService {
  private readonly apiUrl=API_BASE_URL+'/routes/routes/';
  private readonly placesUrl=API_BASE_URL+'/geography/places/';
  constructor(private http:HttpClient){}
  private toView(route:RouteDto,places:PlaceDto[]):Ruta {
    return {id:route.id,origen:places.find(p=>p.id===route.origin)?.place_name||'Ubicación #'+route.origin,destino:places.find(p=>p.id===route.destination)?.place_name||'Ubicación #'+route.destination,origen_id:route.origin,destino_id:route.destination,origen_punto:places.find(p=>p.id===route.origin)?.place_point,destino_punto:places.find(p=>p.id===route.destination)?.place_point,distancia_km:Number(route.distance_km),estado:'activa'};
  }
  // The backend has no route-state field; 'activa' is only a legacy UI default.
  listar():Observable<Ruta[]> {
    return forkJoin({routes:allApiPages<RouteDto>(this.http,this.apiUrl),places:allApiPages<PlaceDto>(this.http,this.placesUrl).pipe(catchError(()=>of([] as PlaceDto[])))}).pipe(map(data=>data.routes.map(route=>this.toView(route,data.places))));
  }
  obtenerPorId(id:number):Observable<Ruta> {
    return forkJoin({route:this.http.get<RouteDto>(this.apiUrl+id+'/'),places:allApiPages<PlaceDto>(this.http,this.placesUrl).pipe(catchError(()=>of([] as PlaceDto[])))}).pipe(map(data=>this.toView(data.route,data.places)));
  }
  private write(route:Partial<Ruta>,id?:number,partial=false):Observable<Ruta>{
    return allApiPages<PlaceDto>(this.http,this.placesUrl).pipe(switchMap(places=>{
      const resolve=(name:string|undefined,placeId:number|undefined):number|undefined=>{
        if(name===undefined)return placeId;
        const matches=places.filter(p=>p.place_name.trim().toLocaleLowerCase()===name.trim().toLocaleLowerCase()||'Ubicación #'+p.id===name);
        if(matches.length!==1)throw new Error('Selecciona una ubicación registrada y no ambigua.');
        return matches[0].id;
      };
      const origin=resolve(route.origen,route.origen_id),destination=resolve(route.destino,route.destino_id);
      const payload={...(origin!==undefined?{origin}:{}),...(destination!==undefined?{destination}:{}),...(route.distancia_km!==undefined?{distance_km:route.distancia_km}:{})};
      const request=id?(partial?this.http.patch<RouteDto>(this.apiUrl+id+'/',payload):this.http.put<RouteDto>(this.apiUrl+id+'/',payload)):this.http.post<RouteDto>(this.apiUrl,payload);
      return request.pipe(map(dto=>this.toView(dto,places)));
    }));
  }
  crear(route:Ruta):Observable<Ruta>{return this.write(route);}
  actualizar(id:number,route:Ruta):Observable<Ruta>{return this.write(route,id);}
  actualizarParcial(id:number,route:Partial<Ruta>):Observable<Ruta>{return this.write(route,id,true);}
  eliminar(id:number):Observable<void>{return this.http.delete<void>(this.apiUrl+id+'/');}
  listarActivas():Observable<Ruta[]>{return this.listar();}
}
