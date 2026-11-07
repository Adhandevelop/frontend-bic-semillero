import { fleetError } from '../../core/utils/fleet-error';
import { timeout } from 'rxjs';
import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
﻿import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports:[ListOrderComponent,CommonModule, FormsModule, RouterLink],
  templateUrl: './bus-list.component.html',
  styleUrls: ['./bus-list.component.css','./fleet-list-controls.css']
})
export class BusListComponent implements OnInit {
  listOrder:ListOrder='desc';
  buses: Bus[] = [];
  loading = false;
  error = '';
  success = '';
  searchValue = '';
  stateFilter='';typeFilter='';page=1;readonly pageSize=7;
  get types(){return [...new Map(this.buses.filter(b=>b.bus_type_detail).map(b=>[b.bus_type_detail!.id,b.bus_type_detail!])).values()];}
  get pageCount(){return Math.max(1,Math.ceil(this.filteredBuses.length/this.pageSize));}
  get currentPage(){return Math.min(this.page,this.pageCount);}
  get visibleBuses(){return this.filteredBuses.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize);}
  get lastResult(){return Math.min(this.currentPage*this.pageSize,this.filteredBuses.length);}
  deletingId: number | null = null;
  loadFailed = false;

  get activeCount(): number { return this.buses.filter(bus => bus.state === 'Active').length; }
  get inactiveCount(): number { return this.buses.filter(bus => bus.state === 'Inactive').length; }
  get maintenanceCount(): number { return this.buses.filter(bus => bus.state === 'Maintenance').length; }
  get activePercentage(): number { return this.buses.length ? Math.round(this.activeCount / this.buses.length * 100) : 0; }
  get filteredBuses(): Bus[] {
    const query = this.searchValue.trim().toLocaleLowerCase();
    return orderRecords(this.buses.filter(bus => (!this.stateFilter || bus.state === this.stateFilter) && (!this.typeFilter || (this.typeFilter==='none' ? !bus.bus_type : String(bus.bus_type)===this.typeFilter)) &&
      (!query || `${bus.id ?? ''} ${bus.plate} ${bus.model ?? ''} ${bus.bus_type_detail?.name ?? ''}`.toLocaleLowerCase().includes(query))),this.listOrder);
  }

  stateLabel(state: Bus['state']): string {
    return state === 'Active' ? 'Activo' : state === 'Inactive' ? 'Inactivo' : state === 'Maintenance' ? 'Mantenimiento' : 'Sin estado';
  }

  clearFilters(): void { this.searchValue = '';this.stateFilter='';this.typeFilter='';this.page=1; }


  exportCsv():void {if(this.loading||this.loadFailed||!this.filteredBuses.length)return;const rows=[['ID','Placa','Modelo','Tipo','Sillas','Estado'],...this.filteredBuses.map(b=>[String(b.id??''),b.plate,b.model??'',b.bus_type_detail?.name??'Sin tipo',String(b.capacity),this.stateLabel(b.state)])];const csv=rows.map(row=>row.map(v=>'"'+(/^[=+@\-\t\r\n]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download='buses.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  constructor(private busService: BusService) {}

  ngOnInit(): void {
    this.cargarBuses();
  }

  cargarBuses(): void {
    if (this.loading) return;
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    this.busService.listarTodos().subscribe({
      next: (buses) => {
        this.buses = buses;
        this.loading = false;
      },
      error: () => {
        this.buses = [];
        this.loadFailed = true;
        this.error = 'No se pudieron cargar los buses.';
        this.loading = false;
      }
    });
  }

  eliminarBus(bus: Bus): void {
    if (this.deletingId !== null || this.loading || !bus.id || !confirm(`¿Eliminar el bus ${bus.plate}?`)) {
      return;
    }
    this.deletingId = bus.id;
    this.error = '';
    this.success = '';
    this.busService.eliminar(bus.id).pipe(timeout(20000)).subscribe({
      next: () => {
        this.deletingId = null;
        this.success = 'Bus eliminado correctamente.';
        this.cargarBuses();
      },
      error: err => {
        this.deletingId = null;
        this.error = fleetError(err,'eliminar el bus');
      }
    });
  }
}
