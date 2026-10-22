import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NEXT_TRIP_DEMO, PASSENGER_DEMO, TRIP_HISTORY_DEMO } from './client-panel.data';

@Component({
  selector: 'app-client-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './client-panel.component.html',
  styleUrl: './client-panel.component.css'
})
export class ClientPanelComponent {
  readonly passenger = PASSENGER_DEMO;
  readonly nextTrip = NEXT_TRIP_DEMO;
  readonly history = TRIP_HISTORY_DEMO;
  message = '';

  pending(action: string): void {
    this.message = `${action}: esta función estará disponible al conectar los servicios del portal de pasajeros.`;
  }

  money(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0
    }).format(value) + ' COP';
  }
}
