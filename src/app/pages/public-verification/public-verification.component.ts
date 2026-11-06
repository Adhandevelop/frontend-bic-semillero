import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, combineLatest, takeUntil, timeout } from 'rxjs';
import { VerifiedTicket } from '../../core/services/ticket-pdf';
interface PublicCard {valid:boolean;status:string;name?:string;card_id?:string;valid_until?:string|null;validity?:string;}
@Component({standalone:true,imports:[CommonModule,RouterLink],templateUrl:'./public-verification.component.html',styleUrl:'./public-verification.component.css'})
export class PublicVerificationComponent implements OnInit,OnDestroy {
  private route=inject(ActivatedRoute);private http=new HttpClient(inject(HttpBackend));private destroyed=new Subject<void>();private changed=new Subject<void>();private token='';
  kind:'ticket'|'card'='ticket';loading=false;error='';ticket:VerifiedTicket|null=null;card:PublicCard|null=null;checkedAt:Date|null=null;
  get valid():boolean{return this.kind==='ticket'?this.ticket?.valid===true&&this.ticket.status==='issued':this.card?.valid===true&&this.card.status==='active';}
  get title():string{return this.kind==='ticket'?'Verificación de boleta':'Verificación de carné';}
  get state():string{const state=this.ticket?.status??this.card?.status??'';return ({issued:'Emitida',used:'Ya utilizada',cancelled:'Cancelada',expired:'Vencida',active:'Activo',revoked:'Revocado',inactive:'Inactivo'} as Record<string,string>)[state]||'Estado no reconocido';}
  get statusMessage():string{if(this.valid)return this.kind==='ticket'?'Boleta válida según el servidor':'Carné activo según el servidor';return this.kind==='ticket'?'Esta boleta no está habilitada para abordar':'Este carné no está habilitado';}
  get cardDate():string|null{const date=this.card?.valid_until;return date&&Number.isFinite(Date.parse(date))?date:null;}
  ngOnInit():void{combineLatest([this.route.data,this.route.fragment]).pipe(takeUntil(this.destroyed)).subscribe(([data,fragment])=>{
    this.kind=data['kind']==='card'?'card':'ticket';const params=new URLSearchParams(fragment??'');this.token=params.getAll('token').length===1?params.get('token')??'':'';this.load();
  });}
  load():void{
    this.changed.next();this.loading=false;this.ticket=null;this.card=null;this.error='';this.checkedAt=null;
    if(!this.token.trim()||this.token.length>4096){this.error='El enlace está incompleto. Vuelve a escanear el QR del documento.';return;}
    this.loading=true;const kind=this.kind;
    this.http.get<VerifiedTicket & PublicCard>(kind==='ticket'?'/api/sales/tickets/verify/':'/api/accounts/cards/verify/',{params:{token:this.token},headers:{Accept:'application/json'}}).pipe(timeout(20000),takeUntil(this.changed),takeUntil(this.destroyed)).subscribe({next:data=>{
      this.loading=false;
      if(!data||typeof data.valid!=='boolean'||typeof data.status!=='string'||(kind==='ticket'&&(!data.trip?.id||!data.seat?.seat_number||!data.passenger||!data.ticket_code))){this.error='El servidor no devolvió una verificación completa. Intenta consultar nuevamente.';return;}
      if(kind==='ticket')this.ticket=data;else this.card=data;this.checkedAt=new Date();
    },error:err=>{this.loading=false;this.error=err.status===404?'El documento no se pudo verificar. El enlace puede ser inválido, haber vencido o no existir.':err.status===400?'El enlace de verificación no es válido. Vuelve a escanear el QR.':'No se pudo conectar con el servicio de verificación. No hay una confirmación de validez; intenta nuevamente.';}});
  }
  ngOnDestroy():void{this.token='';this.changed.next();this.changed.complete();this.destroyed.next();this.destroyed.complete();}
}
