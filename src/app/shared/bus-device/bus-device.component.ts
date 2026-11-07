import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, forkJoin, switchMap, takeUntil, timeout } from 'rxjs';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';
import { GpsDevice, GpsDeviceService, deviceFailure } from '../../core/services/gps-device.service';
@Component({selector:'app-bus-device',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./bus-device.component.html',styleUrl:'./bus-device.component.css'})
export class BusDeviceComponent implements OnChanges,OnDestroy {
  @Input({required:true}) bus!:Bus;@Output() updated=new EventEmitter<Bus>();
  private api=inject(GpsDeviceService);private busApi=inject(BusService);private destroy=new Subject<void>();private cancel=new Subject<void>();
  devices:GpsDevice[]=[];target:number|null=null;loading=false;busy=false;uncertain=false;error='';success='';private loadedBus:number|null=null;
  ngOnChanges():void{if(this.bus.id!==this.loadedBus){this.cancel.next();this.loadedBus=this.bus.id??null;this.loading=false;this.devices=[];this.target=null;this.busy=false;this.uncertain=false;this.success='';this.load();}}
  load():void{if(this.loading||this.busy||!this.bus.id)return;const id=this.bus.id;this.loading=true;this.error='';forkJoin({devices:this.api.list({available:true}),bus:this.busApi.obtenerPorId(id)}).pipe(timeout(20000),takeUntil(this.cancel),takeUntil(this.destroy)).subscribe({next:value=>{this.loading=false;if(value.bus.id!==id){this.error='La respuesta no coincide con este bus.';return;}if(value.bus.gps_device_detail===undefined){this.error='La API no informa gps_device_detail. Actualiza el backend antes de asignar equipos desde esta ficha.';return;}this.devices=value.devices.filter(d=>d.bus===null);this.bus=value.bus;this.updated.emit(value.bus);this.uncertain=false;this.target=null;},error:err=>{this.loading=false;this.error=deviceFailure(err,'consultar el GPS del bus');}});}
  change(remove=false):void{
    const id=this.bus.id,device=this.devices.find(d=>d.id===this.target);
    if(!id||this.busy||this.loading||this.uncertain||(!remove&&!device)||(remove&&!this.bus.gps_device_detail))return;
    if(!confirm(remove?'¿Retirar el GPS del bus '+this.bus.plate+'? Se conservarán sus lecturas históricas.':'¿Asignar '+device?.name+' al bus '+this.bus.plate+'? '+(this.bus.gps_device_detail?'Se desvinculará el GPS actual.':'')))return;
    const target=remove?null:device!.id;this.busy=true;this.error='';this.success='';
    (remove?this.api.removeFromBus(id):this.api.assignToBus(id,target!)).pipe(timeout(20000),switchMap(()=>this.busApi.obtenerPorId(id).pipe(timeout(20000))),takeUntil(this.cancel),takeUntil(this.destroy)).subscribe({next:value=>{this.busy=false;if(value.id!==id||(value.gps_device_detail?.id??null)!==target){this.uncertain=true;this.error='El servidor no confirmó la asignación esperada. Actualiza los datos antes de reintentar.';return;}this.bus=value;this.updated.emit(value);this.success=remove?'GPS retirado del bus.':'GPS asignado al bus.';this.load();},error:err=>{this.busy=false;this.uncertain=!err.status||err.status>=500;this.error=deviceFailure(err,'cambiar el GPS del bus')+' Actualiza los datos para comprobar la asignación.';}});
  }
  ngOnDestroy():void{this.cancel.next();this.cancel.complete();this.destroy.next();this.destroy.complete();}
}
