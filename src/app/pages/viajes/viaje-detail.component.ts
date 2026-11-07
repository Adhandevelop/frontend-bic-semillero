import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
﻿import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, combineLatest, finalize, forkJoin, map, of, startWith, switchMap, takeUntil, timeout } from 'rxjs';
import { Bus } from '../../core/models/bus.model';
import { Conductor } from '../../core/models/conductor.model';
import { Ruta } from '../../core/models/ruta.model';
import { Viaje } from '../../core/models/viaje.model';
import { BusService } from '../../core/services/bus.service';
import { ConductorService } from '../../core/services/conductor.service';
import { RutaService } from '../../core/services/ruta.service';
import { TripFare, ViajeService } from '../../core/services/viaje.service';
import { AdminSeat, AdminSeatTicket, AdminSeatsService } from '../../core/services/admin-seats.service';
interface PartialResult<T>{data:T|null;error:string;}
@Component({standalone:true,imports:[ListOrderComponent,CommonModule,RouterLink],templateUrl:'./viaje-detail.component.html',styleUrl:'./viaje-detail.component.css'})
export class ViajeDetailComponent implements OnInit,OnDestroy {
  listOrder:ListOrder='desc';
  get orderedRecords(){return orderRecords(this.tickets,this.listOrder);}
  private activatedRoute=inject(ActivatedRoute);private tripApi=inject(ViajeService);private busApi=inject(BusService);private driverApi=inject(ConductorService);private routeApi=inject(RutaService);private seatsApi=inject(AdminSeatsService);
  private destroyed=new Subject<void>();private refresh=new Subject<void>();
  trip:Viaje|null=null;bus:Bus|null=null;driver:Conductor|null=null;route:Ruta|null=null;fare:TripFare|null=null;seats:AdminSeat[]=[];tickets:AdminSeatTicket[]=[];
  tripId:number|null=null;loading=false;error='';warnings:string[]=[];ticketsFailed=false;fareFailed=false;updatedAt:Date|null=null;
  private failure(err:{status?:number},resource:string):string{return err.status===401?'La sesión administrativa venció.':err.status===403?'No tienes permiso para consultar '+resource+'.':err.status===404?'No se encontró '+resource+' (HTTP 404).':err.status===0?'No se pudo conectar al consultar '+resource+'.':'No se pudo consultar '+resource+(err.status?' (HTTP '+err.status+').':'.');}
  private partial<T>(request:Observable<T>,resource:string):Observable<PartialResult<T>>{return request.pipe(timeout(20000),map(data=>({data,error:''})),catchError(err=>of({data:null,error:this.failure(err,resource)})));}
  ngOnInit():void{
    combineLatest([this.activatedRoute.paramMap,this.refresh.pipe(startWith(null))]).pipe(switchMap(([params])=>{
      this.reset();const raw=params.get('id');if(!raw||!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)<=0){this.error='El identificador del viaje no es válido.';return of(null);}
      const id=Number(raw);this.tripId=id;this.loading=true;
      return this.tripApi.obtenerPorId(id).pipe(timeout(20000),switchMap(trip=>{
        if(trip.id!==id)throw new Error('El viaje recibido no coincide.');this.trip=trip;
        return forkJoin({bus:this.partial(this.busApi.obtenerPorId(trip.bus),'el bus'),driver:this.partial(this.driverApi.obtenerPorId(trip.conductor),'el conductor'),route:this.partial(this.routeApi.obtenerPorId(trip.ruta),'la ruta'),fares:trip.fare_amount_cents===undefined?this.partial(this.tripApi.listarTarifas(),'la tarifa'):of({data:[] as TripFare[],error:''}),seats:this.partial(this.seatsApi.seats(trip.bus),'los números de sillas'),tickets:this.partial(this.seatsApi.tickets(id),'los pasajeros y sus boletas')});
      }),catchError(err=>{this.error=this.failure(err,'el viaje');return of(null);}),finalize(()=>{this.loading=false;}));
    }),takeUntil(this.destroyed)).subscribe(data=>{
      if(!data)return;this.bus=data.bus.data;this.driver=data.driver.data;this.route=data.route.data;this.fare=data.fares.data?.find(value=>value.trip===this.tripId)??null;this.seats=(data.seats.data??[]).filter(value=>value.bus===this.trip?.bus);this.tickets=(data.tickets.data??[]).filter(value=>value.trip===this.tripId).sort((a,b)=>this.seatLabel(a).localeCompare(this.seatLabel(b),undefined,{numeric:true}));
      this.ticketsFailed=!!data.tickets.error;this.fareFailed=!!data.fares.error;this.warnings=Object.values(data).map(value=>value.error).filter(Boolean);this.updatedAt=new Date();
    });
  }
  private reset():void{this.trip=null;this.bus=null;this.driver=null;this.route=null;this.fare=null;this.seats=[];this.tickets=[];this.tripId=null;this.loading=false;this.error='';this.warnings=[];this.ticketsFailed=false;this.fareFailed=false;this.updatedAt=null;}
  reload():void{if(!this.loading)this.refresh.next();}
  get routeLabel():string{if(this.trip?.origin&&this.trip.destination)return this.trip.origin+' → '+this.trip.destination;return this.route?this.route.origen+' → '+this.route.destino:this.trip?'Ruta #'+this.trip.ruta:'Viaje';}
  get farePesos():number|null{const value=this.trip?.fare_amount_cents!==undefined?this.trip.fare_amount_cents:this.fare?.amount_cents;return typeof value==='number'&&Number.isSafeInteger(value)&&value>0?value/100:null;}
  get issuedCount():number{return this.tickets.filter(t=>t.status==='issued').length;}
  get usedCount():number{return this.tickets.filter(t=>t.status==='used').length;}
  get cancelledCount():number{return this.tickets.filter(t=>t.status==='cancelled').length;}
  seatLabel(ticket:AdminSeatTicket):string{return this.seats.find(seat=>seat.id===ticket.seat)?.seat_number||'Sin número (ID '+ticket.seat+')';}
  stateLabel(value:string):string{return ({programado:'Programado',en_curso:'En curso',finalizado:'Finalizado',cancelado:'Cancelado',issued:'Emitida',used:'Utilizada',cancelled:'Cancelada',Active:'Activo',Inactive:'Inactivo',Maintenance:'Mantenimiento',mantenimiento:'Mantenimiento'} as Record<string,string>)[value]??value;}
  phoneLink(value:string):string|null{const normalized=value.replace(/[ ()-]/g,'');return /^\+?\d{7,15}$/.test(normalized)?'tel:'+normalized:null;}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();this.refresh.complete();}
}

