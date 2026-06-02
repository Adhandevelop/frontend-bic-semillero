import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Viaje } from '../../core/models/viaje.model';
import { ViajeService } from '../../core/services/viaje.service';

@Component({
  selector: 'app-viaje-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './viaje-list.component.html',
  styleUrl: './viaje.component.css'
})
export class ViajeListComponent implements OnInit {
  viajes: Viaje[] = [];
  loading = false;
  error = '';
  success = '';

  constructor(private viajeService: ViajeService) {}

  ngOnInit(): void {
    this.cargarViajes();
  }

  cargarViajes(): void {
    this.loading = true;
    this.error = '';
    this.viajeService.listar().subscribe({
      next: (viajes) => {
        this.viajes = viajes;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los viajes.';
        this.loading = false;
      }
    });
  }

  nombreBus(viaje: Viaje): string {
    return viaje.bus_detalle?.placa || String(viaje.bus);
  }

  nombreConductor(viaje: Viaje): string {
    return viaje.conductor_detalle?.nombre || String(viaje.conductor);
  }

  nombreRuta(viaje: Viaje): string {
    if (viaje.ruta_detalle?.origen && viaje.ruta_detalle?.destino) {
      return `${viaje.ruta_detalle.origen} - ${viaje.ruta_detalle.destino}`;
    }
    return String(viaje.ruta);
  }

  eliminarViaje(viaje: Viaje): void {
    if (!viaje.id || !confirm(`¿Eliminar el viaje ${viaje.id}?`)) {
      return;
    }

    this.viajeService.eliminar(viaje.id).subscribe({
      next: () => {
        this.success = 'Viaje eliminado correctamente.';
        this.cargarViajes();
      },
      error: () => {
        this.error = 'No se pudo eliminar el viaje.';
      }
    });
  }

  iniciarViaje(viaje: Viaje): void {
    this.cambiarEstado(viaje, 'iniciar');
  }

  finalizarViaje(viaje: Viaje): void {
    this.cambiarEstado(viaje, 'finalizar');
  }

  cancelarViaje(viaje: Viaje): void {
    this.cambiarEstado(viaje, 'cancelar');
  }

  private cambiarEstado(viaje: Viaje, accion: 'iniciar' | 'finalizar' | 'cancelar'): void {
    if (!viaje.id) {
      return;
    }

    this.loading = true;
    this.error = '';
    const request = accion === 'iniciar'
      ? this.viajeService.iniciarViaje(viaje.id)
      : accion === 'finalizar'
        ? this.viajeService.finalizarViaje(viaje.id)
        : this.viajeService.cancelarViaje(viaje.id);

    request.subscribe({
      next: () => {
        this.success = `Viaje ${accion === 'iniciar' ? 'iniciado' : accion === 'finalizar' ? 'finalizado' : 'cancelado'} correctamente.`;
        this.cargarViajes();
      },
      error: () => {
        this.error = 'No se pudo cambiar el estado del viaje.';
        this.loading = false;
      }
    });
  }
}
