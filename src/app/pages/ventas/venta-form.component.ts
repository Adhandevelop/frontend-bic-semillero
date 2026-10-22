import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Cliente, ClienteService } from '../../core/services/cliente.service';
import { RutaService } from '../../core/services/ruta.service';
import { Ruta } from '../../core/models/ruta.model';
import { VentaService, SaleTrip, SaleSeat, SaleFare, SaleTicket, SaleResult, AdminSalePayload } from '../../core/services/venta.service';
@Component({selector:'app-venta-form',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./venta-form.component.html',styleUrl:'./venta-form.component.css'})
export class VentaFormComponent implements OnInit {
  invoiceLoading=false;invoiceError='';
  get invoiceStatus():string{const state=this.result?.factus_invoice?.status;return state==='issued'?'Emitida':state==='error'?'Error de facturación':'Pendiente de confirmación';}
  get invoiceNotices():string[]{const errors=this.result?.factus_invoice?.raw_response?.data?.errors;return errors&&typeof errors==='object'?Object.values(errors).filter((v):v is string=>typeof v==='string'):[];}
  safeInvoiceLink(value:string|undefined):string|null{if(!value)return null;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
  refreshInvoice():void{
    if(!this.result||this.invoiceLoading)return;
    this.invoiceLoading=true;this.invoiceError='';
    this.sales.consultar(this.result.id).subscribe({next:sale=>{this.result=sale;this.invoiceLoading=false;},error:()=>{this.invoiceLoading=false;this.invoiceError='No se pudo consultar la factura. La venta registrada se conserva; no vuelvas a emitir el tiquete.';}});
  }
  addingClient=false;creatingClient=false;clientError='';clientNotice='';
  newClient={name:'',telephone:'',email:'',documentType:'CC',documentNumber:''};
  openClient():void{if(this.locked)return;this.addingClient=true;this.clientError='';this.clientNotice='';this.paid=false;}
  cancelClient():void{if(this.creatingClient)return;this.addingClient=false;this.clientError='';}
  createClient():void{
    if(this.locked)return;
    this.clientError='';
    const draft=this.newClient,name=draft.name.trim().replace(/\s+/g,' '),email=draft.email.trim().toLowerCase(),telephone=draft.telephone.trim(),document=draft.documentNumber.trim();
    const names=name.split(' ');
    if(names.length<2||name.length>150||!/^\+?[0-9 ()-]{7,20}$/.test(telephone)||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>50||! /^[A-Za-z0-9.-]{1,20}$/.test(document)||!['CC','CE','PAS','TI','PEP'].includes(draft.documentType)){
      this.clientError='Revisa nombre y apellido, celular (7 a 20 caracteres), correo (máximo 50) y documento (hasta 20 letras, números, puntos o guiones).';return;
    }
    const existing=this.clients.find(c=>c.identification_number.toLocaleLowerCase()===document.toLocaleLowerCase());
    if(existing){this.clientError='Ya existe un cliente con ese documento. Selecciónalo en el directorio de pasajeros.';return;}
    if(this.clients.some(c=>c.email?.toLocaleLowerCase()===email)){this.clientError='Ya existe un cliente con ese correo. Búscalo en el directorio de pasajeros.';return;}
    // The existing account API requires credentials. Use an unpredictable initial
    // password rather than the document; never persist it in browser storage.
    const random=crypto.getRandomValues(new Uint32Array(8));
    const password='Aa!'+Array.from(random,n=>n.toString(36)).join('');
    this.creatingClient=true;
    this.clientsApi.crear({username:document,first_name:names.slice(0,-1).join(' '),last_name:names[names.length-1],email,telephone,identification_number:document,password}).subscribe({
      next:client=>{this.clients=[...this.clients.filter(c=>c.id!==client.id),client];this.clientId=client.id;this.search='';this.addingClient=false;this.creatingClient=false;this.paid=false;this.newClient={name:'',telephone:'',email:'',documentType:'CC',documentNumber:''};this.clientNotice='Cliente creado y seleccionado para la venta. El tipo de documento aún no se almacena en el sistema.';},
      error:(err)=>{this.creatingClient=false;this.clientError=err.status===400?'No se pudo crear el cliente. Revisa si el documento o el correo ya están registrados.':err.status===403?'Tu cuenta no tiene permisos para crear clientes.':err.status===401?'La sesión venció. Inicia sesión nuevamente.':'No se pudo confirmar el registro. Verifica el directorio antes de reintentar; el servicio de cuentas puede requerir corrección.';}
    });
  }
  loading=false;saving=false;error='';uncertain=false;result:SaleResult|null=null;
  clients:Cliente[]=[];trips:SaleTrip[]=[];seats:SaleSeat[]=[];fares:SaleFare[]=[];tickets:SaleTicket[]=[];routes:Ruta[]=[];
  tripId:number|null=null;clientId:number|null=null;seatId:number|null=null;search='';payment:AdminSalePayload['payment_method']='cash';paid=false;
  constructor(private sales:VentaService,private clientsApi:ClienteService,private routesApi:RutaService,private route:ActivatedRoute){}
  ngOnInit():void{this.cargar();}
  get locked():boolean{return this.creatingClient||this.loading||this.saving||this.uncertain||!!this.result;}
  get trip():SaleTrip|undefined{return this.trips.find(t=>t.id===this.tripId);}
  get client():Cliente|undefined{return this.clients.find(c=>c.id===this.clientId);}
  get seat():SaleSeat|undefined{return this.availableSeats.find(s=>s.id===this.seatId);}
  get amount():number|null{const fare=this.fares.find(f=>f.trip===this.tripId);return fare&&Number.isInteger(fare.amount_cents)&&fare.amount_cents>0?fare.amount_cents/100:null;}
  get availableSeats():SaleSeat[]{return this.seats.filter(s=>s.bus===this.trip?.bus).sort((a,b)=>a.row.localeCompare(b.row,undefined,{numeric:true})||a.col.localeCompare(b.col,undefined,{numeric:true}));}
  get filteredClients():Cliente[]{const q=this.search.trim().toLocaleLowerCase();return this.clients.filter(c=>!q||[this.nombre(c),c.identification_number,c.email].join(' ').toLocaleLowerCase().includes(q)).slice(0,20);}
  nombre(c:Cliente):string{return [c.first_name,c.last_name].filter(Boolean).join(' ').trim()||c.username;}
  tripLabel(t:SaleTrip):string{const r=this.routes.find(r=>r.id===t.route);return '#'+t.id+' · '+(r?r.origen+' → '+r.destino:'Ruta #'+t.route);}
  sold(id:number):boolean{return this.tickets.some(t=>t.trip===this.tripId&&t.seat===id&&t.status==='issued');}
  get ready():boolean{const c=this.client;return !this.addingClient&&!this.locked&&!!this.trip&&!!this.seat&&!this.sold(this.seatId!)&&this.amount!==null&&!!c?.identification_number&&!!c.email&&!!c.telephone&&this.paid;}
  changeTrip():void{this.seatId=null;this.paid=false;}
  selectSeat(s:SaleSeat):void{if(this.locked||this.sold(s.id))return;this.seatId=s.id;this.paid=false;}
  cargar():void{
    if(this.locked)return;this.loading=true;this.error='';
    forkJoin({catalog:this.sales.catalogos(),clients:this.clientsApi.listar(),routes:this.routesApi.listar()}).subscribe({next:({catalog,clients,routes})=>{
      this.trips=catalog.trips.filter(t=>t.trip_state==='scheduled'&&new Date(t.date_time_start).getTime()>Date.now());this.seats=catalog.seats;this.fares=catalog.fares;this.tickets=catalog.tickets;this.clients=clients;this.routes=routes;
      if(!this.trip)this.tripId=null;this.seatId=null;this.paid=false;
      const id=Number(this.route.snapshot.queryParamMap.get('cliente'));if(!this.clientId&&clients.some(c=>c.id===id))this.clientId=id;this.loading=false;
    },error:()=>{this.loading=false;this.error='No se pudieron cargar los viajes, clientes, tarifas o sillas. Revisa tu sesión, permisos y la disponibilidad de la API.';this.trips=[];this.seats=[];}});
  }
  emitir():void {
    if(!this.ready)return;
    if(new Date(this.trip!.date_time_start).getTime()<=Date.now()){this.error='El viaje ya no admite ventas desde esta pantalla. Actualiza los datos.';return;}
    const c=this.client!;
    if(!globalThis.confirm('Se registrará una venta pagada y se emitirá el tiquete. ¿Confirmas que recibiste el pago?'))return;
    const payload:AdminSalePayload={trip:this.tripId!,seat:this.seatId!,identification_number:c.identification_number,name:this.nombre(c),email:c.email,telephone:c.telephone!,payment_method:this.payment};
    this.saving=true;this.error='';
    this.sales.tiquetes().subscribe({next:tickets=>{
      this.tickets=tickets;if(this.sold(payload.seat)){this.saving=false;this.seatId=null;this.paid=false;this.error='Esta silla ya fue vendida. Selecciona otra.';return;}
      this.sales.crear(payload).subscribe({next:result=>{this.result=result;this.saving=false;this.paid=false;},error:err=>{
        this.saving=false;this.paid=false;
        if(err.status===400||err.status===401||err.status===403||err.status===404||err.status===409){this.error=typeof err.error?.detail==='string'?err.error.detail:'No se pudo registrar la venta. Revisa los datos, permisos y disponibilidad de la silla.';}
        else{this.uncertain=true;this.error='No se pudo confirmar el resultado. Verifica la venta y el tiquete en el servidor antes de intentar otra operación; podría haberse registrado.';}
      }});
    },error:()=>{this.saving=false;this.error='No se pudo verificar la disponibilidad de la silla. No se envió la venta.';}});
  }
}


