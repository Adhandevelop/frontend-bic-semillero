import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject } from '@angular/core';
import { Observable, Subject, catchError, forkJoin, map, of, takeUntil, timeout } from 'rxjs';
import { Bus } from '../../core/models/bus.model';
import { Viaje } from '../../core/models/viaje.model';
import { AdminSeat, AdminSeatReading, AdminSeatTicket, AdminSeatsService } from '../../core/services/admin-seats.service';
import { buildSeatRows, seatPlanIssues } from '../../core/utils/seat-plan';
import { SensorSnapshot, sensorSnapshots } from './trip-occupancy.model';
interface Source<T>{data:T|null;error:string;}
@Component({selector:'app-trip-occupancy',standalone:true,imports:[CommonModule],templateUrl:'./trip-occupancy.component.html',styleUrl:'./trip-occupancy.component.css'})
export class TripOccupancyComponent implements OnChanges,OnDestroy {
  @Input({required:true}) trip!:Viaje;@Input() bus?:Bus;@Input() at:string|null=null;@Input() refreshVersion=0;@Input() playing=false;@Input() canReplay=false;
  @Output() playbackToggle=new EventEmitter<void>();
  private api=inject(AdminSeatsService);private cancel=new Subject<void>();private destroyed=new Subject<void>();private context='';private version=-1;
  seats:AdminSeat[]=[];records:AdminSeatReading[]=[];tickets:AdminSeatTicket[]=[];snapshots:SensorSnapshot[]=[];loading=false;seatsError='';errors:string[]=[];ticketsFailed=false;selectedSeatId:number|null=null;queryTime='';cutoff='';historyPage=1;
  get planIssues(){return seatPlanIssues(this.seats,this.bus?.id===this.trip?.bus?this.bus?.capacity:undefined);}
  get rows(){return this.planIssues.length?[]:buildSeatRows(this.seats);}
  get occupied(){return this.snapshots.filter(seat=>seat.state==='occupied').length;}
  get free(){return this.snapshots.filter(seat=>seat.state==='free').length;}
  get unknown(){return this.snapshots.filter(seat=>seat.state==='unknown').length;}
  get selected(){return this.snapshots.find(value=>value.seat.id===this.selectedSeatId)??null;}
  get history(){return this.records.filter(value=>value.trip===this.trip.id&&value.seat===this.selectedSeatId&&Date.parse(value.time_stamp)<=Date.parse(this.cutoff)).sort((a,b)=>Date.parse(b.time_stamp)-Date.parse(a.time_stamp));}
  get historyPages(){return Math.max(1,Math.ceil(this.history.length/7));}
  get visibleHistory(){return this.history.slice((this.historyPage-1)*7,this.historyPage*7);}
  get passengers(){return this.tickets.filter(ticket=>ticket.trip===this.trip.id&&ticket.seat===this.selectedSeatId&&['issued','used'].includes(ticket.status));}
  ngOnChanges():void{const key=this.trip?.id+':'+this.trip?.bus;if(key!==this.context||this.refreshVersion!==this.version){this.context=key;this.version=this.refreshVersion;this.load();}else this.rebuild();}
  private source<T>(request:Observable<T>,label:string):Observable<Source<T>>{return request.pipe(timeout(20000),map(data=>({data,error:''})),catchError((err:{status?:number})=>of({data:null,error:label+': no se pudo consultar'+(err.status?' (HTTP '+err.status+')':'')+'.'})));}
  load():void{
    this.cancel.next();this.seats=[];this.records=[];this.tickets=[];this.snapshots=[];this.errors=[];this.seatsError='';this.ticketsFailed=false;this.selectedSeatId=null;this.historyPage=1;
    const trip=this.trip?.id,bus=this.trip?.bus;if(!Number.isSafeInteger(trip)||!trip||trip<=0||!Number.isSafeInteger(bus)||!bus||bus<=0){this.loading=false;this.seatsError='Selecciona un viaje válido para consultar sus sensores.';return;}
    this.loading=true;
    forkJoin({seats:this.source(this.api.seats(bus),'Plano del bus'),current:this.source(this.api.current(trip),'Estado de sensores'),history:this.source(this.api.history(trip),'Historial de sensores'),manifest:this.source(this.api.manifest(trip),'Pasajeros de boletas')}).pipe(takeUntil(this.cancel),takeUntil(this.destroyed)).subscribe(data=>{
      this.loading=false;this.queryTime=new Date().toISOString();this.seats=(data.seats.data??[]).filter(seat=>seat.bus===bus);this.seatsError=data.seats.error;const ids=new Set(this.seats.map(seat=>seat.id)),keys=new Set<string>();
      this.records=[...(data.history.data??[]),...(data.current.data??[])].filter(record=>{if(!record||record.trip!==trip||!ids.has(record.seat)||typeof record.occupied!=='boolean'||!Number.isFinite(Date.parse(record.time_stamp)))return false;const key=record.trip+':'+record.seat+':'+Date.parse(record.time_stamp)+':'+record.occupied;if(keys.has(key))return false;keys.add(key);return true;});
      this.tickets=(data.manifest.data?.tickets??[]).filter(ticket=>ticket.trip===trip&&ids.has(ticket.seat));this.ticketsFailed=!!data.manifest.error||data.manifest.data?.unavailable===true;this.errors=[...Object.values(data).map(value=>value.error).filter(Boolean),...(data.manifest.data?.warnings??[])];this.selectedSeatId=this.seats[0]?.id??null;this.rebuild();
    });
  }
  private rebuild():void{this.cutoff=this.at&&Number.isFinite(Date.parse(this.at))?this.at:this.queryTime;this.snapshots=sensorSnapshots(this.seats,this.records,this.trip?.id??0,this.cutoff);this.historyPage=1;}
  select(id:number):void{if(!this.seats.some(seat=>seat.id===id))return;this.selectedSeatId=id;this.historyPage=1;}
  snapshot(id:number):SensorSnapshot|undefined{return this.snapshots.find(value=>value.seat.id===id);}
  state(id:number):string{const value=this.snapshot(id);return value?.state==='occupied'?'Ocupado':value?.state==='free'?'Libre':value?.reason==='stale'?'Lectura antigua':value?.reason==='conflict'?'Sin confirmar':'Sin lectura';}
  receivedAt(record:AdminSeatReading):string|null{return record.created_at&&Number.isFinite(Date.parse(record.created_at))?record.created_at:null;}
  ngOnDestroy():void{this.cancel.next();this.cancel.complete();this.destroyed.next();this.destroyed.complete();}
}
