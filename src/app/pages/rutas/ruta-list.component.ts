import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Ruta } from '../../core/models/ruta.model';
import { RutaService } from '../../core/services/ruta.service';

@Component({
  selector: 'app-ruta-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ruta-list.component.html',
  styleUrl: './ruta.component.css'
})
export class RutaListComponent implements OnInit {
  rutas: Ruta[] = [];
  loading = false;
  error = '';
  success = '';

  constructor(private rutaService: RutaService) {}

  ngOnInit(): void {
    this.cargarRutas();
  }

  cargarRutas(): void {
    this.loading = true;
    this.error = '';
    this.rutaService.listar().subscribe({
      next: (rutas) => {
        this.rutas = rutas;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar las rutas.';
        this.loading = false;
      }
    });
  }

  eliminarRuta(ruta: Ruta): void {
    if (!ruta.id || !confirm(`¿Eliminar la ruta ${ruta.origen} - ${ruta.destino}?`)) {
      return;
    }

    this.rutaService.eliminar(ruta.id).subscribe({
      next: () => {
        this.success = 'Ruta eliminada correctamente.';
        this.cargarRutas();
      },
      error: () => {
        this.error = 'No se pudo eliminar la ruta.';
      }
    });
  }
}
