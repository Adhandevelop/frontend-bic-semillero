import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  searchMode = 'Número de viaje';
  searchValue = '';
  searchMessage = '';

  seleccionarBusqueda(mode: string): void {
    this.searchMode = mode;
    this.searchValue = '';
    this.searchMessage = '';
  }

  buscarTrayecto(): void {
    const value = this.searchValue.trim();
    this.searchMessage = value
      ? `Consulta recibida para ${this.searchMode.toLowerCase()}: ${value}.`
      : 'Ingresa un código para consultar tu trayecto.';
  }
}
