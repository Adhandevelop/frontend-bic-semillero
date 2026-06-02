import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';

@Component({
  selector: 'app-bus-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './bus-form.component.html',
  styleUrl: './bus.component.css'
})
export class BusFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  loading = false;
  error = '';
  success = '';
  editando = false;
  busId?: number;

  form = this.fb.nonNullable.group({
    placa: ['', Validators.required],
    capacidad: [1, [Validators.required, Validators.min(1)]],
    modelo: [''],
    estado: ['activo' as Bus['estado'], Validators.required]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private busService: BusService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.editando = true;
      this.busId = id;
      this.cargarBus(id);
    }
  }

  cargarBus(id: number): void {
    this.loading = true;
    this.busService.obtenerPorId(id).subscribe({
      next: (bus) => {
        this.form.patchValue(bus);
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el bus.';
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
    const bus = this.form.getRawValue();
    const request = this.editando && this.busId
      ? this.busService.actualizar(this.busId, bus)
      : this.busService.crear(bus);

    request.subscribe({
      next: () => {
        this.success = this.editando ? 'Bus actualizado correctamente.' : 'Bus creado correctamente.';
        this.router.navigateByUrl('/buses');
      },
      error: () => {
        this.error = 'No se pudo guardar el bus.';
        this.loading = false;
      }
    });
  }
}
