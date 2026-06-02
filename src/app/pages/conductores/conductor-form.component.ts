import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Conductor } from '../../core/models/conductor.model';
import { ConductorService } from '../../core/services/conductor.service';

@Component({
  selector: 'app-conductor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './conductor-form.component.html',
  styleUrl: './conductor.component.css'
})
export class ConductorFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  loading = false;
  error = '';
  success = '';
  editando = false;
  conductorId?: number;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    licencia: ['', Validators.required],
    telefono: [''],
    estado: ['activo' as Conductor['estado'], Validators.required]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private conductorService: ConductorService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.editando = true;
      this.conductorId = id;
      this.cargarConductor(id);
    }
  }

  cargarConductor(id: number): void {
    this.loading = true;
    this.conductorService.obtenerPorId(id).subscribe({
      next: (conductor) => {
        this.form.patchValue(conductor);
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el conductor.';
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
    const conductor = this.form.getRawValue();
    const request = this.editando && this.conductorId
      ? this.conductorService.actualizar(this.conductorId, conductor)
      : this.conductorService.crear(conductor);

    request.subscribe({
      next: () => {
        this.success = this.editando ? 'Conductor actualizado correctamente.' : 'Conductor creado correctamente.';
        this.router.navigateByUrl('/conductores');
      },
      error: () => {
        this.error = 'No se pudo guardar el conductor.';
        this.loading = false;
      }
    });
  }
}
