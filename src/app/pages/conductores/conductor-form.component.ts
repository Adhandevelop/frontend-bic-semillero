import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Conductor,
  DriverBloodGroup,
  DriverLicenseCategory,
  DriverOperationalStatus
} from '../../core/models/conductor.model';
import { ConductorService } from '../../core/services/conductor.service';

export interface CertificationOption {
  key: 'has_medical_exam' | 'has_psychosensometric_test' | 'has_clean_driving_record' | 'has_first_aid_training';
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-conductor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './conductor-form.component.html',
  styleUrl: './conductor.component.css'
})
export class ConductorFormComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);

  readonly defaultImage =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAJqTN7sHK_o4YEAaVbhH9H9EuHWyYT4bNG4oSl1owYqn4XVvEhr3Bnx64gPHXndQEbDKXwD6KWj0Tw-q8Ey412nyWtnIcs3SVZiU8HHPwXuB814kleKUJovZm2MaFN9ZCrVcc4bhRbkLZi6z_feXhs6C-UKLm6cwLyJ0sS9H2mmAAJ598TyDF87TxNoez2AblOUD08OCgzleqrNUz4N8We-_7wuFnvalcxVi30PtMc6Ypf-nytGBja';

  readonly certifications: readonly CertificationOption[] = [
    {
      key: 'has_medical_exam',
      title: 'Examen Médico Vigente',
      subtitle: 'Aptitud física, auditiva y cardiovascular comprobada.'
    },
    {
      key: 'has_psychosensometric_test',
      title: 'Prueba Psicosensométrica',
      subtitle: 'Evaluación neurosensorial y tiempos de reacción aprobados.'
    },
    {
      key: 'has_clean_driving_record',
      title: 'Antecedentes Viales Limpios',
      subtitle: 'Sin comparendos pendientes en RUNT y registro SIMIT.'
    },
    {
      key: 'has_first_aid_training',
      title: 'Capacitación Primeros Auxilios',
      subtitle: 'Taller de respuesta a emergencias y evacuación en carretera.'
    }
  ];

  readonly bloodGroups: Array<{ value: DriverBloodGroup; label: string }> = [
    { value: 'O+', label: 'O Positivo (O+)' },
    { value: 'O-', label: 'O Negativo (O-)' },
    { value: 'A+', label: 'A Positivo (A+)' },
    { value: 'A-', label: 'A Negativo (A-)' },
    { value: 'B+', label: 'B Positivo (B+)' },
    { value: 'B-', label: 'B Negativo (B-)' },
    { value: 'AB+', label: 'AB Positivo (AB+)' },
    { value: 'AB-', label: 'AB Negativo (AB-)' }
  ];

  imageUrl = '';
  imageName = '';
  imageError = '';
  selectedFile: File | null = null;

  loading = false;
  loadFailed = false;
  error = '';
  fieldErrors: string[] = [];
  success = '';
  editando = false;
  conductorId?: number;

  readonly form = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.pattern(/\S/)]],
    last_name: [''],
    document_type: ['CC' as 'CC' | 'DNI' | 'PASSPORT' | 'CE'],
    document_number: [''],
    birth_date: [''],
    phone_number: ['', [Validators.required, Validators.pattern(/^\+?(?:[\s().-]*\d){7,15}[\s().-]*$/)]],
    email: ['', [Validators.email]],
    address: ['', [Validators.required, Validators.pattern(/\S/)]],
    license_number: ['', [Validators.required, Validators.pattern(/\S/)]],
    license_category: ['C3' as DriverLicenseCategory],
    license_expiry: [''],
    experience_years: [4],
    blood_group: ['O+' as DriverBloodGroup],
    operational_status: ['DISPONIBLE' as DriverOperationalStatus],
    has_medical_exam: [true],
    has_psychosensometric_test: [true],
    has_clean_driving_record: [true],
    has_first_aid_training: [false],
    password: ['', [Validators.minLength(8)]]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private conductorService: ConductorService
  ) {}

  get fullName(): string {
    const first = this.form.controls.first_name.value.trim();
    const last = this.form.controls.last_name.value.trim();
    return [first, last].filter(Boolean).join(' ');
  }

  get checkedCertificationsCount(): number {
    const v = this.form.getRawValue();
    return [
      v.has_medical_exam,
      v.has_psychosensometric_test,
      v.has_clean_driving_record,
      v.has_first_aid_training
    ].filter(Boolean).length;
  }

  get progress(): number {
    const requiredControls = [
      this.form.controls.first_name,
      this.form.controls.phone_number,
      this.form.controls.address,
      this.form.controls.license_number
    ];
    const validCount = requiredControls.filter(control => control.valid).length;
    return Math.round((validCount / requiredControls.length) * 100);
  }

  get categoryLabel(): string {
    const cat = this.form.controls.license_category.value;
    return cat === 'C3' ? 'C3 Especial' : cat === 'C2' ? 'C2 Buseta' : 'C1 Público';
  }

  get bloodGroupLabel(): string {
    const bg = this.form.controls.blood_group.value;
    const found = this.bloodGroups.find(item => item.value === bg);
    return found ? found.label.replace(/\s*\(.*\)/, '') : bg || 'Sin indicar';
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isInteger(id) && id > 0) {
      this.editando = true;
      this.conductorId = id;
      this.cargarConductor(id);
    }
  }

  cargarConductor(id: number): void {
    if (this.loading) return;
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    this.conductorService.obtenerPorId(id).subscribe({
      next: driver => {
        const parts = (driver.full_name || '').trim().split(/\s+/).filter(Boolean);
        const firstName = driver.first_name ?? (parts.length > 2 ? parts.slice(0, 2).join(' ') : parts[0] ?? '');
        const lastName =
          driver.last_name ?? (parts.length > 2 ? parts.slice(2).join(' ') : parts.slice(1).join(' '));

        this.form.patchValue({
          first_name: firstName,
          last_name: lastName,
          document_type: driver.document_type ?? 'CC',
          document_number: driver.document_number ?? '',
          birth_date: driver.birth_date ?? '',
          phone_number: driver.phone_number ?? '',
          email: driver.email ?? '',
          address: driver.address ?? '',
          license_number: driver.license_number ?? '',
          license_category: driver.license_category ?? 'C3',
          license_expiry: driver.license_expiry ?? '',
          experience_years: driver.experience_years ?? 4,
          blood_group: (driver.blood_group as DriverBloodGroup) || 'O+',
          operational_status:
            driver.operational_status ?? (driver.is_active === false ? 'CAPACITACION' : 'DISPONIBLE'),
          has_medical_exam: driver.has_medical_exam ?? true,
          has_psychosensometric_test: driver.has_psychosensometric_test ?? true,
          has_clean_driving_record: driver.has_clean_driving_record ?? true,
          has_first_aid_training: driver.has_first_aid_training ?? false
        });
        if (driver.photo_url) {
          this.imageUrl = driver.photo_url;
        }
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el conductor.';
        this.loadFailed = true;
        this.loading = false;
      }
    });
  }

  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.imageError = '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.imageError = 'Selecciona un archivo PNG, JPG o WEBP de hasta 5 MB.';
      input.value = '';
      return;
    }
    this.removeImage();
    this.selectedFile = file;
    this.imageUrl = URL.createObjectURL(file);
    this.imageName = file.name;
    input.value = '';
  }

  removeImage(): void {
    if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imageUrl);
    }
    this.imageUrl = '';
    this.imageName = '';
    this.selectedFile = null;
  }

  guardar(): void {
    if (this.loading || this.loadFailed || this.success) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.fieldErrors = [];
    const values = this.form.getRawValue();
    const fullName = this.fullName;

    const driver: Conductor = {
      full_name: fullName,
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      document_type: values.document_type,
      ...(values.document_number.trim() ? { document_number: values.document_number.trim() } : {}),
      ...(values.birth_date ? { birth_date: values.birth_date } : {}),
      ...(values.email.trim() ? { email: values.email.trim().toLowerCase() } : {}),
      license_number: values.license_number.trim(),
      license_category: values.license_category,
      ...(values.license_expiry ? { license_expiry: values.license_expiry } : {}),
      experience_years: Number(values.experience_years),
      blood_group: values.blood_group,
      operational_status: values.operational_status,
      address: values.address.trim(),
      phone_number: values.phone_number.trim(),
      is_active: values.operational_status !== 'CAPACITACION',
      has_medical_exam: values.has_medical_exam,
      has_psychosensometric_test: values.has_psychosensometric_test,
      has_clean_driving_record: values.has_clean_driving_record,
      has_first_aid_training: values.has_first_aid_training,
      ...(values.password.trim() ? { password: values.password.trim() } : {})
    };

    const request =
      this.editando && this.conductorId
        ? this.conductorService.actualizar(this.conductorId, driver, this.selectedFile)
        : this.conductorService.crear(driver, this.selectedFile);

    request.subscribe({
      next: () => {
        this.success = this.editando
          ? 'Conductor actualizado correctamente.'
          : 'Conductor creado correctamente.';
        this.router
          .navigateByUrl('/conductores')
          .then(navigated => {
            this.loading = false;
            if (!navigated) this.error = 'El conductor se guardó. Vuelve al panel para consultarlo.';
          })
          .catch(() => {
            this.loading = false;
            this.error = 'El conductor se guardó. Vuelve al panel para consultarlo.';
          });
      },
      error: (err: { status?: number; error?: unknown }) => {
        this.loading = false;
        this.error =
          err.status === 400 || err.status === 422
            ? 'El servidor rechazó los datos del conductor (HTTP ' + err.status + '). Revisa los motivos indicados.'
            : err.status === 401
              ? 'La sesión venció. Inicia sesión nuevamente.'
              : err.status === 403
                ? 'Tu cuenta no tiene permisos para guardar conductores.'
                : err.status === 0
                  ? 'No se pudo conectar con la API.'
                  : err.status === 404
                    ? 'No se encontró el servicio o el conductor (HTTP 404).'
                    : err.status && err.status >= 500
                      ? 'El servicio de conductores presentó un error interno (HTTP ' + err.status + ').'
                      : 'No se pudo confirmar el guardado del conductor.';
        const labels: Record<string, string> = {
          full_name: 'Nombre completo',
          first_name: 'Nombres',
          last_name: 'Apellidos',
          document_type: 'Tipo de documento',
          document_number: 'Número de documento',
          birth_date: 'Fecha de nacimiento',
          email: 'Correo electrónico',
          license_number: 'Licencia',
          license_category: 'Categoría de licencia',
          license_expiry: 'Fecha de vencimiento',
          experience_years: 'Experiencia',
          blood_group: 'Grupo sanguíneo',
          operational_status: 'Estado inicial',
          address: 'Dirección',
          phone_number: 'Teléfono',
          password: 'Contraseña',
          photo: 'Fotografía',
          detail: 'Detalle',
          non_field_errors: 'Registro'
        };
        this.fieldErrors = [];
        if (err.error && typeof err.error === 'object') {
          for (const [key, value] of Object.entries(err.error)) {
            if (!(key in labels)) continue;
            const messages = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
            for (const message of messages) {
              if (typeof message === 'string') this.fieldErrors.push(labels[key] + ': ' + message);
            }
            if (key in this.form.controls) this.form.get(key)?.markAsTouched();
          }
        }
        if (!this.fieldErrors.length) {
          this.fieldErrors = ['La API no devolvió un motivo de validación detallado.'];
        }
        console.error('[Conductores] Fallo al guardar', {
          operation: this.editando ? 'editar' : 'crear',
          httpStatus: err.status ?? null,
          invalidFields:
            err.error && typeof err.error === 'object'
              ? Object.keys(err.error).filter(key => key in labels)
              : []
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.removeImage();
  }
}
