import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, timeout } from 'rxjs';
import { CustomerSupportService, CustomerServiceInfo, SupportRequest } from '../../core/services/customer-support.service';
import { PassengerSale, passengerError } from '../../core/services/passenger.service';
@Component({selector:'app-client-support',standalone:true,imports:[CommonModule,ReactiveFormsModule],templateUrl:'./client-support.component.html',styleUrl:'./client-support.component.css'})
export class ClientSupportComponent implements OnInit, OnDestroy {
  @Input() sales:PassengerSale[]=[];
  private api=inject(CustomerSupportService);private fb=inject(FormBuilder);private destroyed=new Subject<void>();private timer?:ReturnType<typeof setInterval>;private detailVersion=0;
  contact:CustomerServiceInfo|null=null;contactError='';contactLoading=false;requests:SupportRequest[]=[];loading=false;saving=false;error='';success='';cooldown=0;page=1;selected:SupportRequest|null=null;detailLoading=false;detailError='';
  readonly categories=[{code:'payment',name:'Pago'},{code:'invoice',name:'Factura'},{code:'ticket',name:'Tiquete'},{code:'change',name:'Cambio de viaje'},{code:'cancellation',name:'Cancelación'},{code:'account',name:'Mi cuenta'},{code:'other',name:'Otro'}];
  form=this.fb.nonNullable.group({category:['payment',Validators.required],sale:[null as number|null],subject:['',[Validators.required,Validators.pattern(/\S/),Validators.maxLength(150)]],message:['',[Validators.required,Validators.pattern(/\S/),Validators.maxLength(5000)]]});
  get pageCount(){return Math.max(1,Math.ceil(this.requests.length/7));}get currentPage(){return Math.min(this.page,this.pageCount);}get visibleRequests(){return this.requests.slice((this.currentPage-1)*7,this.currentPage*7);}
  ngOnInit():void{this.loadContact();this.load();}
  loadContact():void{if(this.contactLoading)return;this.contactLoading=true;this.contactError='';this.api.contact().pipe(timeout(15000),takeUntil(this.destroyed)).subscribe({next:value=>{this.contact=value;this.contactLoading=false;},error:err=>{this.contactLoading=false;this.contactError=passengerError(err);}});}
  load():void{if(this.loading)return;this.loading=true;this.error='';this.api.list().pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:values=>{this.requests=values;this.loading=false;this.page=Math.min(this.page,this.pageCount);},error:err=>{this.loading=false;this.error=passengerError(err);}});}
  send():void{
    if(this.saving||this.cooldown)return;this.form.markAllAsTouched();if(this.form.invalid){this.error='Completa categoría, asunto y descripción.';return;}
    const v=this.form.getRawValue();if(v.sale!==null&&!this.sales.some(s=>s.id===v.sale)){this.error='Selecciona una compra de tu historial.';return;}
    this.saving=true;this.error='';this.success='';
    this.api.create({category:v.category,subject:v.subject.trim(),message:v.message.trim(),...(v.sale!==null?{sale:v.sale}:{})}).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:value=>{this.saving=false;this.success='Solicitud registrada: '+value.reference+'. Puedes consultar su estado aquí.';this.requests=[value,...this.requests.filter(r=>r.id!==value.id)];this.page=1;this.form.reset({category:'payment',sale:null,subject:'',message:''});this.wait();},error:err=>{this.saving=false;this.error=passengerError(err);if(err.status===429)this.wait();if(!err.status||err.status>=500)this.error+=' Actualiza tus solicitudes para comprobar si se registró antes de volver a enviarla.';}});
  }
  private wait():void{if(this.timer)clearInterval(this.timer);this.cooldown=60;this.timer=setInterval(()=>{if(--this.cooldown<=0&&this.timer){clearInterval(this.timer);this.timer=undefined;}},1000);}
  show(request:SupportRequest):void{const version=++this.detailVersion;this.selected=request;this.detailLoading=true;this.detailError='';this.api.detail(request.id).pipe(timeout(15000),takeUntil(this.destroyed)).subscribe({next:value=>{if(version!==this.detailVersion)return;this.selected=value;this.detailLoading=false;},error:err=>{if(version!==this.detailVersion)return;this.detailLoading=false;this.detailError=passengerError(err);}});}
  close():void{this.detailVersion++;this.selected=null;this.detailLoading=false;}
  status(value:string):string{return ({open:'Abierta',in_progress:'En revisión',resolved:'Resuelta',closed:'Cerrada'} as Record<string,string>)[value]??value;}
  category(value:string):string{return this.categories.find(c=>c.code===value)?.name??value;}
  safeLink(value?:string|null):string|null{try{const u=new URL(value??'');return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
  email(value?:string|null):string|null{return value&&/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(value)?'mailto:'+encodeURIComponent(value):null;}
  phone(value?:string|null):string|null{const number=value?.replace(/[ ()-]/g,'')??'';return /^\+?\d{7,15}$/.test(number)?'tel:'+number:null;}
  whatsapp(value?:string|null):string|null{if(!value)return null;const number=value.replace(/[ ()+-]/g,'');if(/^\d{7,15}$/.test(number))return 'https://wa.me/'+number;const link=this.safeLink(value);if(!link)return null;const host=new URL(link).hostname;return ['wa.me','api.whatsapp.com','web.whatsapp.com'].includes(host)?link:null;}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();if(this.timer)clearInterval(this.timer);}
}
