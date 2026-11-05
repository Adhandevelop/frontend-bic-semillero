import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil, timeout } from 'rxjs';
import { VerifiedTicket } from '../../core/services/ticket-pdf';

interface VerifiedCard {valid:boolean;name?:string;status:string;card_id?:string;valid_until?:string|null;validity?:string;}
export function parseVerificationQr(value:string,origin:string):{path:string;token:string;kind:'ticket'|'card'} {
  if(value.length>4096)throw new Error('El QR es demasiado largo.');
  let url:URL;try{url=new URL(value.trim(),origin);}catch{throw new Error('Introduce un enlace de verificación válido.');}
  const kind=url.pathname==='/api/sales/tickets/verify/'?'ticket':url.pathname==='/api/accounts/cards/verify/'?'card':null;
  const token=url.searchParams.get('token');
  if(!kind||url.origin!==new URL(origin).origin||url.username||url.password||url.hash||!token?.trim()||url.searchParams.getAll('token').length!==1)throw new Error('El QR debe ser un enlace de verificación de este portal.');
  return {path:url.pathname,token,kind};
}
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./qr-reader.component.html',styleUrl:'./qr-reader.component.css'})
export class QrReaderComponent implements OnDestroy {
  private http=inject(HttpClient);private zone=inject(NgZone);private route=inject(ActivatedRoute);private destroyed=new Subject<void>();
  @ViewChild('qrInput') qrInput?:ElementRef<HTMLInputElement>;
  @ViewChild('preview',{static:true}) preview!:ElementRef<HTMLVideoElement>;
  input='';expectedTrip=this.route.snapshot.queryParamMap.get('trip')||'';busy=false;camera=false;error='';message='';ticket:VerifiedTicket|null=null;card:VerifiedCard|null=null;kind:'ticket'|'card'|null=null;queriedAt:Date|null=null;
  get contextTripId():number|null{const raw=this.route.snapshot.queryParamMap.get('trip');const value=Number(raw);return raw&&/^[1-9]\d*$/.test(raw)&&Number.isSafeInteger(value)?value:null;}
  private controls:{stop():void}|null=null;private generation=0;private gone=false;
  async startCamera():Promise<void>{
    if(this.busy||this.camera)return;this.clearResult();this.input='';this.stopCamera();this.error='';this.camera=true;const generation=this.generation;
    try{
      const {BrowserQRCodeReader}=await import('@zxing/browser');if(this.gone||generation!==this.generation)return;
      const controls=await new BrowserQRCodeReader().decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},this.preview.nativeElement,(result,_error,controls)=>{
        if(result&&this.camera&&!this.busy){controls.stop();this.zone.run(()=>{this.input=result.getText();this.verify();});}
      });
      if(this.gone||generation!==this.generation)controls.stop();else this.controls=controls;
    }catch{if(!this.gone&&generation===this.generation){this.stopCamera();this.error='No se pudo acceder a la cámara. Revisa el permiso o pega el enlace del QR.';}}
  }
  stopCamera():void{this.generation++;this.camera=false;this.controls?.stop();this.controls=null;const video=this.preview?.nativeElement;const stream=video?.srcObject;if(stream instanceof MediaStream)stream.getTracks().forEach(track=>track.stop());if(video)video.srcObject=null;}
  private clearResult():void{this.ticket=null;this.card=null;this.kind=null;this.queriedAt=null;this.error='';this.message='';}
  resetReader():void{if(this.busy)return;this.stopCamera();this.clearResult();this.input='';this.qrInput?.nativeElement.focus();}
  get outcome():'success'|'warning'|'danger'{if(this.error)return 'danger';if(this.card)return this.card.valid&&this.card.status==='active'?'success':'danger';if(this.ticket)return this.matches?'success':!this.ticket.valid||this.ticket.status!=='issued'||!!this.expectedTrip?'danger':'warning';return 'warning';}
  verify():void{
    if(this.busy)return;this.stopCamera();this.clearResult();
    let qr:ReturnType<typeof parseVerificationQr>;
    try{qr=parseVerificationQr(this.input,window.location.origin);if(this.expectedTrip&&(!/^\d+$/.test(this.expectedTrip)||!Number.isSafeInteger(Number(this.expectedTrip))||Number(this.expectedTrip)<1))throw new Error('Selecciona un identificador de viaje válido.');}catch(err){this.error=err instanceof Error?err.message:'QR no válido.';return;}
    this.input='';this.busy=true;this.kind=qr.kind;
    this.http.get<VerifiedTicket & VerifiedCard>(qr.path,{params:{token:qr.token}}).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:data=>{
      this.busy=false;
      if(!data||typeof data.valid!=='boolean'||typeof data.status!=='string'){this.error='La respuesta de verificación no es válida.';return;}
      this.queriedAt=new Date();
      if(qr.kind==='card'){this.card=data;this.message=data.valid&&data.status==='active'?'Carné válido como identificación. No acredita una boleta.':'Carné no válido: '+this.status(data.status)+'. No acredita una boleta.';return;}
      if(!Number.isSafeInteger(data.trip?.id)||data.trip.id<1||!data.seat?.seat_number||!data.ticket_code||!data.passenger){this.error='El servidor devolvió una boleta incompleta.';return;}
      this.ticket=data;
      this.message=!data.valid||data.status!=='issued'?'La boleta no está habilitada: '+this.status(data.status)+'.':this.expectedTrip&&data.trip.id!==Number(this.expectedTrip)?'La boleta corresponde a otro viaje.':this.expectedTrip?'Boleta emitida y correspondiente al viaje seleccionado.':'Boleta emitida. Indica el viaje esperado para comprobar que corresponde.';
    },error:err=>{this.busy=false;this.error=err.status===404?'El servidor no pudo verificar el QR: enlace no válido o documento no encontrado. Si el token venció, solicita un QR actualizado.':err.status===400?'El servidor rechazó el QR.':'No se pudo consultar la verificación'+(err.status?' (HTTP '+err.status+')':'')+'. No hay una validación confirmada.';}});
  }
  get matches():boolean{return !!this.ticket?.valid&&this.ticket.status==='issued'&&!!this.expectedTrip&&this.ticket.trip.id===Number(this.expectedTrip);}
  status(value:string):string{return ({issued:'Emitida',used:'Ya utilizada',cancelled:'Cancelada',active:'Activo',expired:'Vencida',revoked:'Revocado',inactive:'Inactivo'} as Record<string,string>)[value]||value;}
  ngOnDestroy():void{this.gone=true;this.stopCamera();this.destroyed.next();this.destroyed.complete();}
}
