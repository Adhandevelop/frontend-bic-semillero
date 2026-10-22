import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Bus } from '../../core/models/bus.model';
import { BusService } from '../../core/services/bus.service';

@Component({
  selector: 'app-bus-form', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './bus-form.component.html', styleUrl: './bus.component.css'
})
export class BusFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  readonly defaultImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuDAjY9yJRSwtZ5n1bW8XMg8YU6JCFz22Uqa07zjo3r34X4j849c2MRJDh5NOBh5OhwnpPE01nf2L-lE1GrLcSEIr3Lh4d37RUh6mQozg5DIzm2MIdxaddgDaK8P2Z4_taL-UItaUlkx750sB8l3h__iXh7zP044ON0OZanxCOIzQDiUtFml4LXeBgtQTs-L0_cuu3-9wc1eLHYGI-mZfh3Q5NMAW5vgNfiIejP8vwSx8Bz7bEMYcXN6hW6g3jP6OBnWSNcDFR7Xooo";
  readonly equipmentOptions = ['Wi-Fi', 'Aire acondicionado', 'GPS', 'Cámaras', 'Baño'];
  readonly selectedEquipment = new Set<string>();
  imageUrl = '';
  imageName = '';
  imageError = '';
  loading = false;
  loadFailed = false;
  error = '';
  success = '';
  editando = false;
  busId?: number;

  readonly form = this.fb.nonNullable.group({
    plate: ['', [Validators.required, Validators.pattern(/\S/)]],
    capacity: [20, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    model: ['', [Validators.required, Validators.pattern(/\S/)]],
    state: ['Active' as Bus['state'], [Validators.required, Validators.pattern(/^(Active|Inactive|mantenimiento)$/)]]
  });

  constructor(private route: ActivatedRoute, private router: Router, private busService: BusService) {}

  get progress(): number {
    const controls = this.form.controls;
    return Math.round([controls.plate, controls.model, controls.capacity, controls.state].filter(control => control.valid).length / 4 * 100);
  }

  get stateLabel(): string {
    return this.form.controls.state.value === 'Active' ? 'Activo' : this.form.controls.state.value === 'Inactive' ? 'Inactivo' : 'Mantenimiento';
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      this.editando = true;
      this.busId = id;
      this.cargarBus(id);
    }
  }

  cargarBus(id: number): void {
    if (this.loading) return;
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    this.busService.obtenerPorId(id).subscribe({
      next: bus => { this.form.patchValue(bus); this.loading = false; },
      error: () => { this.error = 'No se pudo cargar el bus.'; this.loadFailed = true; this.loading = false; }
    });
  }

  toggleEquipment(name: string): void {
    if (this.loading || this.loadFailed) return;
    if (this.selectedEquipment.has(name)) this.selectedEquipment.delete(name);
    else this.selectedEquipment.add(name);
  }

  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.imageError = '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.imageError = 'Selecciona una imagen PNG, JPG o WEBP de hasta 5 MB.';
      input.value = '';
      return;
    }
    this.removeImage();
    this.imageUrl = URL.createObjectURL(file);
    this.imageName = file.name;
    input.value = '';
  }

  removeImage(): void {
    if (this.imageUrl) URL.revokeObjectURL(this.imageUrl);
    this.imageUrl = '';
    this.imageName = '';
  }

  guardar(): void {
    if (this.loading || this.loadFailed || this.success) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.error = '';
    this.success = '';
    const values = this.form.getRawValue();
    // Only fields supported by the current API. Image/equipment are local previews.
    const bus: Bus = { plate: values.plate.trim(), model: values.model.trim(), capacity: values.capacity, state: values.state };
    const request = this.editando && this.busId ? this.busService.actualizar(this.busId, bus) : this.busService.crear(bus);
    request.subscribe({
      next: () => {
        this.success = this.editando ? 'Bus actualizado correctamente.' : 'Bus creado correctamente.';
        this.router.navigateByUrl('/buses').then(navigated => {
          this.loading = false;
          if (!navigated) this.error = 'El bus se guardó, pero no se pudo abrir la lista. Usa Volver al panel de flota.';
        }).catch(() => { this.loading = false; this.error = 'El bus se guardó. Vuelve al panel de flota para consultarlo.'; });
      },
      error: () => { this.error = 'No se pudo guardar el bus. Revisa los datos e inténtalo de nuevo.'; this.loading = false; }
    });
  }

  ngOnDestroy(): void { this.removeImage(); }
}
