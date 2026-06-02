import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Conductor } from '../../core/models/conductor.model';
import { ConductorService } from '../../core/services/conductor.service';

@Component({
  selector: 'app-conductor-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './conductor-list.component.html',
  styleUrl: './conductor.component.css'
})
export class ConductorListComponent implements OnInit {
  conductores: Conductor[] = [];
  loading = false;
  error = '';
  success = '';

  constructor(private conductorService: ConductorService) {}

  ngOnInit(): void {
    this.cargarConductores();
  }

  cargarConductores(): void {
    this.loading = true;
    this.error = '';
    this.conductorService.listar().subscribe({
      next: (conductores) => {
        this.conductores = conductores;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los conductores.';
        this.loading = false;
      }
    });
  }

  eliminarConductor(conductor: Conductor): void {
    if (!conductor.id || !confirm(`¿Eliminar el conductor ${conductor.nombre}?`)) {
      return;
    }

    this.conductorService.eliminar(conductor.id).subscribe({
      next: () => {
        this.success = 'Conductor eliminado correctamente.';
        this.cargarConductores();
      },
      error: () => {
        this.error = 'No se pudo eliminar el conductor.';
      }
    });
  }
}
