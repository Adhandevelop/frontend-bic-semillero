import { buildSeatRows, SeatPlanRow } from '../../core/utils/seat-plan';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Subject, takeUntil, timeout } from 'rxjs';
import { Cliente, ClienteService } from '../../core/services/cliente.service';
import { RutaService } from '../../core/services/ruta.service';
import { Ruta } from '../../core/models/ruta.model';
import { VentaService, SaleTrip, SaleSeat, SaleFare, SaleTicket, SaleResult, AdminSalePayload } from '../../core/services/venta.service';
@Component({selector:'app-venta-form',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./venta-form.component.html',styleUrls:['./venta-form.component.css','../booking/booking-seats.component.css']})
export class VentaFormComponent implements OnInit,OnDestroy {
  seatLoading=false;seatError='';seatStates:Record<number,string>={};private seatSelection=new Subject<void>();private destroyed=new Subject<void>();
  ngOnDestroy():void{this.seatSelection.next();this.seatSelection.complete();this.destroyed.next();this.destroyed.complete();}
  loadTripSeats():void{
    if(this.saving||this.uncertain||this.result)return;this.seatSelection.next();this.seats=[];this.seatStates={};this.seatIds=[];this.unavailableIds=[];this.paid=false;this.seatError='';this.seatLoading=false;
    const trip=this.trip;if(!trip)return;this.seatLoading=true;
    this.sales.availability(trip.id).pipe(timeout(15000),takeUntil(this.seatSelection),takeUntil(this.destroyed)).subscribe({next:data=>{
      this.seatLoading=false;const ids=new Set<number>();
      if(data?.trip!==trip.id||!Array.isArray(data.seats)||!data.seats.every(seat=>Number.isSafeInteger(seat.id)&&seat.id>0&&!ids.has(seat.id)&&!!String(seat.seat_number??'').trim()&&!!String(seat.row??'').trim()&&!!String(seat.col??'').trim()&&['available','reserved','sold'].includes(seat.status)&&!!ids.add(seat.id))){this.seatError='La API devolvió un plano incompleto o de otro viaje. Actualiza las sillas antes de vender.';return;}
      this.seats=data.seats.map(seat=>({...seat,bus:trip.bus,row:String(seat.row),col:String(seat.col),seat_number:String(seat.seat_number)}));
      this.seatStates=Object.fromEntries(data.seats.map(seat=>[seat.id,seat.status]));this.unavailableIds=data.seats.filter(seat=>seat.status!=='available').map(seat=>seat.id);
    },error:err=>{this.seatLoading=false;this.seatError=err.status===401?'La sesión venció.':err.status===403?'No tienes permiso para consultar las sillas.':'No se pudo confirmar la disponibilidad'+(err.status?' (HTTP '+err.status+').':'. Revisa la conexión.');}});
  }
  get passengerLocked():boolean{return this.creatingClient||this.searchingClient||this.saving||this.uncertain||!!this.result;}
  clientsLoading=false;clientsError='';
  cargarClientes():void{
    if(this.clientsLoading)return;this.clientsLoading=true;this.clientsError='';
    this.clientsApi.listar().pipe(timeout(15000)).subscribe({next:clients=>{
      this.clients=[...clients,...this.clients.filter(c=>!clients.some(loaded=>loaded.id===c.id))];this.clientsLoading=false;
      const id=Number(this.route.snapshot.queryParamMap.get('cliente'));
      if(!this.clientId&&!this.draftPassenger&&clients.some(c=>c.id===id)){this.clientId=id;this.lookupDocument=this.client?.identification_number??'';}
    },error:()=>{this.clientsLoading=false;this.clientsError='No se pudo cargar el directorio de clientes. Reintenta la carga o prepara los datos del pasajero para la venta.';}});
  }
  chooseClient(client:Cliente):void{if(this.passengerLocked)return;this.clientId=client.id;this.draftPassenger=null;this.lookupDocument=client.identification_number;this.addingClient=false;this.clientNotFound=false;this.lookupError='';this.paid=false;this.clientNotice='Cliente seleccionado para la venta.';}
  searchingClient=false;lookupDocument='';lookupError='';clientNotFound=false;
  documentChanged():void{this.clientId=null;this.draftPassenger=null;this.paid=false;this.clientNotFound=false;this.lookupError='';this.clientNotice='';}
  existingMode():void{if(this.passengerLocked)return;this.addingClient=false;this.draftPassenger=null;this.clientError='';this.clientNotice='';this.paid=false;}
  buscarCliente():void{
    if(this.passengerLocked)return;
    const document=this.lookupDocument.trim();
    this.documentChanged();
    if(!/^[A-Za-z0-9.-]{1,20}$/.test(document)){this.lookupError='Ingresa un documento válido de hasta 20 caracteres.';return;}
    this.searchingClient=true;
    this.clientsApi.buscarPorDocumento(document).pipe(timeout(15000)).subscribe({next:matches=>{
      this.searchingClient=false;
      if(matches.length>1){this.lookupError='Hay varias cuentas con ese documento. Revisa el catálogo antes de vender.';return;}
      if(!matches.length){this.clientNotFound=true;this.openClient();return;}
      const client=matches[0];this.clients=[...this.clients.filter(c=>c.id!==client.id),client];this.clientId=client.id;
      this.clientNotice='Cliente encontrado. Sus datos se usarán para la venta.';
    },error:(err)=>{this.searchingClient=false;this.lookupError=err.status===404?'La ruta de búsqueda de clientes no está disponible en el servidor.':err.status===401?'La sesión venció. Inicia sesión nuevamente.':err.status===403?'Tu cuenta no tiene permisos para buscar clientes.':'No se pudo consultar el cliente. Revisa la conexión y el servicio de clientes.';}});
  }
  documentLabel():string{const code=this.client?.identification_document_code;const labels:Record<string,string>={'13':'Cédula de ciudadanía','22':'Cédula de extranjería','41':'Pasaporte','12':'Tarjeta de identidad',CC:'Cédula de ciudadanía',CE:'Cédula de extranjería',PAS:'Pasaporte',TI:'Tarjeta de identidad',PEP:'Permiso especial de permanencia'};return code?(labels[code]??code):'No disponible en la API';}
  invoiceLoading=false;invoiceError='';
  get invoiceStatus():string{const state=this.result?.factus_invoice?.status;return state==='issued'?'Emitida':state==='error'?'Error de facturación':'Pendiente de confirmación';}
  get invoiceNotices():string[]{const errors=this.result?.factus_invoice?.raw_response?.data?.errors;return errors&&typeof errors==='object'?Object.values(errors).filter((v):v is string=>typeof v==='string'):[];}
  safeInvoiceLink(value:string|undefined):string|null{if(!value)return null;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
  refreshInvoice():void{
    if(!this.result||this.invoiceLoading)return;
    this.invoiceLoading=true;this.invoiceError='';
    this.sales.consultar(this.result.id).subscribe({next:sale=>{this.result=sale;this.invoiceLoading=false;},error:()=>{this.invoiceLoading=false;this.invoiceError='No se pudo consultar la factura. La venta registrada se conserva; no vuelvas a emitir el tiquete.';}});
  }
  draftPassenger:Omit<Cliente,'id'|'role'>|null=null;
  creatingClient=false;
  addingClient=false;clientError='';clientNotice='';
  newClient={name:'',telephone:'',email:'',documentType:'13',documentNumber:''};
  openClient():void{if(this.passengerLocked)return;this.addingClient=true;if(this.lookupDocument.trim())this.newClient.documentNumber=this.lookupDocument.trim();this.clientError='';this.clientNotice='';this.paid=false;}
  cancelClient():void{if(this.passengerLocked)return;this.addingClient=false;this.clientError='';}
  createClient():void{
    if(this.passengerLocked)return;
    this.clientError='';
    const draft=this.newClient,name=draft.name.trim().replace(/\s+/g,' '),email=draft.email.trim().toLowerCase(),telephone=draft.telephone.trim(),document=draft.documentNumber.trim();
    const names=name.split(' ');
    if(names.length<2||name.length>150||!/^\+?[0-9 ()-]{7,20}$/.test(telephone)||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>50||! /^[A-Za-z0-9.-]{1,20}$/.test(document)||!['13','22','41','12'].includes(draft.documentType)){
      this.clientError='Revisa nombre y apellido, celular (7 a 20 caracteres), correo (máximo 50) y documento (hasta 20 letras, números, puntos o guiones).';return;
    }
    const existing=this.clients.find(c=>String(c.identification_number??'').trim().toLocaleLowerCase()===document.toLocaleLowerCase());
    if(existing){this.clientId=existing.id;this.draftPassenger=null;this.addingClient=false;this.lookupDocument=document;this.paid=false;this.clientNotice='El documento ya existe. Cliente seleccionado para la venta.';return;}
    if(this.clients.some(c=>c.email?.toLocaleLowerCase()===email)){this.clientError='Ya existe un cliente con ese correo. Búscalo en el directorio de pasajeros.';return;}
    this.creatingClient=true;
    this.clientsApi.crearCliente({identification_document_code:draft.documentType,identification_number:document,name,email,telephone}).pipe(timeout(15000)).subscribe({
      next:client=>{
        this.creatingClient=false;
        this.clients=[...this.clients.filter(c=>c.id!==client.id),client];
        this.chooseClient(client);this.clientNotice='Cliente guardado y seleccionado. Ya puedes continuar con la venta.';
        this.newClient={name:'',telephone:'',email:'',documentType:'13',documentNumber:''};
      },error:err=>{
        this.creatingClient=false;
        const fields=['identification_document_code','identification_number','name','email','telephone','detail','non_field_errors'];
        const detail=err.status===400||err.status===409?Object.entries(err.error&&typeof err.error==='object'?err.error:{}).filter(([key])=>fields.includes(key)).flatMap(([,value])=>Array.isArray(value)?value.filter(v=>typeof v==='string'):typeof value==='string'?[value]:[]).join(' '):'';
        this.clientError=detail||(err.status===404?'El servicio para guardar clientes todavía no está disponible en el servidor.':err.status===403?'Tu cuenta no tiene permisos para guardar clientes.':err.status===401?'La sesión venció. Inicia sesión nuevamente.':'No se pudo confirmar el registro. Busca el documento antes de reintentar para comprobar si fue guardado.');
      }
    });
  }
  selectRegisteredClient():void{this.draftPassenger=null;this.clientNotice='';this.paid=false;}
  loading=false;saving=false;error='';uncertain=false;result:SaleResult|null=null;
  clients:Cliente[]=[];trips:SaleTrip[]=[];seats:SaleSeat[]=[];fares:SaleFare[]=[];tickets:SaleTicket[]=[];routes:Ruta[]=[];
  tripId:number|null=null;clientId:number|null=null;seatIds:number[]=[];search='';payment:AdminSalePayload['payment_method']='cash';paid=false;
  constructor(private sales:VentaService,private clientsApi:ClienteService,private routesApi:RutaService,private route:ActivatedRoute){}
  ngOnInit():void{this.cargarClientes();this.cargar();}
  get locked():boolean{return this.creatingClient||this.searchingClient||this.loading||this.seatLoading||this.saving||this.uncertain||!!this.result;}
  get trip():SaleTrip|undefined{return this.trips.find(t=>t.id===this.tripId);}
  get client():Omit<Cliente,'id'|'role'>|undefined{return this.draftPassenger??this.clients.find(c=>c.id===this.clientId);}
  private attempt:{payload:AdminSalePayload;key:string}|null=null;
  unavailableIds:number[]=[];
  get seatRows():SeatPlanRow<SaleSeat>[]{return buildSeatRows(this.availableSeats);}
  get selectedSeats():SaleSeat[]{return this.availableSeats.filter(s=>this.seatIds.includes(s.id));}
  get selectedSeatLabels():string{return this.selectedSeats.map(s=>s.seat_number).join(', ');}
  get total():number|null{return this.amount===null||!this.seatIds.length?null:this.amount*this.seatIds.length;}
  get amount():number|null{const fare=this.fares.find(f=>f.trip===this.tripId);return fare&&Number.isInteger(fare.amount_cents)&&fare.amount_cents>0?fare.amount_cents/100:null;}
  get availableSeats():SaleSeat[]{return this.seats.filter(s=>s.bus===this.trip?.bus).sort((a,b)=>a.row.localeCompare(b.row,undefined,{numeric:true})||a.col.localeCompare(b.col,undefined,{numeric:true}));}
  get filteredClients():Cliente[]{const q=this.search.trim().toLocaleLowerCase();return this.clients.filter(c=>!q||[this.nombre(c),c.identification_number,c.email].join(' ').toLocaleLowerCase().includes(q)).slice(0,20);}
  nombre(c:Pick<Cliente,'first_name'|'last_name'|'username'>):string{return [c.first_name,c.last_name].filter(Boolean).join(' ').trim()||c.username;}
  tripLabel(t:SaleTrip):string{const r=this.routes.find(r=>r.id===t.route);return '#'+t.id+' · '+(r?r.origen+' → '+r.destino:'Ruta #'+t.route);}
  sold(id:number):boolean{return this.seatStates[id]!==undefined?this.seatStates[id]==='sold':this.tickets.some(t=>t.trip===this.tripId&&t.seat===id&&(t.status==='issued'||t.status==='used'));}
  get ready():boolean{const c=this.client;return !this.addingClient&&!this.locked&&!!this.trip&&this.seatIds.length>=1&&this.seatIds.length<=10&&this.selectedSeats.length===this.seatIds.length&&this.seatIds.every(id=>!this.sold(id)&&!this.unavailableIds.includes(id))&&this.amount!==null&&!!c?.identification_number&&!!c.email&&!!c.telephone&&this.paid;}
  changeTrip():void{this.loadTripSeats();}
  selectSeat(s:SaleSeat):void{
    if(this.locked||this.sold(s.id)||this.unavailableIds.includes(s.id))return;
    if(this.seatIds.includes(s.id))this.seatIds=this.seatIds.filter(id=>id!==s.id);
    else{if(this.seatIds.length>=10){this.error='Puedes vender máximo 10 boletas por venta.';return;}this.seatIds=[...this.seatIds,s.id];}
    this.error='';this.paid=false;
  }
  cargar():void{
    if(this.locked)return;this.loading=true;this.error='';
    forkJoin({catalog:this.sales.catalogos(),routes:this.routesApi.listar()}).pipe(timeout(15000)).subscribe({next:({catalog,routes})=>{
      this.trips=catalog.trips.filter(t=>t.trip_state==='scheduled'&&new Date(t.date_time_start).getTime()>Date.now());this.seats=catalog.seats;this.fares=catalog.fares;this.tickets=catalog.tickets;this.routes=routes;
      if(!this.trip)this.tripId=null;this.seatIds=[];this.paid=false;
      this.unavailableIds=[];this.loading=false;if(this.trip)this.loadTripSeats();
    },error:()=>{this.loading=false;this.error='No se pudieron cargar los viajes, rutas, tarifas o sillas. El directorio de clientes se carga por separado. Revisa tu sesión, permisos y la disponibilidad de la API.';this.trips=[];this.seats=[];}});
  }
  emitir():void {
    if(!this.ready)return;
    if(new Date(this.trip!.date_time_start).getTime()<=Date.now()){this.error='El viaje ya no admite ventas desde esta pantalla. Actualiza los datos.';return;}
    const c=this.client!;
    if(!globalThis.confirm('Se registrará una sola venta pagada con '+this.seatIds.length+' boleta(s). ¿Confirmas que recibiste el pago total?'))return;
    this.attempt={key:crypto.randomUUID(),payload:{trip:this.tripId!,seats:[...this.seatIds],identification_number:c.identification_number,name:this.nombre(c),email:c.email,telephone:c.telephone!,payment_method:this.payment}};
    this.sendAttempt();
  }
  retrySale():void{if(this.uncertain&&!this.saving&&this.attempt)this.sendAttempt();}
  private sendAttempt():void{
    if(!this.attempt||this.saving)return;
    const wasUncertain=this.uncertain;this.saving=true;this.error='';
    this.sales.crear(this.attempt.payload,this.attempt.key).pipe(timeout(30000)).subscribe({next:result=>{
      this.saving=false;this.paid=false;
      if(!result?.id||!Array.isArray(result.tickets)||!result.tickets.length){this.uncertain=true;this.error='El servidor devolvió un resultado incompleto. Consulta la venta o reintenta el mismo intento.';return;}
      this.result=result;this.uncertain=false;this.attempt=null;
    },error:err=>{
      this.saving=false;this.paid=false;
      const detail=typeof err.error?.detail==='string'?err.error.detail:'';
      const unavailable=Array.isArray(err.error?.unavailable_seats)?err.error.unavailable_seats.filter((entry:unknown)=>entry&&typeof entry==='object'&&'seat' in entry&&Number.isSafeInteger(entry.seat)):[];
      if(wasUncertain&&[400,401,403,404,422].includes(err.status)){this.uncertain=true;this.error=(detail?detail+' ':'')+'El intento anterior sigue sin confirmar. Conserva esta página y consulta la venta antes de iniciar otra operación.';return;}
      if(err.status===409&&unavailable.length){
        const ids=unavailable.map((seat:{seat?:number})=>seat.seat).filter((id:unknown):id is number=>typeof id==='number');
        this.unavailableIds=[...new Set([...this.unavailableIds,...ids])];this.seatIds=this.seatIds.filter(id=>!ids.includes(id));
        const labels=ids.map((id:number)=>this.availableSeats.find(seat=>seat.id===id)?.seat_number||'ID '+id).join(', ');
        this.error=(detail||'No se registró la venta porque hay sillas no disponibles.')+(labels?' Sillas: '+labels+'.':'')+' Revisa la selección y confirma nuevamente el total.';
        this.uncertain=false;this.attempt=null;
      }else if([400,401,403,404,422].includes(err.status)){
        this.error=detail||'No se pudo registrar la venta. Revisa los datos, permisos y disponibilidad de las sillas.';this.uncertain=false;this.attempt=null;
      }else{
        this.uncertain=true;this.error=(detail?detail+' ':'')+'No se pudo confirmar el resultado. Puedes consultar las ventas o reintentar con la misma clave, sin cambiar los datos de este intento. No registres otra venta hasta aclararlo.';
      }
    }});
  }
}
