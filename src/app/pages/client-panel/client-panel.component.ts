import { preparePassengerTickets } from '../../core/services/passenger-ticket-download';
import { REFUND_REQUIRED_MESSAGE } from '../../core/utils/wompi-payment';
import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
import { publicVerificationUrl } from '../../core/utils/verification-link';
import { ClientSupportComponent } from '../client-support/client-support.component';
import { ClientTicket, TicketInfo, filterClientSales, ticketGroup, ticketLabel } from './client-purchases';
import { FormsModule } from '@angular/forms';
import { Subscription, catchError, firstValueFrom, from, map, mergeMap, of, timeout } from 'rxjs';
import { createTicketPdf, ticketVerificationUrl } from '../../core/services/ticket-pdf';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PassengerProfile, PassengerSale, DigitalCard, PassengerInvoice, PassengerService, passengerError } from '../../core/services/passenger.service';
@Component({selector:'app-client-panel',standalone:true,imports:[ListOrderComponent,CommonModule,ReactiveFormsModule,FormsModule,RouterLink,RouterLinkActive,ClientSupportComponent],templateUrl:'./client-panel.component.html',styleUrls:['./client-panel.component.css','./client-documents.component.css']})
export class ClientPanelComponent implements OnInit, OnDestroy {
  readonly refundMessage=REFUND_REQUIRED_MESSAGE;
  listOrder:ListOrder='desc';
  private fb=inject(FormBuilder);private api=inject(PassengerService);private router=inject(Router);
  private route=inject(ActivatedRoute);
  readonly accountMode=this.route.snapshot.data['account']===true;
  photoFailed=false;private photoVersion=Date.now();
  get profilePhoto():string|null {if(this.photoFailed)return null;const value=this.photoLink(this.profile?.photo_url);if(!value)return null;const url=new URL(value);if(url.origin===location.origin)url.searchParams.set('v',String(this.photoVersion));return url.href;}
  cardData:DigitalCard|null=null;cardQr='';cardLoading=false;cardError='';photoBusy=false;photoError='';invoice:PassengerInvoice|null=null;invoiceLoading=false;invoiceError='';private invoiceRequest=0;
  photoLink(value?:string|null):string|null{try{const url=new URL(value??'',location.origin);if(!value||url.username||url.password)return null;if(url.host===location.host&&['http:','https:'].includes(url.protocol))return new URL(url.pathname+url.search,location.origin).href;return url.protocol==='https:'?url.href:null;}catch{return null;}}
  onPhotoError():void{
    if(this.photoFailed)return;this.photoFailed=true;
    console.warn('[Foto de perfil] El navegador no pudo mostrar la imagen',{source:'photo_url de GET /api/accounts/me/'});
  }
  retryPhoto():void{this.photoVersion=Date.now();this.photoFailed=false;}
  private photoOperationError(err:{status?:number;error?:unknown},method:'POST'|'DELETE'):void{
    const code=err.status;
    const specific:Record<number,string>={200:'El servidor respondió HTTP 200, pero no devolvió JSON válido para esta operación.',405:'El servicio no permite esta operación (HTTP 405).',413:'El servidor rechazó el tamaño del archivo (HTTP 413). El límite del servidor debe permitir la imagen enviada.',415:'El servidor no acepta el formato enviado (HTTP 415).'};
    this.photoError=code&&specific[code]?specific[code]:passengerError(err);
    if(code&&code!==200&&!this.photoError.includes('HTTP'))this.photoError+=' (HTTP '+code+').';
    console.error('[Foto de perfil] Falló la operación',{endpoint:'/api/accounts/me/photo/',method,status:code??null,responseFormat:typeof err.error==='string'?'texto':err.error&&typeof err.error==='object'?'objeto':'sin cuerpo'});
  }
  async uploadPhoto(event:Event):Promise<void>{
    const input=event.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file||this.photoBusy)return;this.photoError='';
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){this.photoError='Selecciona JPG, PNG o WEBP de hasta 5 MB.';return;}
    this.photoBusy=true;const url=URL.createObjectURL(file);
    try{const size=await new Promise<{w:number;h:number}>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({w:image.naturalWidth,h:image.naturalHeight});image.onerror=reject;image.src=url;});if(size.w>2000||size.h>2000)throw new Error('size');}
    catch{URL.revokeObjectURL(url);this.photoBusy=false;this.photoError='La imagen debe ser válida y no superar 2000 × 2000 píxeles.';return;}
    URL.revokeObjectURL(url);
    this.api.uploadPhoto(file).subscribe({next:()=>{this.photoBusy=false;this.loadProfile();this.message='Foto guardada.';},error:err=>{this.photoBusy=false;this.photoOperationError(err,'POST');}});
  }
  removePhoto():void{if(this.photoBusy)return;this.photoBusy=true;this.photoError='';this.api.deletePhoto().subscribe({next:()=>{this.photoBusy=false;this.loadProfile();this.message='Foto eliminada.';},error:err=>{this.photoBusy=false;this.photoOperationError(err,'DELETE');}});}
  openCard():void{
    if(this.cardLoading)return;this.cardLoading=true;this.cardError='';this.cardQr='';
    this.api.card().subscribe({next:async card=>{
      this.cardData=card;
      let stage='datos';
      try{
        if(typeof card?.qr?.verification_url!=='string'||!card.qr.verification_url.trim()||typeof card.qr.token!=='string'||!card.qr.token.trim())throw new Error();
        stage='url';
        const url=new URL(card.qr.verification_url,location.origin);
        if(!['http:','https:'].includes(url.protocol)||url.host!==location.host||url.username||url.password||url.pathname.replace(/\/$/,'')!=='/api/accounts/cards/verify')throw new Error();
        stage='token';
        if(card.qr.token===this.api.token())throw new Error();
        const verification=new URL('/api/accounts/cards/verify/',location.origin);
        verification.searchParams.set('token',card.qr.token);
        stage='imagen';
        const module=await import('qrcode');
        const qr=typeof module.toDataURL==='function'?module:module.default;
        this.cardQr=await qr.toDataURL(publicVerificationUrl(verification.href,location.origin,this.api.token()),{width:240,margin:4,errorCorrectionLevel:'M'});
      }catch{
        const messages:Record<string,string>={datos:'El carné recibido no incluye qr.verification_url y qr.token válidos.',url:'La URL de verificación del carné debe pertenecer a este portal y apuntar a /api/accounts/cards/verify/.',token:'El servidor devolvió el token de sesión como token del carné. No se puede usar para generar el QR.',imagen:'No se pudo dibujar el QR en el navegador. Intenta abrir el carné nuevamente.'};
        this.cardError=messages[stage]??'No se pudo generar el QR.';
        console.error('[Carné digital] No se pudo generar el QR',{endpoint:'GET /api/accounts/me/card/',stage,verificationUrlPresent:typeof card?.qr?.verification_url==='string',cardTokenPresent:typeof card?.qr?.token==='string'});
      }finally{this.cardLoading=false;}
    },error:err=>{this.cardLoading=false;this.cardError=passengerError(err);}});
  }
  pdfBusy=false;pdfError='';
  get canDownloadTickets():boolean{return this.selectedSale?.status==='paid'&&!!this.selectedSale.tickets?.some(t=>(this.ticketInfo[t.ticket_code]?.status??t.status)==='issued');}
  async downloadTickets():Promise<void>{
    const id=this.selectedSale?.id;if(!id||this.pdfBusy||!this.canDownloadTickets)return;
    this.pdfBusy=true;this.pdfError='';
    try{
      const {entries}=await preparePassengerTickets(this.api,id,location.origin);
      const pdf=await createTicketPdf(id,entries);
      pdf.save(`boletas-compra-${id}.pdf`);
    }catch(err){
      this.pdfError=err instanceof Error?err.message:passengerError(err as {status?:number;error?:unknown});
    }finally{this.pdfBusy=false;}
  }
  resendBusy=false;resendMessage='';resendError='';private resendVersion=0;resentSales=new Set<number>();private resendTimers:Array<ReturnType<typeof setTimeout>>=[];
  resendEmail(sale:PassengerSale):void{
    if(this.resendBusy||sale.status!=='paid'||this.resentSales.has(sale.id))return;
    const version=++this.resendVersion;this.resendBusy=true;this.resendError='';this.resendMessage='';
    this.api.resendConfirmation(sale.id).pipe(timeout(20000)).subscribe({next:()=>{if(version!==this.resendVersion)return;this.resentSales.add(sale.id);this.resendTimers.push(setTimeout(()=>this.resentSales.delete(sale.id),60000));this.resendBusy=false;this.resendMessage='Se solicitó el envío al correo registrado. Revisa también el correo no deseado.';},error:err=>{if(version!==this.resendVersion)return;this.resendBusy=false;this.resendError=err.error?.code==='email_unavailable'?'El servicio de correo no está disponible. Tu pago y tus boletas siguen vigentes; puedes descargar el PDF.':passengerError(err);}});
  }
  detailLoading=false;detailError='';
  closeSale():void{this.invoiceRequest++;this.selectedSale=null;this.resendVersion++;this.resendBusy=false;this.invoiceLoading=false;this.detailLoading=false;}
  selectSale(sale:PassengerSale):void{const request=++this.invoiceRequest;this.selectedSale=sale;this.resendVersion++;this.resendBusy=false;this.resendMessage='';this.resendError='';this.pdfError='';this.detailError='';this.detailLoading=true;
    setTimeout(()=>{const target=document.getElementById('purchase-detail');target?.scrollIntoView({behavior:'smooth',block:'start'});target?.focus({preventScroll:true});});
    this.api.sale(sale.id).subscribe({next:value=>{if(request!==this.invoiceRequest)return;this.selectedSale=value;if(value.status==='refund_required'){this.invoice=null;this.invoiceLoading=false;}this.detailLoading=false;},error:err=>{if(request!==this.invoiceRequest)return;this.detailLoading=false;this.detailError=passengerError(err);}});
    if(sale.status==='refund_required'){this.invoice=null;this.invoiceError='';this.invoiceLoading=false;return;}
    this.invoice=sale.factus_invoice??null;this.invoiceError='';this.invoiceLoading=true;this.api.invoice(sale.id).subscribe({next:value=>{if(request!==this.invoiceRequest||this.selectedSale?.status==='refund_required')return;this.invoice=value;this.invoiceLoading=false;},error:err=>{if(request!==this.invoiceRequest)return;this.invoiceLoading=false;this.invoiceError=passengerError(err);}});}
  ticketInfo:TicketInfo={};metadataLoading=false;metadataError='';private metadataSubscription?:Subscription;
  ticketFilter='all';historyStatus='';historyFrom='';historyTo='';historySearch='';
  get filteredHistory(){return orderRecords(filterClientSales(this.history,{status:this.historyStatus,from:this.historyFrom,to:this.historyTo,search:this.historySearch},this.ticketInfo),this.listOrder);}
  get allTickets(){return this.history.filter(sale=>sale.status!=='refund_required').flatMap(sale=>(sale.tickets??[]).map(ticket=>({ticket,sale})));}
  get visibleTickets(){return this.allTickets.filter(({ticket})=>this.ticketFilter==='all'||(this.ticketFilter==='issued'?(this.ticketInfo[ticket.ticket_code]?.status??ticket.status)==='issued':ticketGroup(ticket,this.ticketInfo)===this.ticketFilter)).sort((a,b)=>{const x=Date.parse(this.ticketInfo[a.ticket.ticket_code]?.trip.date_time_start??''),y=Date.parse(this.ticketInfo[b.ticket.ticket_code]?.trip.date_time_start??'');return (Number.isFinite(x)?x:Infinity)-(Number.isFinite(y)?y:Infinity);});}
  ticketRoute(ticket:ClientTicket):string{return ticketLabel(ticket,this.ticketInfo);}
  ticketSeat(ticket:ClientTicket):string{return this.ticketInfo[ticket.ticket_code]?.seat.seat_number??'Sin número disponible';}
  ticketState(ticket:ClientTicket):string{return ({issued:'Emitido',used:'Utilizado',cancelled:'Cancelado'} as Record<string,string>)[this.ticketInfo[ticket.ticket_code]?.status??ticket.status]??ticket.status;}
  clearHistoryFilters():void{this.historyStatus='';this.historyFrom='';this.historyTo='';this.historySearch='';this.page=1;}
  saleRoute(sale:PassengerSale):string{return sale.tickets?.[0]?this.ticketRoute(sale.tickets[0]):'Sin viaje disponible';}
  loadTicketInfo():void{
    this.metadataSubscription?.unsubscribe();this.metadataLoading=true;this.metadataError='';let failures=0;
    const tickets=[...new Map(this.allTickets.map(v=>[v.ticket.ticket_code,v.ticket])).values()];
    this.metadataSubscription=from(tickets).pipe(mergeMap(ticket=>{
      try{const url=ticketVerificationUrl(ticket.verification_url,location.origin,this.api.token());
        return this.api.verifyTicket(url.href).pipe(timeout(15000),map(info=>{if(info.ticket_code!==ticket.ticket_code||info.trip?.id!==ticket.trip||info.seat?.id!==ticket.seat)throw new Error();return {code:ticket.ticket_code,info};}),catchError(()=>{failures++;return of(null);}));
      }catch{failures++;return of(null);}
    },4)).subscribe({next:value=>{if(value)this.ticketInfo={...this.ticketInfo,[value.code]:value.info};},complete:()=>{this.metadataLoading=false;if(failures)this.metadataError='No se pudieron consultar los datos de '+failures+' tiquetes. Puedes reintentar; tus compras siguen disponibles.';}});
  }
  ngOnDestroy():void{this.metadataSubscription?.unsubscribe();this.invoiceRequest++;this.resendVersion++;for(const timer of this.resendTimers)clearTimeout(timer);}
  editing=false;page=1;readonly pageSize=7;selectedSale:PassengerSale|null=null;
  get fullName():string{return this.profile?.name||[this.profile?.first_name,this.profile?.last_name].filter(Boolean).join(' ')||'Mi cuenta';}
  get initials():string{return this.fullName.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toLocaleUpperCase();}
  get pageCount():number{return Math.max(1,Math.ceil(this.filteredHistory.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visibleHistory():PassengerSale[]{return this.filteredHistory.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  get issuedTickets(){return this.history.filter(s=>s.status==='paid').flatMap(s=>(s.tickets??[]).filter(t=>(this.ticketInfo[t.ticket_code]?.status??t.status)==='issued').map(ticket=>({ticket,sale:s})));}
  scrollTo(section:'tickets'|'history'|'personal'|'support'):void{
    const target=document.getElementById(section);
    if(!target)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
  }
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  editProfile():void{if(this.passwordChangeRequired)return;if(!this.profile||this.loading||this.saving)return;this.editing=true;this.resetForm();}
  cancelEdit():void{if(this.saving)return;this.editing=false;this.resetForm();}
  private resetForm():void{const p=this.profile;if(p)this.form.reset({name:p.name??[p.first_name,p.last_name].filter(Boolean).join(' '),email:p.email,telephone:p.telephone??''});}
  pending(action:string):void{this.message=action+': integración pendiente.';}
  profile:PassengerProfile|null=null;history:PassengerSale[]=[];loading=false;saving=false;historyLoading=false;error='';historyError='';message='';
  form=this.fb.nonNullable.group({name:['',[Validators.required,Validators.pattern(/\S/),Validators.maxLength(150)]],email:['',[Validators.required,Validators.email,Validators.maxLength(50)]],telephone:['',[Validators.required,Validators.pattern(/^\+?[0-9 ()-]{7,20}$/)]]});
  ngOnInit():void{if(!this.accountMode && this.route.snapshot.fragment === 'personal'){void this.router.navigateByUrl('/clientes/mi-cuenta',{replaceUrl:true});return;}this.loadProfile();if(!this.accountMode)this.loadHistory();}
  loadProfile():void{if(this.loading)return;this.loading=true;this.error='';this.api.me().subscribe({next:p=>{this.profile=p;this.photoFailed=false;this.photoVersion=Date.now();this.form.patchValue({name:p.name??[p.first_name,p.last_name].filter(Boolean).join(' '),email:p.email,telephone:p.telephone??''});this.loading=false;},error:err=>{this.loading=false;this.error=passengerError(err);}});}
  loadHistory():void{if(this.historyLoading)return;this.historyLoading=true;this.historyError='';this.api.history().subscribe({next:items=>{this.history=[...items].sort((a,b)=>b.id-a.id);this.historyLoading=false;this.loadTicketInfo();this.page=Math.min(this.page,this.pageCount);if(this.selectedSale)this.selectedSale=this.history.find(s=>s.id===this.selectedSale?.id)??null;},error:err=>{this.historyLoading=false;this.historyError=passengerError(err);}});}
  get passwordChangeRequired():boolean{return this.api.mustChangePassword();}
  save():void{if(this.passwordChangeRequired)return;if(this.saving||this.loading||!this.profile)return;this.form.markAllAsTouched();if(this.form.invalid)return;this.saving=true;this.message='';this.error='';const v=this.form.getRawValue();this.api.update({name:v.name.trim(),email:v.email.trim().toLowerCase(),telephone:v.telephone.trim()}).subscribe({next:p=>{this.profile=p;this.saving=false;this.editing=false;this.resetForm();this.message='Información actualizada.';},error:err=>{this.saving=false;this.error=passengerError(err);}});}
  loggingOut=false;
  logout():void{if(this.loggingOut)return;this.loggingOut=true;this.api.signOut().subscribe(()=>{if(!this.api.token())void this.router.navigateByUrl('/clientes/login');});}
  status(value:string):string{return ({refund_required:'Pago recibido · Requiere atención',paid:'Pagada',pending:'Pendiente',failed:'Fallida',expired:'Expirada',cancelled:'Cancelada'} as Record<string,string>)[value]??value;}
  link(value?:string):string|null{try{const url=new URL(value??'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
}
