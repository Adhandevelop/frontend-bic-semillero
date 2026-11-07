import { seatPlanIssues } from '../../core/utils/seat-plan';
﻿import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, combineLatest, forkJoin, map, of, takeUntil, timeout } from 'rxjs';
import { BusService } from '../../core/services/bus.service';
import { ViajeService } from '../../core/services/viaje.service';
import { Bus } from '../../core/models/bus.model';
import { Viaje } from '../../core/models/viaje.model';
import { AdminAvailability, AdminCustomer, AdminSeat, AdminSeatReading, AdminSeatTicket, AdminSeatsService } from '../../core/services/admin-seats.service';
import { adminSeatError, buildAdminSeatRows, latestSeatReading } from './bus-seats.model';
interface Result<T>{value:T|null;error:string;}
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./bus-seats.component.html',styleUrl:'./bus-seats.component.css'})
export class BusSeatsComponent implements OnInit,OnDestroy {
  private route=inject(ActivatedRoute);private busApi=inject(BusService);private tripApi=inject(ViajeService);private api=inject(AdminSeatsService);
  private destroyed=new Subject<void>();private context=new Subject<void>();private selection=new Subject<void>();
  busId=0;clientId:number|null=null;requestedTrip:number|null=null;requestedSeat:number|null=null;bus:Bus|null=null;customer:AdminCustomer|null=null;customerError='';
  seats:AdminSeat[]=[];trips:Viaje[]=[];tripId:number|null=null;tickets:AdminSeatTicket[]=[];readings:AdminSeatReading[]=[];records:AdminSeatReading[]=[];availability:AdminAvailability|null=null;
  loading=false;telemetryLoading=false;busError='';seatsError='';tripsError='';sourceErrors:string[]=[];ticketsFailed=false;currentFailed=false;historyFailed=false;availabilityFailed=false;contextError='';selectedSeatId:number|null=null;
  private id(value:string|null):number|null{return value&&/^[1-9]\d*$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):null;}
  private safe<T>(request:Observable<T>):Observable<Result<T>>{return request.pipe(timeout(20000),map(value=>({value,error:''})),catchError(err=>of({value:null,error:adminSeatError(err)})));}
  get planIssues():string[]{return seatPlanIssues(this.seats,this.bus?.capacity);}
  ngOnInit():void{combineLatest([this.route.paramMap,this.route.queryParamMap]).pipe(takeUntil(this.destroyed)).subscribe(([params,query])=>{this.busId=this.id(params.get('id'))??0;this.clientId=this.id(query.get('cliente'));this.requestedTrip=this.id(query.get('trip'));this.requestedSeat=this.id(query.get('asiento'));this.load();});}
  load():void{
    this.context.next();this.selection.next();this.loading=false;this.bus=null;this.customer=null;this.seats=[];this.trips=[];this.tripId=null;this.selectedSeatId=null;this.clearTelemetry();this.contextError='';this.busError='';this.seatsError='';this.tripsError='';this.customerError='';
    if(!this.busId){this.busError='El identificador del bus no es válido.';return;}this.loading=true;
    const id=this.busId;
    forkJoin({bus:this.safe(this.busApi.obtenerPorId(id)),seats:this.safe(this.api.seats(id)),trips:this.safe(this.tripApi.listar()),customer:this.clientId?this.safe(this.api.customer(this.clientId)):of({value:null,error:''} as Result<AdminCustomer>)}).pipe(takeUntil(this.context),takeUntil(this.destroyed)).subscribe(data=>{
      this.loading=false;this.bus=data.bus.value;this.busError=data.bus.error;this.seats=data.seats.value??[];this.seatsError=data.seats.error;this.trips=(data.trips.value??[]).filter(trip=>trip.bus===id).sort((a,b)=>Date.parse(b.fecha_hora_inicio)-Date.parse(a.fecha_hora_inicio));this.tripsError=data.trips.error;this.customer=data.customer.value;this.customerError=data.customer.error;
      const requested=this.requestedTrip?this.trips.find(t=>t.id===this.requestedTrip):null;
      if(this.requestedTrip&&!requested){this.contextError='El viaje recibido no pertenece a este bus o no se pudo consultar. Selecciona un viaje válido.';}
      this.tripId=requested?.id??(!this.requestedTrip?this.trips.find(t=>t.estado==='en_curso')?.id:null)??null;
      this.selectedSeatId=this.requestedSeat?this.seats.find(seat=>seat.id===this.requestedSeat)?.id??null:this.seats[0]?.id??null;if(this.requestedSeat&&!this.selectedSeatId)this.contextError='El asiento recibido no pertenece a este bus o no se pudo consultar.';if(this.tripId)this.selectTrip(this.tripId);
    });
  }
  private clearTelemetry():void{this.tickets=[];this.readings=[];this.records=[];this.availability=null;this.sourceErrors=[];this.ticketsFailed=false;this.currentFailed=false;this.historyFailed=false;this.availabilityFailed=false;this.telemetryLoading=false;}
  selectTrip(value:number|null):void{
    this.selection.next();this.clearTelemetry();this.tripId=value;
    if(value===null)return;
    if(!this.trips.some(t=>t.id===value&&t.bus===this.busId)){this.contextError='Selecciona un viaje asociado a este bus.';this.tripId=null;return;}
    this.contextError=this.requestedSeat&&!this.seats.some(seat=>seat.id===this.requestedSeat)?'El asiento recibido no pertenece a este bus o no se pudo consultar.':'';this.telemetryLoading=true;
    forkJoin({tickets:this.safe(this.api.tickets(value)),current:this.safe(this.api.current(value)),history:this.safe(this.api.history(value)),availability:this.safe(this.api.availability(value))}).pipe(takeUntil(this.selection),takeUntil(this.context),takeUntil(this.destroyed)).subscribe(data=>{
      this.telemetryLoading=false;this.ticketsFailed=!!data.tickets.error;this.currentFailed=!!data.current.error;this.historyFailed=!!data.history.error;this.availabilityFailed=!!data.availability.error;
      this.tickets=(data.tickets.value??[]).filter(t=>t.trip===value&&this.seats.some(s=>s.id===t.seat));this.readings=data.current.value??[];this.records=data.history.value??[];this.availability=data.availability.value?.trip===value?data.availability.value:null;if(data.availability.value&&data.availability.value.trip!==value){this.availabilityFailed=true;this.sourceErrors.push('La disponibilidad recibida no corresponde al viaje seleccionado.');}
      for(const [label,result] of [['Boletas',data.tickets],['Estado de sensores',data.current],['Historial de sensores',data.history],['Disponibilidad',data.availability]] as const)if(result.error)this.sourceErrors.push(label+': '+result.error);
      const target=this.seats.find(seat=>this.isTarget(seat));if(target)this.selectedSeatId=target.id;
    });
  }
  get rows(){return buildAdminSeatRows(this.seats);}
  get selectedSeat(){return this.seats.find(s=>s.id===this.selectedSeatId)??null;}
  get selectedTrip(){return this.trips.find(t=>t.id===this.tripId)??null;}
  get clientSeats(){return this.seats.filter(seat=>this.isTarget(seat));}
  reading(seat:AdminSeat):AdminSeatReading|null{return this.tripId?latestSeatReading([...this.readings,...this.records],this.tripId,seat.id):null;}
  physical(seat:AdminSeat):string{const reading=this.reading(seat);return !reading?'unknown':reading.occupied?'occupied':'free';}
  physicalLabel(seat:AdminSeat):string{if(!this.tripId)return 'Sin viaje';if(this.telemetryLoading)return 'Consultando';if(this.currentFailed&&this.historyFailed)return 'Datos no disponibles';return ({unknown:'Sin lectura',occupied:'Ocupado',free:'Libre'} as Record<string,string>)[this.physical(seat)];}
  seatTickets(seat:AdminSeat):AdminSeatTicket[]{return this.tickets.filter(t=>t.seat===seat.id&&t.trip===this.tripId&&['issued','used'].includes(t.status)).sort((a,b)=>Number(b.status==='issued')-Number(a.status==='issued'));}
  isTarget(seat:AdminSeat):boolean{return !!this.customer?.identification_number&&this.seatTickets(seat).some(t=>t.passenger_identification?.trim().toLocaleUpperCase()===this.customer!.identification_number.trim().toLocaleUpperCase());}
  commercial(seat:AdminSeat):string{const status=this.availability?.seats.find(s=>s.id===seat.id)?.status;return status?({available:'Disponible',reserved:'Reservado',sold:'Vendido'}[status]):'Sin información';}
  passengerLabel(seat:AdminSeat):string{if(!this.tripId)return 'Selecciona un viaje';if(this.telemetryLoading)return 'Consultando pasajeros';if(this.ticketsFailed)return 'Boletas no disponibles';const tickets=this.seatTickets(seat);return tickets[0]?.passenger_name||(tickets.length?'Pasajero sin nombre':'Sin pasajero registrado');}
  selectSeat(id:number):void{if(!this.seats.some(seat=>seat.id===id))return;this.selectedSeatId=id;setTimeout(()=>{const detail=document.getElementById('seat-detail');detail?.scrollIntoView({behavior:'smooth',block:'start'});detail?.focus({preventScroll:true});});}
  get history(){return this.selectedSeat&&this.tripId?this.records.filter(r=>r.trip===this.tripId&&r.seat===this.selectedSeatId).sort((a,b)=>Date.parse(b.time_stamp)-Date.parse(a.time_stamp)):[];}
  tripState(state:Viaje['estado']):string{return ({programado:'Programado',en_curso:'En curso',finalizado:'Finalizado',cancelado:'Cancelado'})[state];}
  ngOnDestroy():void{this.context.next();this.context.complete();this.selection.next();this.selection.complete();this.destroyed.next();this.destroyed.complete();}
}
