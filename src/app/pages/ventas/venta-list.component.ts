import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, catchError, of, timeout } from 'rxjs';
import { SaleResult, SaleSeat, SaleTrip, VentaService } from '../../core/services/venta.service';
import { RutaService } from '../../core/services/ruta.service';
import { Ruta } from '../../core/models/ruta.model';
@Component({selector:'app-venta-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./venta-list.component.html',styleUrl:'./venta-list.component.css'})
export class VentaListComponent implements OnInit {
  sales:SaleResult[]=[];trips:SaleTrip[]=[];seats:SaleSeat[]=[];routes:Ruta[]=[];
  loading=false;error='';warnings:string[]=[];search='';state='';source='';date='';page=1;readonly pageSize=7;
  selected:SaleResult|null=null;detailLoading=false;detailError='';private detailRequest=0;
  constructor(private api:VentaService,private routeApi:RutaService){}
  ngOnInit():void{this.cargar();}
  stateLabel(state:string):string{return ({paid:'Pagada',pending:'Pendiente',failed:'Fallida',expired:'Expirada',cancelled:'Cancelada'} as Record<string,string>)[state]??state;}
  paymentLabel(method?:string):string{return ({cash:'Efectivo',card:'Tarjeta',transfer:'Transferencia',wompi:'Wompi'} as Record<string,string>)[method??'']??(method||'Sin datos');}
  invoiceLabel(sale:SaleResult):string{return ({issued:'Emitida',error:'Error',pending:'Pendiente'} as Record<string,string>)[sale.factus_invoice?.status??'']??'Sin resultado';}
  tripId(sale:SaleResult):number|undefined{return sale.trip??sale.tickets?.[0]?.trip;}
  routeLabel(sale:SaleResult):string{const t=this.trips.find(t=>t.id===this.tripId(sale)),r=this.routes.find(r=>r.id===t?.route);return r?r.origen+' → '+r.destino:'Viaje #'+(this.tripId(sale)??'—');}
  seatLabel(sale:SaleResult):string{const id=sale.seat??sale.tickets?.[0]?.seat;return this.seats.find(s=>s.id===id)?.seat_number??(id?'ID '+id:'Sin datos');}
  get filtered():SaleResult[]{const q=this.search.trim().toLocaleLowerCase();return this.sales.filter(s=>(!this.state||s.status===this.state)&&(!this.source||s.source===this.source)&&(!this.date||this.day(s.created_at)===this.date)&&(!q||[s.id,s.passenger_name,s.passenger_identification,s.passenger_email,this.tripId(s),this.routeLabel(s),s.factus_invoice?.number].join(' ').toLocaleLowerCase().includes(q)));}
  day(value?:string):string{const time=value?Date.parse(value):NaN;return Number.isFinite(time)?new Date(time-5*3600000).toISOString().slice(0,10):'';}
  get pageCount():number{return Math.max(1,Math.ceil(this.filtered.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visible():SaleResult[]{return this.filtered.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  get paidTotal():number{return this.filtered.filter(s=>s.status==='paid').reduce((sum,s)=>sum+(Number.isFinite(s.amount_cents)?s.amount_cents:0),0)/100;}
  count(status:string):number{return this.filtered.filter(s=>s.status===status).length;}
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  clearFilters():void{this.search='';this.state='';this.source='';this.date='';this.page=1;}
  cargar():void{
    if(this.loading)return;this.loading=true;this.error='';this.warnings=[];this.closeDetail();
    this.api.listar().pipe(timeout(15000)).subscribe({next:sales=>{this.sales=[...sales].sort((a,b)=>b.id-a.id);this.loading=false;this.page=Math.min(this.page,this.pageCount);},error:err=>{this.loading=false;this.sales=[];this.error=this.failure(err.status,'cargar las ventas');}});
    forkJoin({catalog:this.api.catalogos().pipe(catchError(()=>{this.warnings.push('No se pudieron cargar los datos de viajes y sillas; se muestran sus IDs.');return of(null);})),routes:this.routeApi.listar().pipe(catchError(()=>{this.warnings.push('No se pudieron cargar las rutas.');return of([]);} ))}).pipe(timeout(15000)).subscribe({next:({catalog,routes})=>{this.trips=catalog?.trips??[];this.seats=catalog?.seats??[];this.routes=routes;},error:()=>{this.warnings.push('La consulta de catálogos agotó el tiempo de espera.');}});
  }
  detail(sale:SaleResult):void{
    const request=++this.detailRequest;this.selected=sale;this.detailLoading=true;this.detailError='';
    this.api.consultar(sale.id).pipe(timeout(15000)).subscribe({next:updated=>{if(request!==this.detailRequest)return;this.selected=updated;this.sales=this.sales.map(s=>s.id===updated.id?updated:s);this.detailLoading=false;},error:err=>{if(request!==this.detailRequest)return;this.detailLoading=false;this.detailError=this.failure(err.status,'actualizar el detalle de la venta');}});
  }
  closeDetail():void{this.detailRequest++;this.selected=null;this.detailLoading=false;this.detailError='';}
  invoiceLink(value?:string):string|null{try{const url=new URL(value??'');return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}}
  private failure(status:number,action:string):string{return status===401?'La sesión venció. Inicia sesión nuevamente.':status===403?'Tu cuenta no tiene permisos para consultar ventas.':'No se pudo '+action+(status?' (HTTP '+status+')':'')+'. Revisa la conexión y el servicio.';}
}
