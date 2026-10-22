import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Cliente, ClienteService } from '../../core/services/cliente.service';
@Component({selector:'app-client-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./client-list.component.html',styleUrl:'./client-list.component.css'})
export class ClientListComponent implements OnInit {
  clientes:Cliente[]=[];
  loading=false;
  error='';
  searchValue='';
  page=1;
  readonly pageSize=10;
  constructor(private clienteService:ClienteService){}
  ngOnInit():void{this.cargar();}
  nombre(client:Cliente):string{return [client.first_name,client.last_name].filter(Boolean).join(' ').trim()||client.username;}
  get filteredClients():Cliente[]{const query=this.searchValue.trim().toLocaleLowerCase();return this.clientes.filter(client=>!query||[this.nombre(client),client.username,client.identification_number,client.email,client.telephone].join(' ').toLocaleLowerCase().includes(query));}
  get pageCount():number{return Math.max(1,Math.ceil(this.filteredClients.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visibleClients():Cliente[]{return this.filteredClients.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  cargar():void{
    if(this.loading)return;this.loading=true;this.error='';
    this.clienteService.listar().subscribe({next:clients=>{this.clientes=clients;this.loading=false;this.page=Math.min(this.page,this.pageCount);},error:(error:{status?:number})=>{this.loading=false;this.clientes=[];this.error=error.status===403?'Tu cuenta no tiene permisos para consultar clientes.':error.status===401?'La sesión venció. Inicia sesión nuevamente.':'No se pudieron cargar los clientes. Revisa la conexión con la API.';}});
  }
}
