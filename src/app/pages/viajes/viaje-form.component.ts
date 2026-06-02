import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Bus } from '../../core/models/bus.model';
import { Conductor } from '../../core/models/conductor.model';
import { Ruta } from '../../core/models/ruta.model';
import { Viaje } from '../../core/models/viaje.model';
import { BusService } from '../../core/services/bus.service';
import { ConductorService } from '../../core/services/conductor.service';
import { RutaService } from '../../core/services/ruta.service';
import { ViajeService } from '../../core/services/viaje.service';

@Component({
  selector: 'app-viaje-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './viaje-form.component.html',
  styleUrl: './viaje.component.css'
})
export class ViajeFormComponent implements OnInit {
  private fb = inject(FormBuilder);

  buses: Bus[] = [];
  conductores: Conductor[] = [];
  rutas: Ruta[] = [];
  loading = false;
  error = '';
  success = '';
  editando = false;
  viajeId?: number;

  form = this.fb.nonNullable.group({
    bus: [0, [Validators.required, Validators.min(1)]],
    conductor: [0, [Validators.required, Validators.min(1)]],
    ruta: [0, [Validators.required, Validators.min(1)]],
    fecha_hora_inicio: ['', Validators.required],
    fecha_hora_fin: [''],
    estado: ['programado' as Viaje['estado'], Validators.required]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private busService: BusService,
    private conductorService: ConductorService,
    private rutaService: RutaService,
    private viajeService: ViajeService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.editando = Boolean(id);
    this.viajeId = id || undefined;
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loading = true;
    this.error = '';

    const baseRequests = {
      buses: this.busService.listarActivos(),
      conductores: this.conductorService.listarActivos(),
      rutas: this.rutaService.listarActivas()
    };

    const requests = this.editando && this.viajeId
      ? { ...baseRequests, viaje: this.viajeService.obtenerPorId(this.viajeId) }
      : baseRequests;

    forkJoin(requests).subscribe({
      next: (data) => {
        this.buses = data.buses;
        this.conductores = data.conductores;
        this.rutas = data.rutas;

        if ('viaje' in data) {
          this.form.patchValue({
            ...data.viaje,
            fecha_hora_inicio: this.aDatetimeLocal(data.viaje.fecha_hora_inicio),
            fecha_hora_fin: data.viaje.fecha_hora_fin ? this.aDatetimeLocal(data.viaje.fecha_hora_fin) : ''
          });
        }

        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los datos del formulario.';
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
    const valores = this.form.getRawValue();
    const viaje: Viaje = {
      bus: Number(valores.bus),
      conductor: Number(valores.conductor),
      ruta: Number(valores.ruta),
      fecha_hora_inicio: this.aIso(valores.fecha_hora_inicio),
      fecha_hora_fin: valores.fecha_hora_fin ? this.aIso(valores.fecha_hora_fin) : null,
      estado: valores.estado
    };

    const request = this.editando && this.viajeId
      ? this.viajeService.actualizar(this.viajeId, viaje)
      : this.viajeService.crear(viaje);

    request.subscribe({
      next: () => {
        this.success = this.editando ? 'Viaje actualizado correctamente.' : 'Viaje creado correctamente.';
        this.router.navigateByUrl('/viajes');
      },
      error: () => {
        this.error = 'No se pudo guardar el viaje.';
        this.loading = false;
      }
    });
  }

  private aDatetimeLocal(valor: string): string {
    const fecha = new Date(valor);
    const offset = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - offset).toISOString().slice(0, 16);
  }

  private aIso(valor: string): string {
    return new Date(valor).toISOString();
  }
}
