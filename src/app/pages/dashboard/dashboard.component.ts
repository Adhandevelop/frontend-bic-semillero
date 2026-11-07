import { TripSalesMetadata } from '../../core/utils/trip-sales';
import { TripControlComponent } from './trip-control/trip-control.component';
import { RutaService } from '../../core/services/ruta.service';
import { Ruta } from '../../core/models/ruta.model';
import { ListOrder, orderRecords } from '../../core/utils/list-order';
import { ListOrderComponent } from '../../shared/list-order/list-order.component';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, Subject, takeUntil, timeout } from 'rxjs';
import { Bus, normalizeBus } from '../../core/models/bus.model';
import { Conductor } from '../../core/models/conductor.model';
import { DashboardService } from '../../core/services/dashboard.service';

interface TripSummary extends TripSalesMetadata { id: number; bus: number; driver: number; route: number; date_time_start: string; trip_state: string; }
type RouteSummary=Ruta;
@Component({
  selector: 'app-dashboard', standalone: true,
  imports:[TripControlComponent,ListOrderComponent,CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html', styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit,OnDestroy {
  private routeApi=inject(RutaService);private destroyed=new Subject<void>();private refresh=new Subject<void>();
  sales:Array<{id:number;status:string}>=[];
  get refundCount():number{return this.sales.filter(sale=>sale.status==='refund_required').length;}
  private stateTimer?:ReturnType<typeof setInterval>;
  ngOnDestroy():void{if(this.stateTimer)clearInterval(this.stateTimer);this.refresh.next();this.refresh.complete();this.destroyed.next();this.destroyed.complete();}
  listOrder:ListOrder='desc';
  readonly currentYear = new Date().getFullYear();
  loading = true;
  errors: string[] = [];
  buses: Bus[] = [];
  drivers: Conductor[] = [];
  trips: TripSummary[] = [];
  routes: RouteSummary[] = [];
  searchValue = '';
  onlyActive = false;
  updatedAt: Date | null = null;
  constructor(private dashboardService: DashboardService) {}
  ngOnInit(): void { this.cargarResumen(); this.stateTimer=setInterval(()=>{if(document.visibilityState==='visible'&&!this.loading)this.cargarResumen();},60000); }
  cargarResumen(): void {
    if (this.loading && this.updatedAt) return;
    this.refresh.next();this.loading = true;
    this.errors = [];
    const load = <T>(resource: string, label: string) => this.dashboardService.listar<T>(resource).pipe(timeout(20000),
      catchError(() => { this.errors.push(label); return of(null); })
    );
    forkJoin({ buses: load<Bus>('fleet/buses', 'buses'), drivers: load<Conductor>('fleet/drivers', 'conductores'),
      trips: load<TripSummary>('trips/trips', 'viajes'), routes: this.routeApi.listar().pipe(timeout(20000),catchError(()=>{this.errors.push('rutas');return of(null);})), sales:load<{id:number;status:string}>('sales/sales','ventas')
    }).pipe(takeUntil(this.refresh),takeUntil(this.destroyed)).subscribe(result => {
      this.buses = (result.buses ?? []).map(normalizeBus);
      this.drivers = result.drivers ?? [];
      this.trips = result.trips ?? [];
      this.routes = result.routes ?? [];this.sales=result.sales??[];
      this.updatedAt = new Date();
      this.loading = false;
    });
  }
  get activeCount(): number { return this.buses.filter(bus => bus.state === 'Active').length; }
  get maintenanceCount(): number { return this.buses.filter(bus => bus.state === 'Maintenance').length; }
  get filteredBuses(): Bus[] {
    const query = this.searchValue.trim().toLowerCase();
    return orderRecords(this.buses.filter(bus => (!this.onlyActive || bus.state === 'Active') &&
      (!query || `${bus.id} ${bus.plate} ${bus.model ?? ''}`.toLowerCase().includes(query))),this.listOrder);
  }
  get filteredDrivers(): Conductor[] {
    const query = this.searchValue.trim().toLowerCase();
    return orderRecords(this.drivers.filter(driver => !query || `${driver.full_name} ${driver.license_number}`.toLowerCase().includes(query)),this.listOrder).slice(0, 6);
  }
  stateLabel(state: Bus['state']): string {
    return state === 'Active' ? 'Activo' : state === 'Inactive' ? 'Inactivo' : state === 'Maintenance' ? 'Mantenimiento' : 'Sin estado';
  }
  exportReport(): void {
    const rows = [['ID', 'Placa', 'Modelo', 'Estado', 'Capacidad'], ...this.filteredBuses.map(bus =>
      [String(bus.id ?? ''), bus.plate, bus.model ?? '', this.stateLabel(bus.state), String(bus.capacity)])];
    const csv = rows.map(row => row.map(value => {
      const safe = /^[=+@\-\t\r\n]/.test(value) ? `'${value}` : value;
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'informe-flota.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
