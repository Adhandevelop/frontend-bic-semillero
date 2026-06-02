import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { BusService } from '../../core/services/bus.service';
import { ConductorService } from '../../core/services/conductor.service';
import { RutaService } from '../../core/services/ruta.service';
import { ViajeService } from '../../core/services/viaje.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  loading = false;
  error = '';
  success = '';

  totalBuses = 0;
  totalConductores = 0;
  totalRutas = 0;
  totalViajes = 0;

  constructor(
    private busService: BusService,
    private conductorService: ConductorService,
    private rutaService: RutaService,
    private viajeService: ViajeService
  ) {}

  ngOnInit(): void {
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      buses: this.busService.listar(),
      conductores: this.conductorService.listar(),
      rutas: this.rutaService.listar(),
      viajes: this.viajeService.listar()
    }).subscribe({
      next: ({ buses, conductores, rutas, viajes }) => {
        this.totalBuses = buses.length;
        this.totalConductores = conductores.length;
        this.totalRutas = rutas.length;
        this.totalViajes = viajes.length;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el resumen del sistema.';
        this.loading = false;
      }
    });
  }
}
