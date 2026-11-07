import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, catchError, forkJoin, of, takeUntil, timeout } from 'rxjs';
import { Viaje } from '../../core/models/viaje.model';
import { Ruta } from '../../core/models/ruta.model';
import { ViajeService } from '../../core/services/viaje.service';
import { RutaService } from '../../core/services/ruta.service';

@Component({selector:'app-fleet-trips',standalone:true,imports:[CommonModule,RouterLink],templateUrl:'./fleet-trips.component.html',styleUrl:'./fleet-trips.component.css'})
export class FleetTripsComponent implements OnChanges,OnDestroy {
  @Input({required:true}) entityId!:number;
  @Input({required:true}) kind!:'bus'|'driver';
  private api=inject(ViajeService);private routesApi=inject(RutaService);private cancel=new Subject<void>();
  trips:Viaje[]=[];routes:Ruta[]=[];loading=false;error='';warning='';tab:'active'|'history'='active';page=1;
  ngOnChanges():void{this.load();}
  load():void{
    this.cancel.next();this.trips=[];this.routes=[];this.error='';this.warning='';this.page=1;
    if(!Number.isSafeInteger(this.entityId)||this.entityId<=0){this.loading=false;return;}
    this.loading=true;
    forkJoin({trips:this.api.listar().pipe(timeout(20000)),routes:this.routesApi.listar().pipe(timeout(20000),catchError(()=>{this.warning='No se pudieron cargar las terminales; se muestran los IDs de ruta.';return of([] as Ruta[]);} ))}).pipe(takeUntil(this.cancel)).subscribe({next:data=>{this.trips=data.trips.filter(t=>(this.kind==='bus'?t.bus:t.conductor)===this.entityId);this.routes=data.routes;this.loading=false;},error:err=>{this.loading=false;this.error='No se pudieron cargar los viajes asociados'+(err.status?' (HTTP '+err.status+')':'')+'.';}});
  }
  get filtered():Viaje[]{return this.trips.filter(t=>this.tab==='active'?['programado','en_curso'].includes(t.estado):['finalizado','cancelado'].includes(t.estado)).sort((a,b)=>{if(this.tab==='active'&&a.estado!==b.estado)return a.estado==='en_curso'?-1:b.estado==='en_curso'?1:0;const delta=Date.parse(a.fecha_hora_inicio)-Date.parse(b.fecha_hora_inicio);return (Number.isFinite(delta)?delta:(a.id??0)-(b.id??0))*(this.tab==='active'?1:-1);});}
  get pageCount():number{return Math.max(1,Math.ceil(this.filtered.length/7));}
  get visible():Viaje[]{return this.filtered.slice((this.page-1)*7,this.page*7);}
  label(trip:Viaje):string{const route=this.routes.find(r=>r.id===trip.ruta);return route?route.origen+' → '+route.destino:'Ruta #'+trip.ruta;}
  state(value:string):string{return ({programado:'Programado',en_curso:'En curso',finalizado:'Finalizado',cancelado:'Cancelado'} as Record<string,string>)[value]??value;}
  ngOnDestroy():void{this.cancel.next();this.cancel.complete();}
}
