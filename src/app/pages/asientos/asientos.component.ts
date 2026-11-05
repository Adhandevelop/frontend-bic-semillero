import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil, timeout } from 'rxjs';
import { BusService } from '../../core/services/bus.service';
import { Bus } from '../../core/models/bus.model';
@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./asientos.component.html',styleUrl:'./asientos.component.css'})
export class AsientosComponent implements OnInit,OnDestroy {
  private api=inject(BusService);private destroyed=new Subject<void>();buses:Bus[]=[];loading=false;error='';search='';
  get filtered(){const term=this.search.trim().toLocaleLowerCase();return this.buses.filter(bus=>[bus.id,bus.plate,bus.model].join(' ').toLocaleLowerCase().includes(term));}
  ngOnInit():void{this.load();}
  load():void{if(this.loading)return;this.loading=true;this.error='';this.api.listarTodos().pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:buses=>{this.buses=buses;this.loading=false;},error:err=>{this.loading=false;this.error='No se pudieron consultar los buses'+(err.status?' (HTTP '+err.status+').':'.');}});}
  ngOnDestroy():void{this.destroyed.next();this.destroyed.complete();}
}
