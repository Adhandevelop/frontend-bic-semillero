import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { Viaje } from '../../core/models/viaje.model';
import { Bus } from '../../core/models/bus.model';
import { Conductor } from '../../core/models/conductor.model';
import { Ruta } from '../../core/models/ruta.model';
import { ViajeService } from '../../core/services/viaje.service';
import { BusService } from '../../core/services/bus.service';
import { ConductorService } from '../../core/services/conductor.service';
import { RutaService } from '../../core/services/ruta.service';

export function tripDay(value:string):string {
  const time=Date.parse(value);
  return Number.isFinite(time)?new Date(time-5*3600000).toISOString().slice(0,10):'';
}
@Component({selector:'app-viaje-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./viaje-list.component.html',styleUrl:'./viaje-list.component.css'})
export class ViajeListComponent implements OnInit {
  errorReasons:string[]=[];errorHttp='';
  private explainFailure(err:{status?:number;error?:unknown}):void{
    this.errorHttp=err.status===0?'Sin respuesta de la API':err.status?'HTTP '+err.status:'Estado no disponible';
    const messages:string[]=[];
    const collect=(value:unknown,label=''):void=>{
      if(typeof value==='string'&&value.trim()&&!/<[^>]+>/.test(value))messages.push((label?label+': ':'')+value.trim());
      else if(Array.isArray(value))value.slice(0,10).forEach(item=>collect(item,label));
    };
    const body=err.error;
    if(body&&typeof body==='object'&&!Array.isArray(body)){
      const labels:Record<string,string>={detail:'',message:'',reason:'Motivo',error:'Error',errors:'Errores',non_field_errors:'',trip:'Viaje',bus:'Bus',driver:'Conductor',route:'Ruta',trip_state:'Estado',date_time_start:'Salida',date_time_end:'Llegada'};
      for(const [key,label] of Object.entries(labels))if(key in body)collect((body as Record<string,unknown>)[key],label);
    }
    this.errorReasons=[...new Set(messages)].slice(0,10);
    if(!this.errorReasons.length)this.errorReasons=[err.status===0?'No se recibió respuesta. Revisa la conexión o la disponibilidad de la API.':'El servidor no devolvió un motivo detallado en JSON. Para conocer la causa exacta se necesita revisar su registro de errores.'];
  }
  viajes:Viaje[]=[];buses:Bus[]=[];conductores:Conductor[]=[];rutas:Ruta[]=[];
  loading=false;loadFailed=false;error='';success='';warnings:string[]=[];
  searchValue='';selectedDate='';originFilter='';driverFilter=0;modelFilter='';stateFilter='';
  page=1;readonly pageSize=7;busyId:number|null=null;updatedAt:Date|null=null;
  readonly states:Viaje['estado'][]=['en_curso','programado','finalizado','cancelado'];
  constructor(private viajeService:ViajeService,private busService:BusService,private conductorService:ConductorService,private rutaService:RutaService){}
  ngOnInit():void{this.cargarViajes();}
  stateLabel(state:Viaje['estado']):string{return ({programado:'Programado',en_curso:'En curso',finalizado:'Finalizado',cancelado:'Cancelado'})[state]||'Sin estado';}
  nombreBus(trip:Viaje):string{return this.buses.find(bus=>bus.id===trip.bus)?.plate||trip.bus_detalle?.plate||trip.bus_detalle?.placa||'Bus #'+trip.bus;}
  modeloBus(trip:Viaje):string{return this.buses.find(bus=>bus.id===trip.bus)?.model||'Modelo sin datos';}
  capacidadBus(trip:Viaje):number|undefined{return this.buses.find(bus=>bus.id===trip.bus)?.capacity;}
  nombreConductor(trip:Viaje):string{return this.conductores.find(driver=>driver.id===trip.conductor)?.full_name||trip.conductor_detalle?.full_name||trip.conductor_detalle?.nombre||'Conductor #'+trip.conductor;}
  licenciaConductor(trip:Viaje):string{return this.conductores.find(driver=>driver.id===trip.conductor)?.license_number||'Licencia sin datos';}
  nombreRuta(trip:Viaje):string{const route=this.rutas.find(route=>route.id===trip.ruta)||trip.ruta_detalle;return route?.origen&&route?.destino?route.origen+' → '+route.destino:'Ruta #'+trip.ruta;}
  get dateTrips():Viaje[]{return this.viajes.filter(trip=>!this.selectedDate||tripDay(trip.fecha_hora_inicio)===this.selectedDate);}
  countState(state:Viaje['estado']):number{return this.dateTrips.filter(trip=>trip.estado===state).length;}
  get origins():string[]{return [...new Set(this.rutas.map(route=>route.origen))].sort();}
  get models():string[]{return [...new Set(this.buses.map(bus=>bus.model).filter((model):model is string=>Boolean(model)))].sort();}
  get filteredTrips():Viaje[]{
    const query=this.searchValue.trim().toLocaleLowerCase();
    return this.dateTrips.filter(trip=>(!this.stateFilter||trip.estado===this.stateFilter)&&(!this.driverFilter||trip.conductor===Number(this.driverFilter))&&(!this.originFilter||this.rutas.find(route=>route.id===trip.ruta)?.origen===this.originFilter)&&(!this.modelFilter||this.buses.find(bus=>bus.id===trip.bus)?.model===this.modelFilter)&&(!query||[trip.id,this.nombreRuta(trip),this.nombreBus(trip),this.nombreConductor(trip)].join(' ').toLocaleLowerCase().includes(query)));
  }
  get pageCount():number{return Math.max(1,Math.ceil(this.filteredTrips.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visibleTrips():Viaje[]{return this.filteredTrips.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  get firstResult():number{return this.filteredTrips.length?(this.currentPage-1)*this.pageSize+1:0;}
  get lastResult():number{return Math.min(this.currentPage*this.pageSize,this.filteredTrips.length);}
  get upcoming():Viaje[]{const now=Date.now();return this.viajes.filter(trip=>trip.estado==='programado'&&Date.parse(trip.fecha_hora_inicio)>=now&&(!this.selectedDate||tripDay(trip.fecha_hora_inicio)===this.selectedDate)).sort((a,b)=>Date.parse(a.fecha_hora_inicio)-Date.parse(b.fecha_hora_inicio)).slice(0,3);}
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  setStateFilter(state:string):void{this.stateFilter=state;this.page=1;}
  clearFilters():void{this.searchValue='';this.selectedDate='';this.originFilter='';this.driverFilter=0;this.modelFilter='';this.stateFilter='';this.page=1;}
  cargarViajes():void{
    if(this.loading||this.busyId!==null)return;
    this.loading=true;this.loadFailed=false;this.error='';this.errorReasons=[];this.errorHttp='';this.warnings=[];
    const load=<T>(label:string,request:Observable<T>,fallback:T)=>request.pipe(catchError((error:{status?:number})=>{this.warnings.push(label+(error.status?' (HTTP '+error.status+')':''));if(label==='Viajes'){this.loadFailed=true;this.explainFailure(error);}return of(fallback);}));
    forkJoin({viajes:load('Viajes',this.viajeService.listar(),[] as Viaje[]),buses:load('Buses',this.busService.listarTodos(),[] as Bus[]),conductores:load('Conductores',this.conductorService.listarTodos(),[] as Conductor[]),rutas:load('Rutas',this.rutaService.listar(),[] as Ruta[])}).subscribe(data=>{
      this.viajes=data.viajes;this.buses=data.buses;this.conductores=data.conductores;this.rutas=data.rutas;this.loading=false;
      if(this.loadFailed)this.error='No se pudieron cargar los viajes. Revisa la conexión y los permisos de tu sesión.';
      else this.updatedAt=new Date();this.page=Math.min(this.page,this.pageCount);
    });
  }
  eliminarViaje(trip:Viaje):void{
    if(this.loading||this.busyId!==null||!trip.id||!confirm('¿Eliminar definitivamente el viaje #'+trip.id+'? Si tiene ventas, tiquetes o registros asociados, el servidor puede impedirlo. Cancelar el viaje es una acción distinta.'))return;
    this.busyId=trip.id;this.error='';this.errorReasons=[];this.errorHttp='';this.success='';
    this.viajeService.eliminar(trip.id).subscribe({next:()=>{this.viajes=this.viajes.filter(item=>item.id!==trip.id);this.busyId=null;this.page=Math.min(this.page,this.pageCount);this.success='Viaje eliminado correctamente.';},error:(err:{status?:number;error?:unknown})=>{
      this.busyId=null;this.explainFailure(err);
      const detail=err.error&&typeof err.error==='object'&&'detail' in err.error&&typeof err.error.detail==='string'?err.error.detail:'';
      this.error=err.status===401?'La sesión venció. Inicia sesión nuevamente.':err.status===403?'Tu cuenta no tiene permisos para eliminar viajes.':err.status===400||err.status===409?(detail||'El servidor impide eliminar este viaje por sus registros asociados.'):err.status===404?'El viaje ya no existe en el servidor. Actualiza el listado.':err.status===0?'No se pudo confirmar la eliminación por un problema de conexión. Actualiza el listado antes de reintentar.':err.status!==undefined&&err.status>=500?'El servidor presentó un error al eliminar el viaje #'+trip.id+' (HTTP '+err.status+'). Puede tener ventas, tiquetes o registros protegidos; requiere revisar el backend. Actualiza el listado para confirmar su estado.':'No se pudo confirmar la eliminación. Actualiza el listado antes de reintentar.';
    }});
  }
  iniciarViaje(trip:Viaje):void{this.cambiarEstado(trip,'iniciar');}
  finalizarViaje(trip:Viaje):void{this.cambiarEstado(trip,'finalizar');}
  cancelarViaje(trip:Viaje):void{this.cambiarEstado(trip,'cancelar');}
  private cambiarEstado(trip:Viaje,action:'iniciar'|'finalizar'|'cancelar'):void{
    if(this.loading||this.busyId!==null||!trip.id)return;
    if(action==='iniciar'&&trip.estado!=='programado'||action==='finalizar'&&trip.estado!=='en_curso'||action==='cancelar'&&!['programado','en_curso'].includes(trip.estado))return;
    if(action==='cancelar'&&!confirm('¿Cancelar el viaje #'+trip.id+'?'))return;
    this.busyId=trip.id;this.error='';this.errorReasons=[];this.errorHttp='';this.success='';
    const request=action==='iniciar'?this.viajeService.iniciarViaje(trip.id):action==='finalizar'?this.viajeService.finalizarViaje(trip.id):this.viajeService.cancelarViaje(trip.id);
    request.subscribe({next:updated=>{this.viajes=this.viajes.map(item=>item.id===trip.id?updated:item);this.busyId=null;this.page=Math.min(this.page,this.pageCount);this.success='Estado del viaje actualizado: '+this.stateLabel(updated.estado)+'.';},error:(err)=>{this.busyId=null;this.explainFailure(err);this.error='No se pudo cambiar el estado del viaje.';}});
  }
  exportCsv():void{
    if(this.loading||this.loadFailed||!this.filteredTrips.length)return;
    const rows=[['Viaje','Ruta','Salida UTC','Fin UTC','Bus','Conductor','Estado'],...this.filteredTrips.map(trip=>[String(trip.id??''),this.nombreRuta(trip),trip.fecha_hora_inicio,trip.fecha_hora_fin||'',this.nombreBus(trip),this.nombreConductor(trip),this.stateLabel(trip.estado)])];
    const csv=rows.map(row=>row.map(value=>'"'+(/^[\s]*[=+@-]/.test(value)?"'"+value:value).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='viajes.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
}



