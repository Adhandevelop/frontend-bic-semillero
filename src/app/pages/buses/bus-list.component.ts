import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './bus-list.component.html',
  styleUrl: './bus.component.css'
})
export class BusListComponent implements OnInit {
  buses: Bus[] = [];
  loading = false;
  error = '';
  success = '';

  constructor(private busService: BusService) {}

  ngOnInit(): void {
    this.cargarBuses();
  }

  cargarBuses(): void {
    this.loading = true;
    this.error = '';
    this.busService.listar().subscribe({
      next: (buses) => {
        this.buses = buses;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los buses.';
        this.loading = false;
      }
    });
  }

  eliminarBus(bus: Bus): void {
    if (!bus.id || !confirm(`¿Eliminar el bus ${bus.placa}?`)) {
      return;
    }

    this.busService.eliminar(bus.id).subscribe({
      next: () => {
        this.success = 'Bus eliminado correctamente.';
        this.cargarBuses();
      },
      error: () => {
        this.error = 'No se pudo eliminar el bus.';
      }
    });
  }
}
