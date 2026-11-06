import { ActivatedRoute } from '@angular/router';
import { AdminSaleDeliveryService } from '../../core/services/admin-sale-delivery.service';
import { createTicketPdf } from '../../core/services/ticket-pdf';
import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, firstValueFrom, map, of, Subject, switchMap, takeUntil, timeout } from 'rxjs';
import { SaleResult, SaleSeat, SaleTicket, SaleTrip, VentaService } from '../../core/services/venta.service';
import { RutaService } from '../../core/services/ruta.service';
import { Ruta } from '../../core/models/ruta.model';
@Component({selector:'app-venta-list',standalone:true,imports:[ListOrderComponent,CommonModule,FormsModule,RouterLink],templateUrl:'./venta-list.component.html',styleUrls:['./venta-list.component.css','./venta-delivery.component.css']})
export class VentaListComponent implements OnInit, OnDestroy {
  @ViewChild('saleDetail') saleDetail?:ElementRef<HTMLElement>;
  private route=inject(ActivatedRoute);
  private delivery=inject(AdminSaleDeliveryService);private destroyed=new Subject<void>();private gone=false;private cooldowns=new Set<number>();private timers:Array<ReturnType<typeof setTimeout>>=[];private pdfUrls=new Set<string>();
  action:'pdf'|'print'|'resend'|'invoice'|null=null;deliveryError='';deliveryMessage='';invoiceLoadError='';private invoiceUncertain=new Set<number>();
  get deliveryBusy():boolean{return this.action!==null;}
  get canDeliver():boolean{return !!this.selected&&this.selected.status==='paid'&&!!this.selected.tickets?.length&&!this.detailLoading&&!this.deliveryBusy;}
  get canResend():boolean{return this.canDeliver&&!this.cooldowns.has(this.selected!.id);}
  get invoiceNeedsReview():boolean{return !!this.selected&&this.invoiceUncertain.has(this.selected.id);}
  get canRetryInvoice():boolean{return this.canDeliver&&this.selected!.factus_invoice?.status==='error'&&!this.invoiceUncertain.has(this.selected!.id);}
  ticketSeat(ticket:SaleTicket):string{return ticket.seat_number||this.seats.find(seat=>seat.id===ticket.seat)?.seat_number||'ID '+ticket.seat;}
  ticketState(value:string):string{return ({issued:'Emitida',used:'Ya utilizada',cancelled:'Cancelada'} as Record<string,string>)[value]||value;}
  private updateSale(sale:SaleResult):void{this.selected=sale;this.sales=this.sales.map(item=>item.id===sale.id?sale:item);}
  async deliver(print=false):Promise<void>{
    if(!this.canDeliver)return;const id=this.selected!.id,version=this.detailRequest;
    let viewer:Window|null=null;if(print){viewer=window.open('about:blank','_blank');if(!viewer){this.deliveryError='Permite abrir una pestaña para imprimir, o descarga el PDF y utiliza Imprimir desde el visor.';return;}viewer.opener=null;viewer.document.title='Preparando boletas';viewer.document.body.textContent='Preparando boletas verificadas…';}
    this.action=print?'print':'pdf';this.deliveryError='';this.deliveryMessage='';
    try{
      const prepared=await firstValueFrom(this.delivery.prepare(id).pipe(takeUntil(this.destroyed)));
      if(this.gone||version!==this.detailRequest){viewer?.close();return;}
      const pdf=await createTicketPdf(id,prepared.entries);if(this.gone||version!==this.detailRequest){viewer?.close();return;}this.updateSale(prepared.sale);
      if(print){if(!viewer||viewer.closed)throw new Error('Se cerró la ventana de impresión. Vuelve a intentarlo.');pdf.autoPrint();const url=URL.createObjectURL(pdf.output('blob'));this.pdfUrls.add(url);viewer.location.replace(url);this.timers.push(setTimeout(()=>{URL.revokeObjectURL(url);this.pdfUrls.delete(url);},600000));this.deliveryMessage='Se abrió el PDF para imprimir. Si no aparece el diálogo, utiliza Imprimir en el visor.';}
      else{pdf.save('boletas-venta-'+id+'.pdf');this.deliveryMessage=prepared.entries.length+' boleta(s) preparadas en un único PDF.';}
    }catch(err){viewer?.close();if(!this.gone)this.deliveryError=err instanceof Error&&!('status' in err)?err.message:this.actionFailure(err,'preparar las boletas');}
    finally{this.action=null;}
  }
  resend():void{
    if(!this.canResend||!globalThis.confirm('¿Reenviar la confirmación de esta venta al correo registrado del comprador?'))return;
    const id=this.selected!.id;this.action='resend';this.deliveryError='';this.deliveryMessage='';
    this.api.resend(id).pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:()=>{this.action=null;this.waitResend(id);this.deliveryMessage='El servidor aceptó el reenvío al correo registrado. Esto no confirma su recepción.';},error:err=>{this.action=null;this.waitResend(id);this.deliveryError=err.error?.code==='email_unavailable'?'El servicio de correo no está disponible. La venta y las boletas se conservan.':this.actionFailure(err,'reenviar la confirmación');if(!err.status||err.status>=500)this.deliveryError+=' El envío puede estar sin confirmar; comprueba el correo antes de reintentar.';}});
  }
  private waitResend(id:number):void{this.cooldowns.add(id);this.timers.push(setTimeout(()=>this.cooldowns.delete(id),60000));}
  retryInvoice():void{
    if(!this.canRetryInvoice||!globalThis.confirm('¿Reintentar únicamente la factura de esta venta pagada? No se creará otra venta ni se volverá a cobrar.'))return;
    const sale=this.selected!;this.action='invoice';this.deliveryError='';this.deliveryMessage='';
    this.api.retryInvoice(sale.id).pipe(timeout(45000),takeUntil(this.destroyed)).subscribe({next:invoice=>{
      this.action=null;if(!invoice||typeof invoice.status!=='string'){this.invoiceUncertain.add(sale.id);this.deliveryError='La respuesta de factura está incompleta. Actualiza el detalle antes de otra operación.';return;}
      this.updateSale({...sale,factus_invoice:invoice});if(invoice.status==='error')this.deliveryError=invoice.error_message||'El reintento terminó con error. El backend no devolvió el motivo.';else this.deliveryMessage=invoice.status==='issued'?'Factura emitida.':'El servidor informa factura pendiente; actualiza el detalle para consultar su estado.';
    },error:err=>{this.action=null;this.deliveryError=this.actionFailure(err,'reintentar la factura');if(!err.status||err.status>=500){this.invoiceUncertain.add(sale.id);this.deliveryError+=' Resultado sin confirmar. Actualiza el detalle y verifica Factus antes de reintentar.';}}});
  }
  private actionFailure(err:unknown,operation:string):string{const e=err as {status?:number;error?:{detail?:unknown}};return e?.status===401?'La sesión venció. Inicia sesión nuevamente.':e?.status===403?'No tienes permisos para esta operación.':e?.status===429?'Se alcanzó el límite de solicitudes. Espera antes de reintentar.':typeof e?.error?.detail==='string'?e.error.detail:'No se pudo '+operation+(e?.status?' (HTTP '+e.status+').':'. Revisa la conexión.');}
  ngOnDestroy():void{this.gone=true;this.destroyed.next();this.destroyed.complete();for(const timer of this.timers)clearTimeout(timer);for(const url of this.pdfUrls)URL.revokeObjectURL(url);}
  listOrder:ListOrder='desc';
  sales:SaleResult[]=[];trips:SaleTrip[]=[];seats:SaleSeat[]=[];routes:Ruta[]=[];
  loading=false;error='';warnings:string[]=[];search='';state='';source='';date='';page=1;readonly pageSize=7;
  selected:SaleResult|null=null;detailLoading=false;detailError='';private detailRequest=0;
  constructor(private api:VentaService,private routeApi:RutaService){}
  ngOnInit():void{if(this.route.snapshot.queryParamMap.get('estado')==='refund_required')this.state='refund_required';this.cargar();}
  stateLabel(state:string):string{return ({refund_required:'Pago recibido · Requiere atención',paid:'Pagada',pending:'Pendiente',failed:'Fallida',expired:'Expirada',cancelled:'Cancelada'} as Record<string,string>)[state]??state;}
  paymentLabel(method?:string):string{return ({cash:'Efectivo',card:'Tarjeta',transfer:'Transferencia',wompi:'Wompi'} as Record<string,string>)[method??'']??(method||'Sin datos');}
  invoiceLabel(sale:SaleResult):string{return ({issued:'Emitida',error:'Error',pending:'Pendiente'} as Record<string,string>)[sale.factus_invoice?.status??'']??'Sin resultado';}
  tripId(sale:SaleResult):number|undefined{return sale.trip??sale.tickets?.[0]?.trip;}
  routeLabel(sale:SaleResult):string{const t=this.trips.find(t=>t.id===this.tripId(sale)),r=this.routes.find(r=>r.id===t?.route);return r?r.origen+' → '+r.destino:'Viaje #'+(this.tripId(sale)??'—');}
  seatLabel(sale:SaleResult):string{const tickets=sale.tickets??[];if(tickets.length)return [...new Set(tickets.map(t=>t.seat_number||this.seats.find(s=>s.id===t.seat)?.seat_number||'ID '+t.seat))].join(', ');return this.seats.find(s=>s.id===sale.seat)?.seat_number||(sale.seat?'ID '+sale.seat:'Sin datos');}
  get filtered():SaleResult[]{const q=this.search.trim().toLocaleLowerCase();return orderRecords(this.sales.filter(s=>(!this.state||s.status===this.state)&&(!this.source||s.source===this.source)&&(!this.date||this.day(s.created_at)===this.date)&&(!q||[s.id,s.passenger_name,s.passenger_identification,s.passenger_email,this.tripId(s),this.routeLabel(s),s.factus_invoice?.number].join(' ').toLocaleLowerCase().includes(q))),this.listOrder);}
  day(value?:string):string{const time=value?Date.parse(value):NaN;return Number.isFinite(time)?new Date(time-5*3600000).toISOString().slice(0,10):'';}
  get pageCount():number{return Math.max(1,Math.ceil(this.filtered.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visible():SaleResult[]{return this.filtered.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  get paidTotal():number{return this.filtered.filter(s=>s.status==='paid').reduce((sum,s)=>sum+(Number.isFinite(s.amount_cents)?s.amount_cents:0),0)/100;}
  count(status:string):number{return this.filtered.filter(s=>s.status===status).length;}
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  clearFilters():void{this.search='';this.state='';this.source='';this.date='';this.page=1;}
  cargar():void{
    if(this.loading||this.deliveryBusy)return;this.loading=true;this.error='';this.warnings=[];this.closeDetail();
    this.api.listar().pipe(timeout(15000),takeUntil(this.destroyed)).subscribe({next:sales=>{this.sales=[...sales].sort((a,b)=>b.id-a.id);this.loading=false;this.page=Math.min(this.page,this.pageCount);},error:err=>{this.loading=false;this.sales=[];this.error=this.failure(err.status,'cargar las ventas');}});
    forkJoin({catalog:this.api.catalogos().pipe(catchError(()=>{this.warnings.push('No se pudieron cargar los datos de viajes y sillas; se muestran sus IDs.');return of(null);})),routes:this.routeApi.listar().pipe(catchError(()=>{this.warnings.push('No se pudieron cargar las rutas.');return of([]);} ))}).pipe(timeout(15000),takeUntil(this.destroyed)).subscribe({next:({catalog,routes})=>{this.trips=catalog?.trips??[];this.seats=catalog?.seats??[];this.routes=routes;},error:()=>{this.warnings.push('La consulta de catálogos agotó el tiempo de espera.');}});
  }
  detail(sale:SaleResult):void{
    if(this.deliveryBusy)return;this.deliveryError='';this.deliveryMessage='';this.invoiceLoadError='';
    const request=++this.detailRequest;this.selected=sale;this.detailLoading=true;this.detailError='';this.timers.push(setTimeout(()=>{if(request===this.detailRequest&&!this.gone){this.saleDetail?.nativeElement.scrollIntoView({behavior:'smooth',block:'start'});this.saleDetail?.nativeElement.focus({preventScroll:true});}},0));
    this.api.consultar(sale.id).pipe(timeout(15000),switchMap(updated=>updated.status==='refund_required'?of({...updated,tickets:[],factus_invoice:null}):this.api.invoice(sale.id).pipe(timeout(15000),map(invoice=>({...updated,factus_invoice:invoice})),catchError(err=>{if(request===this.detailRequest)this.invoiceLoadError=this.actionFailure(err,'consultar la factura');return of(updated);}))),takeUntil(this.destroyed)).subscribe({next:updated=>{if(request!==this.detailRequest)return;if(updated.id!==sale.id){this.detailLoading=false;this.detailError='El detalle recibido no corresponde a esta venta.';return;}this.updateSale(updated);if(updated.factus_invoice?.status==='issued')this.invoiceUncertain.delete(sale.id);this.detailLoading=false;},error:err=>{if(request!==this.detailRequest)return;this.detailLoading=false;this.detailError=this.failure(err.status,'actualizar el detalle de la venta');}});
  }
  closeDetail():void{if(this.deliveryBusy)return;this.deliveryError='';this.deliveryMessage='';this.invoiceLoadError='';this.detailRequest++;this.selected=null;this.detailLoading=false;this.detailError='';}
  invoiceLink(value?:string):string|null{try{const url=new URL(value??'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
  private failure(status:number,action:string):string{return status===401?'La sesión venció. Inicia sesión nuevamente.':status===403?'Tu cuenta no tiene permisos para consultar ventas.':'No se pudo '+action+(status?' (HTTP '+status+')':'')+'. Revisa la conexión y el servicio.';}
}
