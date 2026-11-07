import { FleetTripsComponent } from '../../shared/fleet-trips/fleet-trips.component';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, Subscription, catchError, finalize, map, of, switchMap, takeUntil, timeout } from 'rxjs';
import { AdminSeat, AdminSeatsService } from '../../core/services/admin-seats.service';
import { seatPlanIssues } from '../../core/utils/seat-plan';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';

@Component({standalone:true,imports:[CommonModule,RouterLink,FleetTripsComponent],templateUrl:'./bus-detail.component.html',styleUrl:'./bus-detail.component.css'})
export class BusDetailComponent implements OnInit, OnDestroy {
  private seatsApi=inject(AdminSeatsService);private route=inject(ActivatedRoute);private api=inject(BusService);private destroyed=new Subject<void>();private retryRequest?:Subscription;
  seats:AdminSeat[]=[];seatsLoaded=false;seatsLoading=false;seatsError='';
  get configurationIssues():string[]{
    if(!this.bus)return [];
    const issues=this.seatsLoaded?seatPlanIssues(this.seats,this.bus.capacity):[];
    if(this.seatsLoaded&&this.seats.length<this.bus.capacity)issues.push('Faltan '+(this.bus.capacity-this.seats.length)+' sillas registradas para completar las '+this.bus.capacity+' del vehículo.');
    const type=this.bus.bus_type_detail;
    if(type&&this.bus.capacity>type.max_capacity)issues.push('El vehículo tiene '+this.bus.capacity+' sillas y supera el máximo de '+type.max_capacity+' permitido por '+type.name+'.');
    return issues;
  }
  bus:Bus|null=null;busId:number|null=null;loading=false;error='';
  get seatContext():Record<string,number>{const result:Record<string,number>={};for(const key of ['cliente','trip','asiento']){const raw=this.route.snapshot.queryParamMap.get(key),id=Number(raw);if(raw&&/^[1-9]\d*$/.test(raw)&&Number.isSafeInteger(id)&&id>0)result[key]=id;}return result;}
  ngOnInit():void{
    this.route.paramMap.pipe(switchMap(params=>this.request(params.get('id'))),takeUntil(this.destroyed)).subscribe(bus=>{this.bus=bus;});
  }
  private request(raw:string|null){
    this.retryRequest?.unsubscribe();this.bus=null;this.seats=[];this.seatsLoaded=false;this.seatsLoading=false;this.seatsError='';this.error='';const id=Number(raw);
    if(!raw||!/^\d+$/.test(raw)||!Number.isSafeInteger(id)||id<=0){this.loading=false;this.busId=null;this.error='El identificador del bus no es válido.';return of(null);}
    this.busId=id;this.loading=true;
    return this.api.obtenerPorId(id).pipe(timeout(20000),catchError(err=>{
      this.error=err.status===404?'El bus no existe o ya fue eliminado (HTTP 404).':err.status===401?'Tu sesión venció. Inicia sesión nuevamente (HTTP 401).':err.status===403?'Tu cuenta no tiene permiso para consultar este bus (HTTP 403).':err.status===0?'No se pudo conectar con el servicio de buses.':err.status>=500?'El servicio de buses presentó un error interno (HTTP '+err.status+').':'No se pudo consultar el bus. Intenta nuevamente'+(err.status?' (HTTP '+err.status+').':'.');
      return of(null);
    }),switchMap(bus=>{
      if(!bus)return of(null);
      this.bus=bus;this.seatsLoading=true;
      return this.seatsApi.seats(id).pipe(timeout(20000),map(seats=>{this.seats=seats;this.seatsLoaded=true;return bus;}),catchError(err=>{this.seatsError='No se pudieron consultar las sillas registradas'+(err.status?' (HTTP '+err.status+')':'')+'. La capacidad no confirma cuántas sillas existen en el sistema.';return of(bus);}),finalize(()=>{this.seatsLoading=false;}));
    }),finalize(()=>{this.loading=false;}));
  }
  retry():void{if(this.loading||!this.busId)return;this.retryRequest=this.request(String(this.busId)).pipe(takeUntil(this.destroyed)).subscribe(bus=>{this.bus=bus;});}
  stateLabel(value:string):string{return ({Active:'Activo',Inactive:'Inactivo',Maintenance:'Mantenimiento',mantenimiento:'Mantenimiento'} as Record<string,string>)[value]??value;}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();}
}
