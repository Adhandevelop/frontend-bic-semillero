import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, catchError, finalize, from, map, mergeMap, of, takeUntil, timeout } from 'rxjs';
import { AdminSeatsService } from '../../../core/services/admin-seats.service';
import { Bus } from '../../../core/models/bus.model';
import { Conductor } from '../../../core/models/conductor.model';
import { Ruta } from '../../../core/models/ruta.model';
import { AvailabilitySummary, DashboardTrip, colombianDay, summarizeAvailability } from './trip-control.model';
interface SeatResult {loading:boolean;summary:AvailabilitySummary|null;error:string;}
@Component({selector:'app-dashboard-trip-control',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./trip-control.component.html',styleUrl:'./trip-control.component.css'})
export class TripControlComponent implements OnChanges,OnDestroy {
  @Input() trips:DashboardTrip[]=[];@Input() buses:Bus[]=[];@Input() drivers:Conductor[]=[];@Input() routes:Ruta[]=[];@Input() failed=false;
  private api=inject(AdminSeatsService);private selection=new Subject<void>();private destroyed=new Subject<void>();private timer?:ReturnType<typeof setInterval>;
  page=1;readonly pageSize=6;search='';date='';direction:'asc'|'desc'='asc';loading=false;results:Record<number,SeatResult>={};
  ngOnChanges():void{this.page=1;this.refresh();if(!this.timer)this.timer=setInterval(()=>{if(document.visibilityState==='visible'&&!this.loading)this.refresh();},60000);}
  ngOnDestroy():void{if(this.timer)clearInterval(this.timer);this.selection.next();this.selection.complete();this.destroyed.next();this.destroyed.complete();}
  get scheduled():DashboardTrip[]{return this.trips.filter(trip=>trip.trip_state==='scheduled');}
  get inProgress():number{return this.trips.filter(trip=>trip.trip_state==='in_progress').length;}
  get today():string{return colombianDay(new Date().toISOString());}
  get todayCount():number{return this.scheduled.filter(trip=>colombianDay(trip.date_time_start)===this.today).length;}
  routeLabel(trip:DashboardTrip):string{const route=this.routes.find(value=>value.id===trip.route);return route?route.origen+' → '+route.destino:'Ruta #'+trip.route;}
  bus(trip:DashboardTrip):Bus|undefined{return this.buses.find(bus=>bus.id===trip.bus);}
  driver(trip:DashboardTrip):string{return this.drivers.find(driver=>driver.id===trip.driver)?.full_name||'Conductor #'+trip.driver;}
  overdue(trip:DashboardTrip):boolean{return Date.parse(trip.date_time_start)<Date.now();}
  get filtered():DashboardTrip[]{const term=this.search.trim().toLocaleLowerCase();return this.scheduled.filter(trip=>(!this.date||colombianDay(trip.date_time_start)===this.date)&&(!term||[trip.id,this.routeLabel(trip),this.bus(trip)?.plate,this.driver(trip)].join(' ').toLocaleLowerCase().includes(term))).sort((a,b)=>{const first=Date.parse(a.date_time_start),second=Date.parse(b.date_time_start);if(!Number.isFinite(first))return Number.isFinite(second)?1:b.id-a.id;if(!Number.isFinite(second))return -1;return (this.direction==='asc'?1:-1)*(first-second||a.id-b.id);});}
  get pageCount():number{return Math.max(1,Math.ceil(this.filtered.length/this.pageSize));}
  get visible():DashboardTrip[]{return this.filtered.slice((this.page-1)*this.pageSize,this.page*this.pageSize);}
  get known():AvailabilitySummary[]{return this.visible.flatMap(trip=>this.results[trip.id]?.summary?[this.results[trip.id].summary!]:[]);}
  get pageAvailable():number{return this.known.reduce((total,row)=>total+row.available,0);}
  filtersChanged():void{this.page=1;this.refresh();}
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.page+delta));this.refresh();}
  refresh():void{
    this.selection.next();this.results={};if(this.failed){this.loading=false;return;}const trips=this.visible;if(!trips.length){this.loading=false;return;}this.loading=true;
    for(const trip of trips)this.results[trip.id]={loading:true,summary:null,error:''};
    from(trips).pipe(mergeMap(trip=>this.api.availability(trip.id).pipe(timeout(15000),map(data=>({id:trip.id,result:{loading:false,summary:summarizeAvailability(data,trip.id),error:''}})),catchError((err:{status?:number})=>of({id:trip.id,result:{loading:false,summary:null,error:err.status===403?'Sin permiso para consultar disponibilidad.':'No se pudo confirmar la disponibilidad'+(err.status?' (HTTP '+err.status+').':'.')}}))),3),takeUntil(this.selection),takeUntil(this.destroyed),finalize(()=>this.loading=false)).subscribe(({id,result})=>this.results[id]=result);
  }
}
