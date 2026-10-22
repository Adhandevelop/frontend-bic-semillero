import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bus-list.component.html',
  styleUrl: './bus-list.component.css'
})
export class BusListComponent implements OnInit {
  buses: Bus[] = [];
  loading = false;
  error = '';
  success = '';
  searchValue = '';
  onlyActive = false;
  deletingId: number | null = null;
  message = '';
  loadFailed = false;

  get activeCount(): number { return this.buses.filter(bus => bus.state === 'Active').length; }
  get inactiveCount(): number { return this.buses.filter(bus => bus.state === 'Inactive').length; }
  get maintenanceCount(): number { return this.buses.filter(bus => bus.state === 'mantenimiento').length; }
  get activePercentage(): number { return this.buses.length ? Math.round(this.activeCount / this.buses.length * 100) : 0; }
  get filteredBuses(): Bus[] {
    const query = this.searchValue.trim().toLocaleLowerCase();
    return this.buses.filter(bus => (!this.onlyActive || bus.state === 'Active') &&
      (!query || `${bus.id ?? ''} ${bus.plate} ${bus.model ?? ''}`.toLocaleLowerCase().includes(query)));
  }

  stateLabel(state: Bus['state']): string {
    return state === 'Active' ? 'Activo' : state === 'Inactive' ? 'Inactivo' : state === 'mantenimiento' ? 'Mantenimiento' : 'Sin estado';
  }

  clearFilters(): void { this.searchValue = ''; this.onlyActive = false; }

  showReport(bus: Bus): void {
    this.message = `Bus ${bus.plate}: estado ${this.stateLabel(bus.state)}. El reporte técnico detallado aún no está disponible.`;
  }

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
    this.busService.eliminar(bus.id).subscribe({
      next: () => {
        this.deletingId = null;
        this.success = 'Bus eliminado correctamente.';
        this.cargarBuses();
      },
      error: () => {
        this.deletingId = null;
        this.error = 'No se pudo eliminar el bus.';
      }
    });
  }
}
