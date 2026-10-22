import { CommonModule } from '@angular/common';
import { Component, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, takeUntil, timeout } from 'rxjs';
import { OnlineBookingService, OnlineBus, OnlineTrip, OnlineSeat, OnlineFare, OnlineRoute, OnlinePlace, CheckoutData, PaymentStatus } from '../../core/services/online-booking.service';
import { PassengerService, PassengerProfile, PassengerSale, passengerError } from '../../core/services/passenger.service';
import { WompiWidgetService } from '../../core/services/wompi-widget.service';
interface PendingCheckout {saleId:number|null;deadline:number;transactionId?:string;}
@Component({selector:'app-booking',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./booking.component.html',styleUrls:['./booking.component.css','./booking-payment.component.css']})
export class BookingComponent implements OnInit,OnDestroy {
  private api=inject(OnlineBookingService);private session=inject(PassengerService);private widget=inject(WompiWidgetService);private route=inject(ActivatedRoute);private zone=inject(NgZone);
  private destroyed=new Subject<void>();private gone=false;private timer?:ReturnType<typeof setInterval>;private key='';
  buses:OnlineBus[]=[];
  trips:OnlineTrip[]=[];seats:OnlineSeat[]=[];fares:OnlineFare[]=[];routes:OnlineRoute[]=[];places:OnlinePlace[]=[];
  profile:PassengerProfile|null=null;tripId:number|null=null;seatId:number|null=null;terms=false;loading=false;paying=false;checking=false;message='';error='';catalogError='';
  pending:PendingCheckout|null=null;checkoutData:CheckoutData|null=null;payment:PaymentStatus|null=null;receipt:PassengerSale|null=null;receiptError='';seconds=0;
  get trip(){return this.trips.find(t=>t.id===this.tripId);}
  get selectedSeat(){return this.seats.find(s=>s.id===this.seatId&&s.bus===this.trip?.bus);}
  get visibleSeats(){return this.seats.filter(s=>s.bus===this.trip?.bus).sort((a,b)=>a.row.localeCompare(b.row,undefined,{numeric:true})||a.col.localeCompare(b.col,undefined,{numeric:true}));}
  price(trip:OnlineTrip):number|null{const cents=this.fares.find(f=>f.trip===trip.id)?.amount_cents;return typeof cents==='number'&&Number.isSafeInteger(cents)&&cents>0?cents/100:null;}
  get total(){return this.trip?this.price(this.trip):null;}
  get locked(){return this.paying||this.checking||!!this.pending||!!this.receipt||!!this.payment;}
  get canPay(){return !!this.profile&&!!this.trip&&!!this.selectedSeat&&this.total!==null&&this.terms&&!this.locked&&!this.loading;}
  get remaining(){return Math.floor(this.seconds/60)+':'+String(this.seconds%60).padStart(2,'0');}
  get fullName(){return this.profile?.name||[this.profile?.first_name,this.profile?.last_name].filter(Boolean).join(' ');}
  busLabel(trip:OnlineTrip):string{const bus=this.buses.find(b=>b.id===trip.bus);return bus?[bus.plate,bus.model].filter(Boolean).join(' · '):'Bus #'+trip.bus;}
  busCapacity(trip:OnlineTrip):number|null{return this.buses.find(b=>b.id===trip.bus)?.capacity??null;}
  terminal(trip:OnlineTrip,destination=false):string{const r=this.routes.find(r=>r.id===trip.route),id=destination?r?.destination:r?.origin;return this.places.find(p=>p.id===id)?.place_name??(id?'Terminal #'+id:'Ruta #'+trip.route);}
  ngOnInit():void{
    this.session.me().pipe(takeUntil(this.destroyed)).subscribe({next:p=>{this.profile=p;this.key='bic_checkout_'+p.id;this.restore();this.load();},error:err=>this.error=passengerError(err)});
    this.timer=setInterval(()=>this.updateClock(),1000);
  }
  load():void{if(this.loading)return;this.loading=true;this.catalogError='';this.api.catalog().pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:data=>{this.trips=data.trips.filter(t=>t.trip_state==='scheduled'&&Date.parse(t.date_time_start)>Date.now()).sort((a,b)=>Date.parse(a.date_time_start)-Date.parse(b.date_time_start));this.buses=data.buses??[];this.seats=data.seats;this.fares=data.fares;this.routes=data.routes;this.places=data.places;this.loading=false;if(!this.trips.some(t=>t.id===this.tripId)){this.tripId=null;this.seatId=null;}},error:err=>{this.loading=false;this.catalogError=passengerError(err);}});}
  selectTrip(id:number):void{if(this.locked)return;this.tripId=id;this.seatId=null;this.terms=false;}
  selectSeat(id:number):void{if(this.locked||!this.visibleSeats.some(s=>s.id===id))return;this.seatId=id;this.terms=false;}
  private persist():void{try{if(this.key){if(this.pending)sessionStorage.setItem(this.key,JSON.stringify(this.pending));else sessionStorage.removeItem(this.key);}}catch{this.message='No se pudo conservar la referencia en esta pestaña. Evita recargar durante el pago.';}}
  private restore():void{
    try{const p=JSON.parse(sessionStorage.getItem(this.key)??'null');if(p&&Number.isFinite(p.deadline)&&(p.saleId===null||Number.isSafeInteger(p.saleId)&&p.saleId>0))this.pending=p;}catch{}
    const sale=Number(this.route.snapshot.queryParamMap.get('venta')),transaction=this.route.snapshot.queryParamMap.get('id');
    if(Number.isSafeInteger(sale)&&sale>0&&transaction){this.pending={saleId:sale,transactionId:transaction,deadline:this.pending?.deadline??Date.now()};this.persist();}
    this.updateClock();if(this.pending?.transactionId)this.verify();else if(this.pending?.saleId)this.refreshReceipt();
  }
  private updateClock():void{this.seconds=this.pending?Math.max(0,Math.ceil((this.pending.deadline-Date.now())/1000)):0;}
  async checkout():Promise<void>{
    if(!this.canPay)return;
    if(Date.parse(this.trip!.date_time_start)<=Date.now()){this.error='El viaje ya no admite esta compra. Actualiza los horarios.';return;}
    this.paying=true;this.error='';this.message='Cargando Wompi…';
    try{await this.widget.load();}catch{if(!this.gone){this.paying=false;this.error='No se pudo cargar Wompi. No se envió el checkout.';this.message='';}return;}
    if(this.gone)return;
    this.pending={saleId:null,deadline:Date.now()+300000};this.persist();
    this.api.checkout(this.tripId!,this.seatId!,location.origin+'/clientes/comprar').pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:data=>{
      this.paying=false;this.message='';
      if(Number.isSafeInteger(data.sale_id)&&data.sale_id>0){this.pending={saleId:data.sale_id,deadline:this.pending?.deadline??Date.now()+300000};this.persist();}
      if(!Number.isSafeInteger(data.sale_id)||data.sale_id<=0||!data.reference||!data.public_key?.startsWith('pub_')||data.currency!=='COP'||!Number.isSafeInteger(data.amount_in_cents)||data.amount_in_cents<=0||!data.signature_integrity){this.error='El servidor devolvió un checkout incompleto. Revisa tus compras antes de reintentar.';return;}
      const expiry=data.expires_at?Date.parse(data.expires_at):NaN;
      this.pending={saleId:data.sale_id,deadline:Number.isFinite(expiry)?expiry:(this.pending?.deadline??Date.now()+300000)};this.checkoutData=data;this.persist();this.updateClock();this.openWidget();
    },error:err=>{this.paying=false;this.message='';this.error=passengerError(err);if([400,401,403,404,409,422].includes(err.status)){this.pending=null;this.persist();}else this.error+=' No se pudo confirmar si se creó la venta. Revisa tus compras antes de reintentar.';}});
  }
  openWidget():void{
    if(!this.checkoutData||!this.pending?.saleId||this.checking||this.paying||this.seconds<=0||this.payment||this.receipt?.status==='paid')return;
    const saleId=this.pending.saleId;const url=new URL('/clientes/comprar',location.origin);url.searchParams.set('venta',String(saleId));
    try{this.paying=true;this.widget.open(this.checkoutData,url.href,id=>this.zone.run(()=>{if(this.gone||this.pending?.saleId!==saleId)return;this.paying=false;if(!id){this.message='Wompi no devolvió una transacción. Puedes consultar el estado de tu compra.';return;}this.pending.transactionId=id;this.persist();this.verify();}));}catch{this.paying=false;this.error='No se pudo abrir Wompi. La venta puede seguir pendiente; consulta su estado.';}
  }
  widgetClosed():void{if(!this.checkoutData||!this.pending?.saleId)return;this.paying=false;this.message='Consulta el estado si completaste el pago. Cerrar Wompi no confirma ni cancela la venta.';}
  verify():void{
    if(this.checking||!this.pending?.saleId||!this.pending.transactionId)return;
    this.checking=true;this.error='';
    this.api.status(this.pending.saleId,this.pending.transactionId).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:status=>{this.checking=false;this.payment=status;if(status.sale_status==='paid'){this.message='Pago confirmado por el servidor.';this.refreshReceipt();}else if(['failed','expired','cancelled'].includes(status.sale_status)){this.message='La compra no se completó: '+status.sale_status+'.';}else{this.payment=null;this.message='El pago sigue pendiente de confirmación. Puedes consultar de nuevo.';}},error:err=>{this.checking=false;this.error=passengerError(err)+' No repitas el pago; vuelve a consultar su estado.';}});
  }
  refreshReceipt():void{
    if(!this.pending?.saleId||this.checking)return;this.checking=true;this.receiptError='';
    this.api.sale(this.pending.saleId).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:sale=>{this.checking=false;this.receipt=sale;if(sale.status==='paid')this.message='Venta pagada confirmada por el servidor.';},error:err=>{this.checking=false;this.receiptError=passengerError(err);}});
  }
  newPurchase():void{
    if(this.paying||this.checking||!confirm('¿Ya revisaste el estado de esta operación en Mis compras? No vuelvas a pagar una compra confirmada.'))return;
    this.pending=null;this.checkoutData=null;this.payment=null;this.receipt=null;this.seatId=null;this.terms=false;this.error='';this.message='';this.persist();this.updateClock();window.history.replaceState(window.history.state,'',location.origin+'/clientes/comprar');
  }
  invoiceLink(value?:string):string|null{try{const url=new URL(value??'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
  ngOnDestroy():void{this.gone=true;if(this.timer)clearInterval(this.timer);this.destroyed.next();this.destroyed.complete();}
}



