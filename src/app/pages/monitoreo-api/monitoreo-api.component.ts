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
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink,ApiGpsMapComponent],templateUrl:'./monitoreo-api.component.html',styleUrls:['./monitoreo-api.component.css','./tracking-workspace.css','./tracking-itinerary.css']})
export class MonitoreoApiComponent implements OnInit,OnDestroy {
  private http=inject(HttpClient);private api=inject(ViajeService);private busApi=inject(BusService);private routeApi=inject(RutaService);private route=inject(ActivatedRoute);private router=inject(Router);private destroyed=new Subject<void>();private selection=new Subject<void>();private catalog=new Subject<void>();
  trips:Viaje[]=[];buses:Bus[]=[];routes:Ruta[]=[];tripId:number|null=null;readings:ApiGpsReading[]=[];loading=false;readingLoading=false;error='';readingError='';warnings:string[]=[];discarded=0;updatedAt:Date|null=null;
  get trip():Viaje|undefined{return this.trips.find(trip=>trip.id===this.tripId);}
  get latest():ApiGpsReading|null{return this.readings.at(-1)??null;}
  selectedIndex=0;itineraryPage=1;showTrace=true;
  get selectedReading():ApiGpsReading|null{return this.readings[this.selectedIndex]??this.latest;}
  get itineraryPages():number{return Math.max(1,Math.ceil(this.readings.length/7));}
  get itinerary(){return this.readings.slice((this.itineraryPage-1)*7,this.itineraryPage*7).map((reading,index)=>({reading,index:(this.itineraryPage-1)*7+index}));}
  get selectedBus():Bus|undefined{return this.buses.find(bus=>bus.id===this.trip?.bus);}
  get selectedRoute():Ruta|undefined{return this.routes.find(route=>route.id===this.trip?.ruta);}
  get originLabel():string{return this.trip?.origin||this.selectedRoute?.origen||'Origen no informado';}
  get destinationLabel():string{return this.trip?.destination||this.selectedRoute?.destino||'Destino no informado';}
  get speed():number|null{const value=this.selectedReading?.speed;if(value===null||value===undefined||value==='')return null;const speed=Number(value);return Number.isFinite(speed)&&speed>=0?speed:null;}
  receivedAt(reading:ApiGpsReading|null):string|null{const value=reading?.created_at;return typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;}
  get coordinates():string{const point=this.selectedReading?.reading_point.coordinates;return point?point[1].toFixed(5)+', '+point[0].toFixed(5):'Sin ubicación registrada';}
  get progress():number{return this.readings.length>1?this.selectedIndex/(this.readings.length-1)*100:0;}
  get distance():number{let total=0;const rad=(n:number)=>n*Math.PI/180;for(let i=1;i<=this.selectedIndex&&i<this.readings.length;i++){const [a,b]=this.readings[i-1].reading_point.coordinates,[c,d]=this.readings[i].reading_point.coordinates;const h=Math.sin(rad(d-b)/2)**2+Math.cos(rad(b))*Math.cos(rad(d))*Math.sin(rad(c-a)/2)**2;total+=6371*2*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}return total;}
  selectReading(index:number):void{if(!Number.isInteger(index)||index<0||index>=this.readings.length)return;this.selectedIndex=index;this.itineraryPage=Math.floor(index/7)+1;}
  tripState(value:string):string{return ({programado:'Programado',en_curso:'En curso',finalizado:'Finalizado',cancelado:'Cancelado'} as Record<string,string>)[value]??'Estado no informado';}
  routeLabel(trip:Viaje):string{if(trip.origin&&trip.destination)return trip.origin+' → '+trip.destination;const route=this.routes.find(route=>route.id===trip.ruta);return route?route.origen+' → '+route.destino:'Ruta #'+trip.ruta;}
  busLabel(trip:Viaje):string{return trip.bus_plate||this.buses.find(bus=>bus.id===trip.bus)?.plate||'Bus #'+trip.bus;}
  ngOnInit():void{this.load();}
  load():void{this.catalog.next();this.selection.next();this.loading=true;this.readingLoading=false;this.updatedAt=null;this.discarded=0;this.error='';this.readings=[];this.readingError='';this.warnings=[];
    forkJoin({trips:this.api.listar().pipe(timeout(20000)),buses:this.busApi.listarTodos().pipe(timeout(20000),catchError(()=>{this.warnings.push('No se pudieron consultar las placas; se muestran IDs de bus.');return of([]);})),routes:this.routeApi.listar().pipe(timeout(20000),catchError(()=>{this.warnings.push('No se pudieron consultar los nombres de ruta; se muestran sus IDs.');return of([]);}))}).pipe(takeUntil(this.catalog),takeUntil(this.destroyed)).subscribe({next:data=>{this.trips=[...data.trips].sort((a,b)=>(b.id??0)-(a.id??0));this.buses=data.buses;this.routes=data.routes;this.loading=false;const raw=this.route.snapshot.queryParamMap.get('trip');if(raw&&(!/^[1-9]\d*$/.test(raw)||!Number.isSafeInteger(Number(raw))||!this.trips.some(trip=>trip.id===Number(raw)))){this.tripId=null;this.error='El viaje de origen no existe o no se pudo consultar. Selecciona un viaje válido.';return;}this.tripId=raw?Number(raw):this.tripId;if(this.tripId&&!this.trip)this.tripId=null;if(this.tripId)this.loadReadings();},error:err=>{this.loading=false;this.readingLoading=false;this.trips=[];this.tripId=null;this.error=this.failure(err,'los viajes');}});
  }
  changeTrip():void{if(this.trip)this.error='';void this.router.navigate([],{relativeTo:this.route,queryParams:{trip:this.tripId},replaceUrl:true});this.loadReadings();}
  loadReadings():void{this.selection.next();this.readings=[];this.selectedIndex=0;this.itineraryPage=1;this.discarded=0;this.readingError='';this.updatedAt=null;if(!this.tripId||!this.trip){this.readingLoading=false;return;}const id=this.tripId;this.readingLoading=true;allApiPages<ApiGpsReading>(this.http,'/api/trips/readings/').pipe(timeout(20000),takeUntil(this.selection),takeUntil(this.destroyed)).subscribe({next:rows=>{this.readingLoading=false;const own=rows.filter(row=>row&&row.trip===id);this.readings=validatedReadings(own,id);this.selectedIndex=Math.max(0,this.readings.length-1);this.itineraryPage=Math.floor(this.selectedIndex/7)+1;this.discarded=own.length-this.readings.length;this.updatedAt=new Date();},error:err=>{this.readingLoading=false;this.readingError=this.failure(err,'las lecturas GPS');}});}
  private failure(err:{status?:number},resource:string):string{return err.status===401?'Tu sesión venció. Inicia sesión nuevamente.':err.status===403?'No tienes permiso para consultar '+resource+'.':'No se pudieron consultar '+resource+(err.status?' (HTTP '+err.status+').':'. Revisa la conexión e intenta nuevamente.');}
  ngOnDestroy():void{this.catalog.next();this.catalog.complete();this.selection.next();this.selection.complete();this.destroyed.next();this.destroyed.complete();}
}
