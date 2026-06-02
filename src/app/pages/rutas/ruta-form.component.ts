import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Ruta } from '../../core/models/ruta.model';
import { RutaService } from '../../core/services/ruta.service';

@Component({
  selector: 'app-ruta-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './ruta-form.component.html',
  styleUrl: './ruta.component.css'
})
export class RutaFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  loading = false;
  error = '';
  success = '';
  editando = false;
  rutaId?: number;

  form = this.fb.nonNullable.group({
    origen: ['', Validators.required],
    destino: ['', Validators.required],
    distancia_km: [null as number | null, Validators.min(1)],
    estado: ['activa' as Ruta['estado'], Validators.required]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rutaService: RutaService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.editando = true;
      this.rutaId = id;
      this.cargarRuta(id);
    }
  }

  cargarRuta(id: number): void {
    this.loading = true;
    this.rutaService.obtenerPorId(id).subscribe({
      next: (ruta) => {
        this.form.patchValue(ruta);
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la ruta.';
        this.loading = false;
      }
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    const ruta = this.form.getRawValue();
    const payload: Ruta = {
      origen: ruta.origen,
      destino: ruta.destino,
      estado: ruta.estado,
      ...(ruta.distancia_km ? { distancia_km: ruta.distancia_km } : {})
    };
    const request = this.editando && this.rutaId
      ? this.rutaService.actualizar(this.rutaId, payload)
      : this.rutaService.crear(payload);

    request.subscribe({
      next: () => {
        this.success = this.editando ? 'Ruta actualizada correctamente.' : 'Ruta creada correctamente.';
        this.router.navigateByUrl('/rutas');
      },
      error: () => {
        this.error = 'No se pudo guardar la ruta.';
        this.loading = false;
      }
    });
  }
}
