import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PassengerProfile, PassengerSale, DigitalCard, PassengerInvoice, PassengerService, passengerError } from '../../core/services/passenger.service';
@Component({selector:'app-client-panel',standalone:true,imports:[CommonModule,ReactiveFormsModule,RouterLink],templateUrl:'./client-panel.component.html',styleUrls:['./client-panel.component.css','./client-documents.component.css']})
export class ClientPanelComponent implements OnInit {
  private fb=inject(FormBuilder);private api=inject(PassengerService);private router=inject(Router);
  cardData:DigitalCard|null=null;cardQr='';cardLoading=false;cardError='';photoBusy=false;photoError='';invoice:PassengerInvoice|null=null;invoiceLoading=false;invoiceError='';private invoiceRequest=0;
  photoLink(value?:string|null):string|null{try{const url=new URL(value??'',location.origin);return value&&(url.origin===location.origin||url.protocol==='https:')?url.href:null;}catch{return null;}}
  async uploadPhoto(event:Event):Promise<void>{
    const input=event.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file||this.photoBusy)return;this.photoError='';
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){this.photoError='Selecciona JPG, PNG o WEBP de hasta 5 MB.';return;}
    this.photoBusy=true;const url=URL.createObjectURL(file);
    try{const size=await new Promise<{w:number;h:number}>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({w:image.naturalWidth,h:image.naturalHeight});image.onerror=reject;image.src=url;});if(size.w>2000||size.h>2000)throw new Error('size');}
    catch{URL.revokeObjectURL(url);this.photoBusy=false;this.photoError='La imagen debe ser válida y no superar 2000 × 2000 píxeles.';return;}
    URL.revokeObjectURL(url);
    this.api.uploadPhoto(file).subscribe({next:()=>{this.photoBusy=false;this.loadProfile();this.message='Foto guardada.';},error:err=>{this.photoBusy=false;this.photoError=passengerError(err);}});
  }
  removePhoto():void{if(this.photoBusy)return;this.photoBusy=true;this.photoError='';this.api.deletePhoto().subscribe({next:()=>{this.photoBusy=false;this.loadProfile();this.message='Foto eliminada.';},error:err=>{this.photoBusy=false;this.photoError=passengerError(err);}});}
  openCard():void{
    if(this.cardLoading)return;this.cardLoading=true;this.cardError='';this.cardQr='';
    this.api.card().subscribe({next:async card=>{this.cardData=card;try{const url=new URL(card.qr.verification_url,location.origin);if(url.origin!==location.origin||!url.pathname.endsWith('/accounts/cards/verify/')||!card.qr.token||card.qr.token===this.api.token())throw new Error();url.searchParams.set('token',card.qr.token);const qr=await import('qrcode');this.cardQr=await qr.toDataURL(url.href,{width:240,margin:4,errorCorrectionLevel:'M'});}catch{this.cardError='No se pudo generar el QR con los datos del servidor.';}this.cardLoading=false;},error:err=>{this.cardLoading=false;this.cardError=passengerError(err);}});
  }
  selectSale(sale:PassengerSale):void{const request=++this.invoiceRequest;this.selectedSale=sale;this.invoice=null;this.invoiceError='';this.invoiceLoading=true;this.api.invoice(sale.id).subscribe({next:value=>{if(request!==this.invoiceRequest)return;this.invoice=value;this.invoiceLoading=false;},error:err=>{if(request!==this.invoiceRequest)return;this.invoiceLoading=false;this.invoiceError=passengerError(err);}});}
  editing=false;page=1;readonly pageSize=7;selectedSale:PassengerSale|null=null;
  get fullName():string{return this.profile?.name||[this.profile?.first_name,this.profile?.last_name].filter(Boolean).join(' ')||'Mi cuenta';}
  get initials():string{return this.fullName.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toLocaleUpperCase();}
  get pageCount():number{return Math.max(1,Math.ceil(this.history.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visibleHistory():PassengerSale[]{return this.history.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  get issuedTickets(){return this.history.filter(s=>s.status==='paid').flatMap(s=>(s.tickets??[]).filter(t=>t.status==='issued').map(ticket=>({ticket,sale:s})));}
  scrollTo(section:'tickets'|'history'|'personal'):void{
    const target=document.getElementById(section);
    if(!target)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
  }
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  editProfile():void{if(!this.profile||this.loading||this.saving)return;this.editing=true;this.resetForm();}
  cancelEdit():void{if(this.saving)return;this.editing=false;this.resetForm();}
  private resetForm():void{const p=this.profile;if(p)this.form.reset({name:p.name??[p.first_name,p.last_name].filter(Boolean).join(' '),email:p.email,telephone:p.telephone??''});}
  pending(action:string):void{this.message=action+': integración pendiente.';}
  profile:PassengerProfile|null=null;history:PassengerSale[]=[];loading=false;saving=false;historyLoading=false;error='';historyError='';message='';
  form=this.fb.nonNullable.group({name:['',[Validators.required,Validators.pattern(/\S/),Validators.maxLength(150)]],email:['',[Validators.required,Validators.email,Validators.maxLength(50)]],telephone:['',[Validators.required,Validators.pattern(/^\+?[0-9 ()-]{7,20}$/)]]});
  ngOnInit():void{this.loadProfile();this.loadHistory();}
  loadProfile():void{if(this.loading)return;this.loading=true;this.error='';this.api.me().subscribe({next:p=>{this.profile=p;this.form.patchValue({name:p.name??[p.first_name,p.last_name].filter(Boolean).join(' '),email:p.email,telephone:p.telephone??''});this.loading=false;},error:err=>{this.loading=false;this.error=passengerError(err);}});}
  loadHistory():void{if(this.historyLoading)return;this.historyLoading=true;this.historyError='';this.api.history().subscribe({next:items=>{this.history=[...items].sort((a,b)=>b.id-a.id);this.historyLoading=false;this.page=Math.min(this.page,this.pageCount);if(this.selectedSale)this.selectedSale=this.history.find(s=>s.id===this.selectedSale?.id)??null;},error:err=>{this.historyLoading=false;this.historyError=passengerError(err);}});}
  save():void{if(this.saving||this.loading||!this.profile)return;this.form.markAllAsTouched();if(this.form.invalid)return;this.saving=true;this.message='';this.error='';const v=this.form.getRawValue();this.api.update({name:v.name.trim(),email:v.email.trim().toLowerCase(),telephone:v.telephone.trim()}).subscribe({next:p=>{this.profile=p;this.saving=false;this.editing=false;this.resetForm();this.message='Información actualizada.';},error:err=>{this.saving=false;this.error=passengerError(err);}});}
  logout():void{this.api.logout();void this.router.navigateByUrl('/clientes/login');}
  status(value:string):string{return ({paid:'Pagada',pending:'Pendiente',failed:'Fallida',expired:'Expirada',cancelled:'Cancelada'} as Record<string,string>)[value]??value;}
  link(value?:string):string|null{try{const url=new URL(value??'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
}





