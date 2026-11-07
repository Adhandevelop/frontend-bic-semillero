import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, switchMap, takeUntil, tap, timeout } from 'rxjs';
import { Viaje } from '../../core/models/viaje.model';
import { ViajeService } from '../../core/services/viaje.service';
import { tripServerNow } from '../../core/utils/trip-sales';
@Component({selector:'app-trip-actions',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./trip-actions.component.html',styleUrl:'./trip-actions.component.css'})
export class TripActionsComponent implements OnDestroy {
  @Input({required:true}) trip!:Viaje;@Output() updated=new EventEmitter<void>();
  private http=inject(HttpClient);private api=inject(ViajeService);private destroyed=new Subject<void>();
  action:''|'cancel'|'complete'|'postpone'='';reason='';start='';end='';busy=false;uncertain=false;error='';message='';
  sessionExpired=false;
  get editable():boolean{return ['programado','en_curso'].includes(this.trip.estado);}
  select(action:'cancel'|'complete'|'postpone'):void{if(this.busy||this.uncertain||!this.editable)return;this.action=action;this.reason='';this.start='';this.end='';this.error='';this.message='';}
  private iso(value:string):string|null{if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;const date=new Date(value+':00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,16)===value?value+':00-05:00':null;}
  submit():void{
    if(this.busy||this.uncertain||!this.editable||!this.action||!this.trip.id)return;this.error='';const id=this.trip.id,action=this.action;
    if(action!=='complete'&&!this.reason.trim()){this.error='Escribe el motivo de esta acción.';return;}
    const start=this.iso(this.start),end=this.end?this.iso(this.end):null;
    if(action==='postpone'&&(!start||!Number.isFinite(tripServerNow(this.trip))||Date.parse(start)<=Math.max(tripServerNow(this.trip),Date.parse(this.trip.fecha_hora_inicio))||this.end&&(!end||Date.parse(end)<=Date.parse(start)))){this.error='Indica una nueva salida futura posterior a la anterior y una llegada posterior a la salida, en hora Colombia. Actualiza el viaje si falta la hora del servidor.';return;}
    if(!confirm((action==='cancel'?'¿Cancelar':action==='complete'?'¿Finalizar':'¿Postergar')+' el viaje #'+id+'? '+(action==='postpone'?'Se conservarán las compras y se recalculará el horario.':'Las ventas se cerrarán de inmediato.')))return;
    const body=action==='complete'?{}:action==='cancel'?{reason:this.reason.trim()}:{reason:this.reason.trim(),new_date_time_start:start,new_date_time_end:end};
    this.busy=true;this.sessionExpired=false;let accepted=false;
    // Re-read the authenticated resource; action responses wrap it in {detail, trip}.
    this.http.post('/api/trips/trips/'+id+'/'+action+'/',body).pipe(timeout(20000),tap(()=>accepted=true),switchMap(()=>this.api.obtenerPorId(id).pipe(timeout(20000))),takeUntil(this.destroyed)).subscribe({next:trip=>{
      this.busy=false;const valid=trip.id===id&&(action==='postpone'?Date.parse(trip.fecha_hora_inicio)===Date.parse(start!):trip.state_source==='manual'&&trip.estado===(action==='cancel'?'cancelado':'finalizado'));
      if(!valid){this.uncertain=true;this.error='La respuesta no confirma la acción solicitada. Actualiza el viaje antes de continuar.';return;}
      this.message='Acción confirmada por el servidor.';this.action='';this.updated.emit();
    },error:(err:{status?:number;error?:Record<string,unknown>})=>{
      this.busy=false;this.uncertain=true;
      if(err.status===401||err.error?.['code']==='token_not_valid'){this.sessionExpired=true;this.error='Tu sesión administrativa venció o fue revocada. Inicia sesión nuevamente.'+(accepted?' La operación fue aceptada, pero falta consultar su resultado.':'');return;}
      if(err.status===403){this.error='No tienes permiso para gestionar este viaje. Consulta el estado antes de repetir la acción.';return;}
      const details=['detail','reason','new_date_time_start','new_date_time_end'].flatMap(key=>{const v=err.error?.[key];return typeof v==='string'?[v]:Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}).join(' ');
      this.error=(details||'No se pudo confirmar la operación'+(err.status?' (HTTP '+err.status+').':'.'))+' Consulta el estado antes de repetir la acción.';
    }});
  }
  refresh():void{if(!this.busy)this.updated.emit();}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();}
}
