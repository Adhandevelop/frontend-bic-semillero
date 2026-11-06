import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, catchError, forkJoin, of, takeUntil, timeout } from 'rxjs';
import { Viaje } from '../../core/models/viaje.model';
import { Bus } from '../../core/models/bus.model';
import { Ruta } from '../../core/models/ruta.model';
import { ViajeService } from '../../core/services/viaje.service';
import { BusService } from '../../core/services/bus.service';
import { RutaService } from '../../core/services/ruta.service';
import { allApiPages } from '../../core/services/api-pagination';
import { ApiGpsReading, validatedReadings } from './api-gps.model';
import { ApiGpsMapComponent } from './api-gps-map.component';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink,ApiGpsMapComponent],templateUrl:'./monitoreo-api.component.html',styleUrl:'./monitoreo-api.component.css'})
export class MonitoreoApiComponent implements OnInit,OnDestroy {
  private http=inject(HttpClient);private api=inject(ViajeService);private busApi=inject(BusService);private routeApi=inject(RutaService);private route=inject(ActivatedRoute);private router=inject(Router);private destroyed=new Subject<void>();private selection=new Subject<void>();private catalog=new Subject<void>();
  trips:Viaje[]=[];buses:Bus[]=[];routes:Ruta[]=[];tripId:number|null=null;readings:ApiGpsReading[]=[];loading=false;readingLoading=false;error='';readingError='';warnings:string[]=[];discarded=0;updatedAt:Date|null=null;
  get trip():Viaje|undefined{return this.trips.find(trip=>trip.id===this.tripId);}
  get latest():ApiGpsReading|null{return this.readings.at(-1)??null;}
  routeLabel(trip:Viaje):string{const route=this.routes.find(route=>route.id===trip.ruta);return route?route.origen+' → '+route.destino:'Ruta #'+trip.ruta;}
  busLabel(trip:Viaje):string{return this.buses.find(bus=>bus.id===trip.bus)?.plate||'Bus #'+trip.bus;}
  ngOnInit():void{this.load();}
  load():void{this.catalog.next();this.selection.next();this.loading=true;this.readingLoading=false;this.updatedAt=null;this.discarded=0;this.error='';this.readings=[];this.readingError='';this.warnings=[];
    forkJoin({trips:this.api.listar().pipe(timeout(20000)),buses:this.busApi.listarTodos().pipe(timeout(20000),catchError(()=>{this.warnings.push('No se pudieron consultar las placas; se muestran IDs de bus.');return of([]);})),routes:this.routeApi.listar().pipe(timeout(20000),catchError(()=>{this.warnings.push('No se pudieron consultar los nombres de ruta; se muestran sus IDs.');return of([]);}))}).pipe(takeUntil(this.catalog),takeUntil(this.destroyed)).subscribe({next:data=>{this.trips=[...data.trips].sort((a,b)=>(b.id??0)-(a.id??0));this.buses=data.buses;this.routes=data.routes;this.loading=false;const raw=this.route.snapshot.queryParamMap.get('trip');if(raw&&(!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(Number(raw))||!this.trips.some(trip=>trip.id===Number(raw)))){this.tripId=null;this.error='El viaje de origen no existe o no se pudo consultar. Selecciona un viaje válido.';return;}this.tripId=raw?Number(raw):this.tripId;if(this.tripId&&!this.trip)this.tripId=null;if(this.tripId)this.loadReadings();},error:err=>{this.loading=false;this.readingLoading=false;this.trips=[];this.tripId=null;this.error=this.failure(err,'los viajes');}});
  }
  changeTrip():void{if(this.trip)this.error='';void this.router.navigate([],{relativeTo:this.route,queryParams:{trip:this.tripId},replaceUrl:true});this.loadReadings();}
  loadReadings():void{this.selection.next();this.readings=[];this.discarded=0;this.readingError='';this.updatedAt=null;if(!this.tripId||!this.trip){this.readingLoading=false;return;}const id=this.tripId;this.readingLoading=true;allApiPages<ApiGpsReading>(this.http,'/api/trips/readings/').pipe(timeout(20000),takeUntil(this.selection),takeUntil(this.destroyed)).subscribe({next:rows=>{this.readingLoading=false;const own=rows.filter(row=>row&&row.trip===id);this.readings=validatedReadings(own,id);this.discarded=own.length-this.readings.length;this.updatedAt=new Date();},error:err=>{this.readingLoading=false;this.readingError=this.failure(err,'las lecturas GPS');}});}
  private failure(err:{status?:number},resource:string):string{return err.status===401?'Tu sesión venció. Inicia sesión nuevamente.':err.status===403?'No tienes permiso para consultar '+resource+'.':'No se pudieron consultar '+resource+(err.status?' (HTTP '+err.status+').':'. Revisa la conexión e intenta nuevamente.');}
  ngOnDestroy():void{this.catalog.next();this.catalog.complete();this.selection.next();this.selection.complete();this.destroyed.next();this.destroyed.complete();}
}
