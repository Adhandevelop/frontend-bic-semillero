import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, Subject, takeUntil, timeout } from 'rxjs';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';
import { DeviceState, GpsDevice, GpsDeviceService, deviceFailure } from '../../core/services/gps-device.service';
import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
import { DeviceSecretComponent } from '../../shared/device-secret/device-secret.component';
@Component({standalone:true,imports:[CommonModule,FormsModule,ReactiveFormsModule,RouterLink,ListOrderComponent,DeviceSecretComponent],templateUrl:'./devices.component.html',styleUrl:'./devices.component.css'})
export class DevicesComponent implements OnInit,OnDestroy {
  private api=inject(GpsDeviceService);private busApi=inject(BusService);private fb=inject(FormBuilder);private destroyed=new Subject<void>();
  devices:GpsDevice[]=[];buses:Bus[]=[];loading=false;busesLoading=false;busy=false;uncertain=false;error='';busError='';success='';
  search='';stateFilter='';availableFilter='';listOrder:ListOrder='desc';page=1;editingId:number|null=null;selected:GpsDevice|null=null;targetBus:number|null=null;
  secret='';secretName='';private reviewPending=false;
  form=this.fb.nonNullable.group({name:['',[Validators.required,Validators.pattern(/\S/)]],device_id:['',[Validators.required,Validators.pattern(/\S/)]],model:[''],state:['active' as DeviceState,Validators.pattern(/^(active|inactive|maintenance)$/)],bus:[null as number|null]});
  get locked(){return this.busy||this.loading||!!this.secret;}
  get pageCount(){return Math.max(1,Math.ceil(this.devices.length/7));}
  get currentPage(){return Math.min(this.page,this.pageCount);}
  get visible(){return orderRecords(this.devices,this.listOrder).slice((this.currentPage-1)*7,this.currentPage*7);}
  ngOnInit():void{this.load();this.loadBuses();}
  load():void{if(this.busy||this.loading||this.secret)return;this.loading=true;this.error='';this.selected=null;this.api.list({search:this.search,...(this.stateFilter?{state:this.stateFilter as DeviceState}:{}),...(this.availableFilter?{available:this.availableFilter==='free'}:{})}).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:rows=>{this.devices=rows;this.loading=false;this.page=1;if(this.reviewPending){this.uncertain=false;this.reviewPending=false;this.reset();}},error:err=>{this.devices=[];this.loading=false;this.error=deviceFailure(err,'consultar dispositivos');}});}
  loadBuses():void{if(this.busesLoading)return;this.busesLoading=true;this.busError='';this.busApi.listarTodos().pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:rows=>{this.buses=rows;this.busesLoading=false;},error:err=>{this.busesLoading=false;this.busError=deviceFailure(err,'consultar buses');}});}
  edit(device:GpsDevice):void{if(this.locked||this.uncertain)return;this.editingId=device.id;this.uncertain=false;this.error='';this.form.reset({name:device.name,device_id:device.device_id,model:device.model??'',state:device.state,bus:null});}
  reset():void{if(this.busy||this.secret||this.uncertain)return;this.editingId=null;this.uncertain=false;this.form.reset({name:'',device_id:'',model:'',state:'active',bus:null});}
  save():void{
    if(this.locked||this.uncertain)return;this.form.markAllAsTouched();if(this.form.invalid)return;
    const value=this.form.getRawValue(),id=this.editingId;
    if(!id&&value.bus!==null&&(!this.buses.some(bus=>bus.id===value.bus&&!bus.gps_device_detail)||this.busError||this.busesLoading)){this.error='Selecciona un bus disponible del catálogo actualizado o deja el dispositivo sin asignar.';return;}
    const input={name:value.name.trim(),device_id:value.device_id.trim(),model:value.model.trim(),state:value.state};
    this.busy=true;this.error='';this.success='';
    const request:Observable<GpsDevice|{device:GpsDevice;secret:string|null}>=id?this.api.update(id,input):this.api.create({...input,...(value.bus!==null?{bus:value.bus}:{})});
    request.pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:result=>{
      this.busy=false;const created='device' in result,device=created?result.device:result;
      if(!device?.id||(id&&device.id!==id)){this.uncertain=true;this.error='La respuesta no confirma el dispositivo. Consulta el inventario antes de repetir.';return;}
      this.upsert(device);this.reset();this.success=id?'Dispositivo actualizado.':'Dispositivo registrado.';
      if(created){this.secret=result.secret??'';this.secretName=device.name;if(!this.secret)this.error='El dispositivo se registró, pero la respuesta no incluyó una clave completa. No lo crees otra vez; consulta el inventario y regenera su clave si hace falta.';}
      this.loadBuses();
    },error:err=>{this.busy=false;this.uncertain=!err.status||err.status>=500;this.error=deviceFailure(err,'guardar el dispositivo')+(this.uncertain?' El resultado es incierto: consulta el inventario antes de crear o regenerar otra vez.':'');}});
  }
  regenerate(device:GpsDevice):void{
    if(this.locked||this.uncertain||!confirm('¿Regenerar la clave de '+device.name+'? La clave anterior dejará de funcionar y habrá que configurar la nueva en el dispositivo.'))return;
    this.busy=true;this.error='';this.success='';
    this.api.regenerate(device.id).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:value=>{this.busy=false;if(value.device.id!==device.id){this.uncertain=true;this.error='La respuesta no coincide. Actualiza el inventario antes de continuar.';return;}this.upsert(value.device);this.secret=value.secret??'';this.secretName=device.name;this.success='Clave regenerada; la anterior fue revocada.';if(!this.secret){this.uncertain=true;this.error='La clave cambió, pero no llegó completa. Revisa el dispositivo antes de solicitar otra regeneración.';}},error:err=>{this.busy=false;this.uncertain=!err.status||err.status>=500;this.error=deviceFailure(err,'regenerar la clave')+' Si se perdió la respuesta, la clave anterior podría haber sido revocada. No se reintenta automáticamente.';}});
  }
  select(device:GpsDevice):void{if(this.locked)return;this.selected=device;this.targetBus=null;this.error='';}
  assign(remove=false):void{
    const device=this.selected,id=this.targetBus;
    if(!device||this.locked||this.uncertain||(!remove&&(!id||this.busesLoading||this.busError||!this.buses.some(b=>b.id===id))))return;
    const bus=this.buses.find(b=>b.id===id);
    if(!confirm(remove?'¿Desvincular '+device.name+' del bus? No se borrará telemetría histórica.':'¿Asignar '+device.name+' a '+bus?.plate+'? Se sustituirán las asignaciones anteriores de este bus y dispositivo, si existen.'))return;
    this.busy=true;this.error='';this.success='';
    (remove?this.api.unassign(device.id):this.api.assign(device.id,id!)).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:value=>{this.busy=false;if(value.id!==device.id||value.bus!==(remove?null:id)){this.uncertain=true;this.error='La API no confirmó la asignación. Actualiza el inventario.';return;}this.upsert(value);this.selected=null;this.success=remove?'Dispositivo desvinculado.':'Dispositivo asignado.';this.load();this.loadBuses();},error:err=>{this.busy=false;this.uncertain=!err.status||err.status>=500;this.error=deviceFailure(err,'cambiar la asignación')+' Actualiza el inventario para comprobar el resultado.';}});
  }
  acknowledgeUncertain():void{if(this.locked)return;this.reviewPending=true;this.load();this.loadBuses();}
  private upsert(value:GpsDevice):void{this.devices=[value,...this.devices.filter(row=>row.id!==value.id)];this.page=1;}
  state(value:string):string{return ({active:'Activo',inactive:'Inactivo',maintenance:'Mantenimiento'} as Record<string,string>)[value]??value;}
  ngOnDestroy():void{this.secret='';this.secretName='';this.destroyed.next();this.destroyed.complete();}
}
