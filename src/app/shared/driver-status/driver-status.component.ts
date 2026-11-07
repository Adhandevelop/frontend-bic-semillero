import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { Subject, takeUntil, timeout } from 'rxjs';
import { Conductor } from '../../core/models/conductor.model';
import { ConductorService } from '../../core/services/conductor.service';
import { fleetError } from '../../core/utils/fleet-error';
@Component({selector:'app-driver-status',standalone:true,imports:[CommonModule],template:`<div [attr.aria-busy]="busy"><span>{{ driver.is_active === true ? 'Activo' : driver.is_active === false ? 'Inactivo' : 'Estado no informado' }}</span> <button type="button" [disabled]="busy || !driver.id || driver.is_active === undefined" (click)="toggle()">{{ busy ? 'Guardando…' : driver.is_active === true ? 'Desactivar' : 'Activar' }}</button><p *ngIf="error" role="alert">{{ error }}</p><p *ngIf="success" role="status">{{ success }}</p></div>`,styles:[`:host{display:block}span{font-size:12px;font-weight:700}button{min-height:44px;padding:8px 12px;border:1px solid #cad9ef;border-radius:7px;background:#f4f8ff;color:#0059bb;cursor:pointer}button:disabled{opacity:.5;cursor:default}p{font-size:12px;max-width:340px;overflow-wrap:anywhere}p[role=alert]{color:#a32e42}button:focus-visible{outline:3px solid #0059bb;outline-offset:2px}`]})
export class DriverStatusComponent implements OnDestroy {
  @Input({required:true}) driver!:Conductor;
  @Output() updated=new EventEmitter<Conductor>();
  private api=inject(ConductorService);private destroy=new Subject<void>();busy=false;error='';success='';
  toggle():void{
    if(this.busy||!this.driver.id||typeof this.driver.is_active!=='boolean')return;
    const id=this.driver.id,target=!this.driver.is_active;
    if(!confirm((target?'¿Activar a ':'¿Desactivar a ')+this.driver.full_name+'? '+(target?'Podrá asignarse a viajes, sujeto a validación de horarios.':'Se conservarán sus viajes e historial. Desactivar no cancela ni reasigna viajes existentes.')))return;
    this.busy=true;this.error='';this.success='';
    this.api.actualizarParcial(id,{is_active:target}).pipe(timeout(20000),takeUntil(this.destroy)).subscribe({next:driver=>{
      this.busy=false;
      if(driver.id!==id||driver.is_active!==target){this.error='La API no confirmó el nuevo estado. Actualiza la ficha antes de reintentar.';return;}
      this.success=target?'Conductor activado.':'Conductor desactivado. Revisa sus viajes programados o en curso.';
      this.updated.emit({...this.driver,...driver});
    },error:err=>{this.busy=false;this.error=fleetError(err,'cambiar el estado del conductor');}});
  }
  ngOnDestroy():void{this.destroy.next();this.destroy.complete();}
}
