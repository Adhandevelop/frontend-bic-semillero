import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Ruta } from '../../core/models/ruta.model';
import { RutaService } from '../../core/services/ruta.service';
import { RutaMapComponent } from './ruta-map.component';
@Component({selector:'app-ruta-list',standalone:true,imports:[CommonModule,FormsModule,RouterLink,RutaMapComponent],templateUrl:'./ruta-list.component.html',styleUrl:'./ruta-list.component.css'})
export class RutaListComponent implements OnInit {
  rutas:Ruta[]=[];loading=false;loadFailed=false;error='';success='';
  searchValue='';originFilter='';distanceFilter='';page=1;readonly pageSize=9;deletingId:number|null=null;
  selectedRoute:Ruta|null=null;notice='';updatedAt:Date|null=null;
  constructor(private rutaService:RutaService){}
  ngOnInit():void{this.cargarRutas();}
  hasDistance(route:Ruta):boolean{return route.distancia_km!=null&&Number.isFinite(route.distancia_km)&&route.distancia_km>=0;}
  get totalKm():number{return this.rutas.reduce((total,route)=>total+(this.hasDistance(route)?route.distancia_km!:0),0);}
  get measuredCount():number{return this.rutas.filter(route=>this.hasDistance(route)).length;}
  get connectedCount():number{return new Set(this.rutas.flatMap(route=>[route.origen_id!=null?'id:'+route.origen_id:'name:'+route.origen,route.destino_id!=null?'id:'+route.destino_id:'name:'+route.destino])).size;}
  get origins():string[]{return [...new Set(this.rutas.map(route=>route.origen))].sort();}
  get filteredRoutes():Ruta[]{
    const query=this.searchValue.trim().toLocaleLowerCase();
    return this.rutas.filter(route=>(!query||[route.id,route.origen,route.destino].join(' ').toLocaleLowerCase().includes(query))&&(!this.originFilter||route.origen===this.originFilter)&&(!this.distanceFilter||(this.distanceFilter==='unknown'?!this.hasDistance(route):this.hasDistance(route)&&(this.distanceFilter==='short'?route.distancia_km!<200:this.distanceFilter==='medium'?route.distancia_km!>=200&&route.distancia_km!<500:route.distancia_km!>=500))));
  }
  get pageCount():number{return Math.max(1,Math.ceil(this.filteredRoutes.length/this.pageSize));}
  get currentPage():number{return Math.min(this.page,this.pageCount);}
  get visibleRoutes():Ruta[]{return this.filteredRoutes.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  get firstResult():number{return this.filteredRoutes.length?(this.currentPage-1)*this.pageSize+1:0;}
  get lastResult():number{return Math.min(this.currentPage*this.pageSize,this.filteredRoutes.length);}
  changePage(delta:number):void{this.page=Math.max(1,Math.min(this.pageCount,this.currentPage+delta));}
  clearFilters():void{this.searchValue='';this.originFilter='';this.distanceFilter='';this.page=1;}
  cargarRutas():void{
    if(this.loading||this.deletingId!==null)return;this.loading=true;this.loadFailed=false;this.error='';
    const selectedId=this.selectedRoute?.id;
    this.rutaService.listar().subscribe({next:routes=>{this.rutas=routes;this.selectedRoute=routes.find(route=>route.id===selectedId)||routes[0]||null;this.loading=false;this.page=Math.min(this.page,this.pageCount);this.updatedAt=new Date();},error:(error:{status?:number})=>{this.loading=false;this.loadFailed=true;this.rutas=[];this.selectedRoute=null;this.error=error.status===401?'La sesión venció. Inicia sesión nuevamente.':error.status===403?'No tienes permisos para consultar las rutas.':'No se pudieron cargar las rutas. Revisa la conexión con la API.';}});
  }
  eliminarRuta(route:Ruta):void{
    if(this.loading||this.deletingId!==null||!route.id||!confirm('¿Eliminar la ruta '+route.origen+' → '+route.destino+'?'))return;
    this.deletingId=route.id;this.error='';this.success='';
    this.rutaService.eliminar(route.id).subscribe({next:()=>{this.rutas=this.rutas.filter(item=>item.id!==route.id);if(this.selectedRoute?.id===route.id)this.selectedRoute=this.rutas[0]||null;this.deletingId=null;this.page=Math.min(this.page,this.pageCount);this.success='Ruta eliminada correctamente.';},error:()=>{this.deletingId=null;this.error='No se pudo eliminar la ruta. Comprueba sus asociaciones y permisos en el backend.';}});
  }
  exportCsv():void{
    if(this.loading||this.loadFailed||!this.filteredRoutes.length)return;
    const rows=[['ID','Origen','Destino','Distancia km'],...this.filteredRoutes.map(route=>[String(route.id??''),route.origen,route.destino,this.hasDistance(route)?String(route.distancia_km):''])];
    const csv=rows.map(row=>row.map(value=>'"'+(/^[\s]*[=+@-]/.test(value)?"'"+value:value).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='rutas.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
}
