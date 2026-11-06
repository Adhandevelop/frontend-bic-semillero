import { parseVerificationLink } from '../../core/utils/verification-link';
import { TicketCheckInService, CheckInResult } from '../../core/services/ticket-check-in.service';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil, timeout } from 'rxjs';
import { VerifiedTicket } from '../../core/services/ticket-pdf';

interface VerifiedCard {valid:boolean;name?:string;status:string;card_id?:string;valid_until?:string|null;validity?:string;}
export const parseVerificationQr=parseVerificationLink;

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./qr-reader.component.html',styleUrl:'./qr-reader.component.css'})
export class QrReaderComponent implements OnDestroy {
  private http=inject(HttpClient);private zone=inject(NgZone);private route=inject(ActivatedRoute);private destroyed=new Subject<void>();
  @ViewChild('qrInput') qrInput?:ElementRef<HTMLInputElement>;
  @ViewChild('preview',{static:true}) preview!:ElementRef<HTMLVideoElement>;
  input='';expectedTrip=this.route.snapshot.queryParamMap.get('trip')||'';busy=false;camera=false;error='';message='';ticket:VerifiedTicket|null=null;card:VerifiedCard|null=null;kind:'ticket'|'card'|null=null;queriedAt:Date|null=null;
  get contextTripId():number|null{const raw=this.route.snapshot.queryParamMap.get('trip');const value=Number(raw);return raw&&/^[1-9]\d*$/.test(raw)&&Number.isSafeInteger(value)?value:null;}
  private checkInApi=inject(TicketCheckInService);private verificationToken='';
  private attempt:{body:{verification_token:string;trip:number};key:string}|null=null;
  boarding=false;boardingUncertain=false;boardingError='';boardingRejected=false;checkIn:CheckInResult|null=null;
  get readerLocked():boolean{return this.busy||this.boarding||this.boardingUncertain;}
  get canBoard():boolean{return this.matches&&this.kind==='ticket'&&!!this.verificationToken&&!this.readerLocked&&!this.boardingRejected&&!this.checkIn;}
  confirmBoarding():void{
    if(!this.canBoard)return;
    if(!globalThis.confirm('¿Confirmas el abordaje de la silla '+this.ticket!.seat.seat_number+' para el viaje #'+this.expectedTrip+'? La boleta quedará utilizada.'))return;
    this.attempt={body:{verification_token:this.verificationToken,trip:Number(this.expectedTrip)},key:crypto.randomUUID()};this.sendBoarding();
  }
  retryBoarding():void{if(this.boardingUncertain&&!this.boarding&&this.attempt)this.sendBoarding();}
  private sendBoarding():void{
    if(!this.attempt||this.boarding||!this.ticket)return;
    this.boarding=true;this.boardingError='';const attempt=this.attempt;const ticket=this.ticket;
    this.checkInApi.confirm(attempt.body,attempt.key).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:result=>{
      this.boarding=false;
      if(result?.status!=='used'||result.ticket_code!==ticket.ticket_code||result.trip!==attempt.body.trip||result.seat?.id!==ticket.seat.id||!Number.isSafeInteger(result.check_in?.id)||!Number.isFinite(Date.parse(result.check_in?.checked_in_at))||!result.check_in?.checked_in_by){this.boardingUncertain=true;this.boardingError='La respuesta no confirma de forma completa este abordaje. Reintenta el mismo intento o consulta el tiquete.';return;}
      this.checkIn=result;this.ticket={...ticket,status:'used',valid:false};this.boardingUncertain=false;this.verificationToken='';this.attempt=null;
    },error:err=>{
      this.boarding=false;const code=err.error?.code;
      const messages:Record<string,string>={invalid_request:'El servidor rechazó los datos del abordaje.',permission_denied:'No tienes permiso para registrar abordajes.',invalid_ticket:'El QR no corresponde a una boleta válida o ha vencido.',wrong_trip:'La boleta pertenece a otro viaje.',already_used:'Esta boleta ya tiene un abordaje registrado. No se registró un nuevo abordaje.',ticket_cancelled:'La boleta está cancelada.',sale_not_paid:'La venta no está pagada.',trip_not_boardable:'El viaje no admite abordaje en su estado actual.'};
      if(typeof code==='string'&&messages[code]){
        this.boardingError=messages[code];this.boardingRejected=true;this.boardingUncertain=false;this.attempt=null;this.verificationToken='';
        if(code==='already_used')this.ticket={...ticket,status:'used',valid:false};if(code==='ticket_cancelled')this.ticket={...ticket,status:'cancelled',valid:false};
      }else{this.boardingUncertain=true;this.boardingError=err.status===401?'La sesión venció. El resultado sigue sin confirmar; no registres otro intento.':code==='idempotency_conflict'?'La clave tiene un conflicto. Consulta el tiquete antes de continuar; no se confirma el abordaje.':'Resultado sin confirmar. Reintenta con la misma clave para recuperar el resultado sin duplicar el abordaje.';}
    }});
  }
  private controls:{stop():void}|null=null;private generation=0;private gone=false;
  async startCamera():Promise<void>{
    if(this.readerLocked||this.camera)return;this.clearResult();this.input='';this.stopCamera();this.error='';this.camera=true;const generation=this.generation;
    try{
      const {BrowserQRCodeReader}=await import('@zxing/browser');if(this.gone||generation!==this.generation)return;
      const controls=await new BrowserQRCodeReader().decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'}}},this.preview.nativeElement,(result,_error,controls)=>{
        if(result&&this.camera&&!this.busy){controls.stop();this.zone.run(()=>{this.input=result.getText();this.verify();});}
      });
      if(this.gone||generation!==this.generation)controls.stop();else this.controls=controls;
    }catch{if(!this.gone&&generation===this.generation){this.stopCamera();this.error='No se pudo acceder a la cámara. Revisa el permiso o pega el enlace del QR.';}}
  }
  stopCamera():void{this.generation++;this.camera=false;this.controls?.stop();this.controls=null;const video=this.preview?.nativeElement;const stream=video?.srcObject;if(stream instanceof MediaStream)stream.getTracks().forEach(track=>track.stop());if(video)video.srcObject=null;}
  private clearResult():void{this.verificationToken='';this.attempt=null;this.checkIn=null;this.boardingError='';this.boardingRejected=false;this.boardingUncertain=false;this.ticket=null;this.card=null;this.kind=null;this.queriedAt=null;this.error='';this.message='';}
  resetReader():void{if(this.readerLocked)return;this.stopCamera();this.clearResult();this.input='';this.qrInput?.nativeElement.focus();}
  get outcome():'success'|'warning'|'danger'{if(this.checkIn)return 'success';if(this.boardingUncertain)return 'warning';if(this.boardingError)return 'danger';if(this.error)return 'danger';if(this.card)return this.card.valid&&this.card.status==='active'?'success':'danger';if(this.ticket)return this.matches?'success':!this.ticket.valid||this.ticket.status!=='issued'||!!this.expectedTrip?'danger':'warning';return 'warning';}
  verify():void{
    if(this.readerLocked)return;this.stopCamera();this.clearResult();
    let qr:ReturnType<typeof parseVerificationQr>;
    try{qr=parseVerificationQr(this.input,window.location.origin);if(this.expectedTrip&&(!/^\d+$/.test(this.expectedTrip)||!Number.isSafeInteger(Number(this.expectedTrip))||Number(this.expectedTrip)<1))throw new Error('Selecciona un identificador de viaje válido.');}catch(err){this.error=err instanceof Error?err.message:'QR no válido.';return;}
    this.input='';this.busy=true;this.kind=qr.kind;
    this.http.get<VerifiedTicket & VerifiedCard>(qr.path,{params:{token:qr.token}}).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:data=>{
      this.busy=false;
      if(!data||typeof data.valid!=='boolean'||typeof data.status!=='string'){this.error='La respuesta de verificación no es válida.';return;}
      this.queriedAt=new Date();
      if(qr.kind==='card'){this.card=data;this.message=data.valid&&data.status==='active'?'Carné válido como identificación. No acredita una boleta.':'Carné no válido: '+this.status(data.status)+'. No acredita una boleta.';return;}
      if(!Number.isSafeInteger(data.trip?.id)||data.trip.id<1||!data.seat?.seat_number||!data.ticket_code||!data.passenger){this.error='El servidor devolvió una boleta incompleta.';return;}
      this.ticket=data;this.verificationToken=qr.token;
      this.message=!data.valid||data.status!=='issued'?'La boleta no está habilitada: '+this.status(data.status)+'.':this.expectedTrip&&data.trip.id!==Number(this.expectedTrip)?'La boleta corresponde a otro viaje.':this.expectedTrip?'Boleta emitida y correspondiente al viaje seleccionado.':'Boleta emitida. Indica el viaje esperado para comprobar que corresponde.';
    },error:err=>{this.busy=false;this.error=err.status===404?'El servidor no pudo verificar el QR: enlace no válido o documento no encontrado. Si el token venció, solicita un QR actualizado.':err.status===400?'El servidor rechazó el QR.':'No se pudo consultar la verificación'+(err.status?' (HTTP '+err.status+')':'')+'. No hay una validación confirmada.';}});
  }
  get matches():boolean{return !!this.ticket?.valid&&this.ticket.status==='issued'&&!!this.expectedTrip&&this.ticket.trip.id===Number(this.expectedTrip);}
  status(value:string):string{return ({issued:'Emitida',used:'Ya utilizada',cancelled:'Cancelada',active:'Activo',expired:'Vencida',revoked:'Revocado',inactive:'Inactivo'} as Record<string,string>)[value]||value;}
  ngOnDestroy():void{this.verificationToken='';this.attempt=null;this.gone=true;this.stopCamera();this.destroyed.next();this.destroyed.complete();}
}
