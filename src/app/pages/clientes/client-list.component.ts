import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente, ClienteService } from '../../core/services/cliente.service';
@Component({selector:'app-client-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./client-list.component.html',styleUrl:'./client-list.component.css'})
export class ClientListComponent implements OnInit {
  clientes:Cliente[]=[];loading=false;error='';searchValue='';page=1;readonly pageSize=6;
  contactFilter='all';selectedClient:Cliente|null=null;notice='';
  constructor(private clienteService:ClienteService){}
  ngOnInit():void{this.cargar();}
  nombre(c:Cliente):string{return [c.first_name,c.last_name].filter(Boolean).join(' ').trim()||c.username;}
  initials(c:Cliente):string{return this.nombre(c).split(/\s+/).slice(0,2).map(s=>s[0]).join('').toLocaleUpperCase();}
  get withContact():number{return this.clientes.filter(c=>c.email?.trim()||c.telephone?.trim()).length;}
  get filteredClients():Cliente[]{const q=this.searchValue.trim().toLocaleLowerCase();return this.clientes.filter(c=>(this.contactFilter==='all'||(this.contactFilter==='email'?!!c.email?.trim():this.contactFilter==='phone'?!!c.telephone?.trim():!c.email?.trim()&&!c.telephone?.trim()))&&(!q||[this.nombre(c),c.username,c.identification_number,c.email,c.telephone].join(' ').toLocaleLowerCase().includes(q)));}
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
    this.clienteService.listar().subscribe({next:clients=>{this.clientes=clients;this.loading=false;this.page=Math.min(this.page,this.pageCount);},error:(error:{status?:number})=>{this.loading=false;this.clientes=[];this.error=error.status===403?'Tu cuenta no tiene permisos para consultar clientes.':error.status===401?'La sesión venció. Inicia sesión nuevamente.':'No se pudieron cargar los clientes. Revisa la conexión con la API.';}});
  }
}
