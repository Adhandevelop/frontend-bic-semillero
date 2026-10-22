import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BOOKING_TRIPS, DemoSeat, DemoTrip } from './booking.data';

@Component({
  selector: 'app-booking', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './booking.component.html', styleUrl: './booking.component.css'
})
export class BookingComponent {
  private readonly fb = inject(FormBuilder);
  readonly trips = BOOKING_TRIPS;
  readonly terminalFee = 6500;
  selectedTrip = this.trips[0];
  selectedSeat: DemoSeat | null = this.selectedTrip.seats.find(seat => seat.id === '14A')!;
  floor = 2;
  message = '';
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)]],
    documentType: ['CC', Validators.required],
    documentNumber: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9-]{5,20}$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],
    email: ['', [Validators.required, Validators.email]],
    terms: [false, Validators.requiredTrue]
  });

  get discount(): number { return Math.round(this.selectedTrip.price * 0.15); }
  get total(): number { return this.selectedTrip.price + this.terminalFee - this.discount; }
  get floors(): number[] { return [...new Set(this.selectedTrip.seats.map(seat => seat.floor))]; }
  get visibleSeats(): DemoSeat[] { return this.selectedTrip.seats.filter(seat => seat.floor === this.floor); }

  available(trip: DemoTrip): number { return trip.seats.filter(seat => !seat.occupied).length; }

  selectTrip(id: number): void {
    const trip = this.trips.find(item => item.id === id);
    if (!trip || trip.id === this.selectedTrip.id) return;
    this.selectedTrip = trip;
    this.selectedSeat = null;
    this.floor = this.floors[0];
    this.message = '';
  }

  selectSeat(id: string): void {
    const seat = this.selectedTrip.seats.find(item => item.id === id && item.floor === this.floor);
    if (!seat || seat.occupied) return;
    this.selectedSeat = seat;
    this.message = '';
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  money(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value) + ' COP';
  }

  checkout(): void {
    this.form.markAllAsTouched();
    if (!this.selectedSeat) { this.message = 'Selecciona un asiento disponible para continuar.'; return; }
    if (this.form.invalid) { this.message = 'Revisa los datos del pasajero y acepta los términos para continuar.'; return; }
    this.message = 'Simulación completada. El pago y la reserva aún no están disponibles. No se ha reservado el puesto ni realizado ningún cobro; tus datos no se han enviado ni guardado.';
  }
}
