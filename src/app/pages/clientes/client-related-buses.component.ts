import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, Subscription, timeout } from 'rxjs';
import { Bus } from '../../core/models/bus.model';
import { Viaje } from '../../core/models/viaje.model';
import { BusService } from '../../core/services/bus.service';
import { SaleResult, SaleTicket, VentaService } from '../../core/services/venta.service';
import { ViajeService } from '../../core/services/viaje.service';

export interface NamedClientTicket extends SaleTicket {sale?:number;passenger_identification?:string;passenger_name?:string;}
export interface ClientBusVisit {tripId:number;trip?:Viaje;busId?:number;bus?:Bus;sales:SaleResult[];tickets:NamedClientTicket[];seatId?:number;}
function sameDocument(left:string|undefined,right:string):boolean{return !!right.trim()&&typeof left==='string'&&left.trim().toLocaleUpperCase()===right.trim().toLocaleUpperCase();}
export function relatedClientTrips(clientId:number,sales:SaleResult[],trips:Viaje[],buses:Bus[],clientDocument='',tickets:NamedClientTicket[]=[]):ClientBusVisit[]{
  const groups=new Map<number,{sales:SaleResult[];tickets:NamedClientTicket[]}>();
  const group=(id:number)=>{if(!groups.has(id))groups.set(id,{sales:[],tickets:[]});return groups.get(id)!;};
  const valid=(id:number|undefined):id is number=>typeof id==='number'&&Number.isSafeInteger(id)&&id>0;
  for(const sale of sales.filter(value=>value.buyer===clientId)){
    const ids=new Set([sale.trip,...(sale.tickets??[]).map(ticket=>ticket.trip)].filter(valid));
    for(const id of ids)group(id).sales.push(sale);
  }
  for(const ticket of tickets.filter(value=>sameDocument(value.passenger_identification,clientDocument))){if(valid(ticket.trip))group(ticket.trip).tickets.push(ticket);}
  return [...groups].map(([tripId,entries])=>{
    const trip=trips.find(value=>value.id===tripId);
    const busId=trip&&valid(trip.bus)?trip.bus:undefined;
    const seatIds=[...new Set(entries.tickets.map(ticket=>ticket.seat).filter(valid))];
    return {tripId,trip,busId,bus:busId?buses.find(value=>value.id===busId):undefined,...entries,seatId:seatIds.length===1?seatIds[0]:undefined};
  }).sort((a,b)=>{
    // Trips with tickets naming this client come before purchases for others.
    const nominal=Number(b.tickets.length>0)-Number(a.tickets.length>0);if(nominal)return nominal;
    const left=Date.parse(a.trip?.fecha_hora_inicio??''),right=Date.parse(b.trip?.fecha_hora_inicio??'');
    return (Number.isFinite(right)?right:0)-(Number.isFinite(left)?left:0)||b.tripId-a.tripId;
  });
}

@Component({selector:'app-client-related-buses',standalone:true,imports:[CommonModule,RouterLink],templateUrl:'./client-related-buses.component.html',styleUrl:'./client-related-buses.component.css'})
export class ClientRelatedBusesComponent implements OnChanges,OnDestroy {
  @Input() clientId=0;@Input() clientDocument='';
  loading=false;errors:string[]=[];salesFailed=false;ticketsFailed=false;sales:SaleResult[]=[];tickets:NamedClientTicket[]=[];trips:Viaje[]=[];buses:Bus[]=[];
  private request?:Subscription;
  constructor(private salesApi:VentaService,private tripsApi:ViajeService,private busesApi:BusService){}
  get clientSales(){return this.sales.filter(sale=>sale.buyer===this.clientId);}
  get namedTickets(){return this.tickets.filter(ticket=>sameDocument(ticket.passenger_identification,this.clientDocument));}
  get visits(){return relatedClientTrips(this.clientId,this.sales,this.trips,this.buses,this.clientDocument,this.tickets);}
  ngOnChanges():void{this.load();}
  load():void{
    this.request?.unsubscribe();this.errors=[];this.sales=[];this.tickets=[];this.trips=[];this.buses=[];this.salesFailed=false;this.ticketsFailed=false;
    if(!Number.isSafeInteger(this.clientId)||this.clientId<=0){this.loading=false;this.errors=['No se pudo identificar al cliente.'];return;}
    this.loading=true;
    const fail=(label:string,error:{status?:number})=>label+(error.status?' (HTTP '+error.status+')':'')+'.';
    this.request=forkJoin({
      sales:this.salesApi.listar().pipe(timeout(20000),catchError(error=>{this.salesFailed=true;this.errors.push(fail('No se pudieron consultar las compras del cliente',error));return of([] as SaleResult[]);})),
      tickets:this.salesApi.tiquetes().pipe(timeout(20000),map(values=>values as NamedClientTicket[]),catchError(error=>{this.ticketsFailed=true;this.errors.push(fail('No se pudieron consultar los tiquetes a nombre del cliente',error));return of([] as NamedClientTicket[]);})),
      trips:this.tripsApi.listar().pipe(timeout(20000),catchError(error=>{this.errors.push(fail('No se pudieron consultar los viajes relacionados',error));return of([] as Viaje[]);})),
      buses:this.busesApi.listarTodos().pipe(timeout(20000),catchError(error=>{this.errors.push(fail('No se pudieron consultar las placas y datos de buses',error));return of([] as Bus[]);}))
    }).subscribe({next:result=>{this.sales=result.sales;this.tickets=result.tickets;this.trips=result.trips;this.buses=result.buses;this.loading=false;}});
  }
  saleState(state:string):string{return ({paid:'Pagada',pending:'Pendiente',failed:'Fallida',cancelled:'Cancelada',expired:'Expirada'} as Record<string,string>)[state]??state;}
  ticketState(state:string):string{return ({issued:'Emitido',used:'Utilizado',cancelled:'Cancelado'} as Record<string,string>)[state]??state;}
  tripState(state:Viaje['estado']):string{return ({programado:'Programado',en_curso:'En curso',finalizado:'Finalizado',cancelado:'Cancelado'} as Record<Viaje['estado'],string>)[state];}
  ngOnDestroy():void{this.request?.unsubscribe();}
}
