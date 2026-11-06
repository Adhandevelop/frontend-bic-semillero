import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
﻿import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BusType, BusTypeService } from '../../core/services/bus-type.service';
@Component({selector:'app-bus-types',standalone:true,imports:[ListOrderComponent,CommonModule,ReactiveFormsModule,RouterLink],templateUrl:'./bus-types.component.html',styleUrl:'./bus-types.component.css'})
export class BusTypesComponent implements OnInit {
  listOrder:ListOrder='desc';
  get orderedRecords(){return orderRecords(this.types,this.listOrder);}
  private api=inject(BusTypeService);private fb=inject(FormBuilder);
  types:BusType[]=[];loading=false;saving=false;deletingId:number|null=null;editingId:number|null=null;error='';success='';
  form=this.fb.nonNullable.group({name:['',[Validators.required,Validators.pattern(/\S/)]],code:['',[Validators.required,Validators.pattern(/\S/)]],max_capacity:[1,[Validators.required,Validators.min(1),Validators.pattern(/^\d+$/)]]});
  ngOnInit():void{this.load();}
  load():void{if(this.loading||this.saving||this.deletingId!==null)return;this.loading=true;this.error='';this.api.list().subscribe({next:types=>{this.types=types;this.loading=false;},error:err=>{this.loading=false;this.fail(err);}});}
  edit(type:BusType):void{if(this.saving||this.deletingId!==null)return;this.editingId=type.id;this.form.reset({name:type.name,code:type.code,max_capacity:type.max_capacity});this.error='';this.success='';}
  reset():void{if(this.saving)return;this.editingId=null;this.form.reset({name:'',code:'',max_capacity:1});}
  save():void{if(this.saving||this.loading||this.deletingId!==null)return;this.form.markAllAsTouched();if(this.form.invalid)return;const v=this.form.getRawValue();this.saving=true;this.error='';this.success='';const data={name:v.name.trim(),code:v.code.trim(),max_capacity:v.max_capacity};(this.editingId?this.api.update(this.editingId,data):this.api.create(data)).subscribe({next:type=>{this.types=this.editingId?this.types.map(t=>t.id===type.id?type:t):[...this.types,type];this.saving=false;this.reset();this.success='Tipo de bus guardado.';},error:err=>{this.saving=false;this.fail(err);}});}
  remove(type:BusType):void{if(this.saving||this.loading||this.deletingId!==null||!confirm('¿Eliminar el tipo '+type.name+'? El servidor validará si está asociado a buses.'))return;this.deletingId=type.id;this.error='';this.success='';this.api.remove(type.id).subscribe({next:()=>{this.types=this.types.filter(t=>t.id!==type.id);this.deletingId=null;if(this.editingId===type.id)this.reset();this.success='Tipo eliminado.';},error:err=>{this.deletingId=null;this.fail(err);}});}
  private fail(err:{status?:number;error?:unknown}):void{const fields=['name','code','max_capacity','detail','non_field_errors'];const messages=err.error&&typeof err.error==='object'?Object.entries(err.error).filter(([key])=>fields.includes(key)).flatMap(([,v])=>Array.isArray(v)?v:typeof v==='string'?[v]:[]):[];this.error=messages.filter(v=>typeof v==='string').join(' ')||(err.status===403?'No tienes permisos para administrar tipos de bus.':'No se pudo completar la operación'+(err.status?' (HTTP '+err.status+')':'')+'.');}
}
