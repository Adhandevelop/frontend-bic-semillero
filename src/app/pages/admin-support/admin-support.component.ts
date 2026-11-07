import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, timeout } from 'rxjs';
import { AdminSupportRequest, AdminSupportService, SupportStatus } from '../../core/services/admin-support.service';
import { fleetError } from '../../core/utils/fleet-error';
import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
@Component({standalone:true,imports:[CommonModule,FormsModule,ListOrderComponent],templateUrl:'./admin-support.component.html',styleUrl:'./admin-support.component.css'})
export class AdminSupportComponent implements OnInit,OnDestroy {
  private api=inject(AdminSupportService);private destroyed=new Subject<void>();private detailCancel=new Subject<void>();
  requests:AdminSupportRequest[]=[];selected:AdminSupportRequest|null=null;loading=false;detailLoading=false;saving=false;uncertain=false;error='';detailError='';success='';
  search='';statusFilter='';categoryFilter='';private appliedStatus='';listOrder:ListOrder='desc';page=1;target:SupportStatus='in_progress';
  readonly categories=[{code:'payment',name:'Pago'},{code:'invoice',name:'Factura'},{code:'ticket',name:'Tiquete'},{code:'change',name:'Cambio'},{code:'cancellation',name:'Cancelación'},{code:'account',name:'Cuenta'},{code:'other',name:'Otro'}];
  get pageCount(){return Math.max(1,Math.ceil(this.requests.length/7));}
  get currentPage(){return Math.min(this.page,this.pageCount);}
  get visible(){return orderRecords(this.requests,this.listOrder).slice((this.currentPage-1)*7,this.currentPage*7);}
  ngOnInit():void{this.load();}
  load():void{
    if(this.loading||this.saving)return;this.detailCancel.next();this.selected=null;this.detailLoading=false;this.success='';this.error='';this.requests=[];this.loading=true;
    this.appliedStatus=this.statusFilter;
    this.api.list({search:this.search,status:this.statusFilter,category:this.categoryFilter}).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:rows=>{this.requests=rows;this.page=1;this.loading=false;},error:err=>{this.loading=false;this.error=fleetError(err,'consultar las solicitudes');}});
  }
  open(request:AdminSupportRequest):void{
    if(this.saving)return;this.detailCancel.next();this.selected=request;this.detailLoading=true;this.detailError='';this.success='';this.uncertain=false;
    this.api.detail(request.id).pipe(timeout(15000),takeUntil(this.detailCancel),takeUntil(this.destroyed)).subscribe({next:value=>{this.detailLoading=false;if(value.id!==request.id){this.detailError='La respuesta no corresponde a la solicitud seleccionada.';return;}this.selected=value;this.target=['in_progress','resolved','closed'].includes(value.status)?value.status as SupportStatus:'in_progress';this.replace(value);},error:err=>{this.detailLoading=false;this.detailError=fleetError(err,'consultar la solicitud');}});
  }
  save():void{
    const current=this.selected;if(!current||this.saving||this.detailLoading||this.detailError||this.uncertain||!['in_progress','resolved','closed'].includes(this.target)||current.status===this.target)return;
    const target=this.target;
    if(!confirm('¿Cambiar '+current.reference+' a «'+this.status(target)+'»? Este cambio no cancela ventas, no emite facturas ni realiza reembolsos.'))return;
    this.saving=true;this.detailError='';this.success='';
    this.api.updateStatus(current.id,target).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:value=>{this.saving=false;if(value.id!==current.id||value.status!==target){this.uncertain=true;this.detailError='La API no confirmó el estado. Actualiza el detalle antes de reintentar.';return;}this.selected=value;this.replace(value);this.success='Estado actualizado a '+this.status(value.status)+'.';},error:err=>{this.saving=false;this.uncertain=!err.status||err.status>=500;this.detailError=fleetError(err,'actualizar la solicitud')+(this.uncertain?' Actualiza el detalle para comprobar su estado.':'');}});
  }
  private replace(value:AdminSupportRequest):void{this.requests=this.requests.map(row=>row.id===value.id?value:row).filter(row=>!this.appliedStatus||row.status===this.appliedStatus);}
  close():void{if(this.saving)return;this.detailCancel.next();this.selected=null;this.detailLoading=false;this.detailError='';this.success='';}
  status(value:string):string{return ({open:'Abierta',in_progress:'En revisión',resolved:'Resuelta',closed:'Cerrada'} as Record<string,string>)[value]??value;}
  category(value:string):string{return this.categories.find(c=>c.code===value)?.name??value;}
  ngOnDestroy():void{this.detailCancel.next();this.detailCancel.complete();this.destroyed.next();this.destroyed.complete();}
}
