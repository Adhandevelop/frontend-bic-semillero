import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
﻿import { Subscription } from 'rxjs';
import { ClientRelatedBusesComponent } from './client-related-buses.component';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Cliente, ClienteService } from '../../core/services/cliente.service';
@Component({selector:'app-client-list',standalone:true,imports:[ListOrderComponent,CommonModule,FormsModule,RouterLink,ClientRelatedBusesComponent],templateUrl:'./client-list.component.html',styleUrl:'./client-list.component.css'})
export class ClientListComponent implements OnInit,OnDestroy {
  listOrder:ListOrder='desc';
  clientes:Cliente[]=[];loading=false;error='';searchValue='';page=1;readonly pageSize=6;
  contactFilter='all';selectedClient:Cliente|null=null;notice='';
  private querySubscription?:Subscription;private contextClient=0;
  constructor(private clienteService:ClienteService,private route:ActivatedRoute){}
  ngOnInit():void{this.querySubscription=this.route.queryParamMap.subscribe(params=>{const id=Number(params.get('cliente'));this.contextClient=Number.isSafeInteger(id)&&id>0?id:0;if(this.contextClient&&this.clientes.length){const client=this.clientes.find(c=>c.id===this.contextClient);if(client)this.viewClient(client);}});this.cargar();}
  viewClient(client:Cliente):void{this.selectedClient=client;setTimeout(()=>{const detail=document.getElementById('admin-client-detail');detail?.scrollIntoView({behavior:'smooth',block:'start'});detail?.focus({preventScroll:true});});}
  ngOnDestroy():void{this.querySubscription?.unsubscribe();}
  nombre(c:Cliente):string{return [c.first_name,c.last_name].filter(Boolean).join(' ').trim()||c.username;}
  initials(c:Cliente):string{return this.nombre(c).split(/\s+/).slice(0,2).map(s=>s[0]).join('').toLocaleUpperCase();}
  get withContact():number{return this.clientes.filter(c=>c.email?.trim()||c.telephone?.trim()).length;}
  get filteredClients():Cliente[]{const q=this.searchValue.trim().toLocaleLowerCase();return orderRecords(this.clientes.filter(c=>(this.contactFilter==='all'||(this.contactFilter==='email'?!!c.email?.trim():this.contactFilter==='phone'?!!c.telephone?.trim():!c.email?.trim()&&!c.telephone?.trim()))&&(!q||[this.nombre(c),c.username,c.identification_number,c.email,c.telephone].join(' ').toLocaleLowerCase().includes(q))),this.listOrder);}
  get pageCount():number{return Math.max(1,Math.ceil(this.filteredClients.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visibleClients():Cliente[]{return this.filteredClients.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  clearFilters():void{this.searchValue='';this.contactFilter='all';this.page=1;}
  pending(message:string):void{this.notice=message;}
  exportCsv():void{
    if(this.loading||this.error||!this.filteredClients.length)return;
    const cell=(value:unknown)=>{let text=String(value??'');if(/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    const rows=[['ID','Nombre','Usuario','Documento','Correo','Teléfono'],...this.filteredClients.map(c=>[c.id,this.nombre(c),c.username,c.identification_number,c.email,c.telephone])];
    const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='clientes.csv';link.click();URL.revokeObjectURL(url);
  }
  cargar():void{
    if(this.loading)return;this.loading=true;this.error='';this.selectedClient=null;
    this.clienteService.listar().subscribe({next:clients=>{this.clientes=clients;this.loading=false;const context=clients.find(c=>c.id===this.contextClient);if(context)this.viewClient(context);this.page=Math.min(this.page,this.pageCount);},error:(error:{status?:number})=>{this.loading=false;this.clientes=[];this.error=error.status===403?'Tu cuenta no tiene permisos para consultar clientes.':error.status===401?'La sesión venció. Inicia sesión nuevamente.':'No se pudieron cargar los clientes. Revisa la conexión con la API.';}});
  }
}
