import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { Bus } from '../../core/models/bus.model';
import { Conductor } from '../../core/models/conductor.model';
import { DashboardService } from '../../core/services/dashboard.service';

interface TripSummary { id: number; bus: number; driver: number; route: number; date_time_start: string; trip_state: string; }
interface RouteSummary { id: number; }
@Component({
  selector: 'app-dashboard', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.component.html', styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
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
  ngOnInit(): void { this.cargarResumen(); }
  cargarResumen(): void {
    if (this.loading && this.updatedAt) return;
    this.loading = true;
    this.errors = [];
    const load = <T>(resource: string, label: string) => this.dashboardService.listar<T>(resource).pipe(
      catchError(() => { this.errors.push(label); return of(null); })
    );
    forkJoin({ buses: load<Bus>('fleet/buses', 'buses'), drivers: load<Conductor>('fleet/drivers', 'conductores'),
      trips: load<TripSummary>('trips/trips', 'viajes'), routes: load<RouteSummary>('routes/routes', 'rutas')
    }).subscribe(result => {
      this.buses = result.buses ?? [];
      this.drivers = result.drivers ?? [];
      this.trips = result.trips ?? [];
      this.routes = result.routes ?? [];
      this.updatedAt = new Date();
      this.loading = false;
    });
  }
  get activeCount(): number { return this.buses.filter(bus => bus.state === 'Active').length; }
  get maintenanceCount(): number { return this.buses.filter(bus => bus.state === 'mantenimiento').length; }
  get filteredBuses(): Bus[] {
    const query = this.searchValue.trim().toLowerCase();
    return this.buses.filter(bus => (!this.onlyActive || bus.state === 'Active') &&
      (!query || `${bus.id} ${bus.plate} ${bus.model ?? ''}`.toLowerCase().includes(query)));
  }
  get filteredDrivers(): Conductor[] {
    const query = this.searchValue.trim().toLowerCase();
    return this.drivers.filter(driver => !query || `${driver.full_name} ${driver.license_number}`.toLowerCase().includes(query)).slice(0, 6);
  }
  stateLabel(state: Bus['state']): string {
    return state === 'Active' ? 'Activo' : state === 'Inactive' ? 'Inactivo' : state === 'mantenimiento' ? 'Mantenimiento' : 'Sin estado';
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
