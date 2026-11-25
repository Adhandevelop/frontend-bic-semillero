import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { STAFF_ROLE_OPTIONS, StaffRole, StaffRoleOption, StaffService, StaffUser } from '../../core/services/staff.service';

export type AdminProfileTab = 'profile' | 'users';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.css'
})
export class StaffComponent implements OnInit, OnDestroy {
  private readonly api = inject(StaffService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyed = new Subject<void>();

  activeTab: AdminProfileTab = 'profile';
  profile: UserProfile | null = null;
  profileLoading = false;
  profileSaving = false;
  editingProfile = false;
  changingPassword = false;
  passwordSaving = false;
  profileError = '';
  profileSuccess = '';

  users: StaffUser[] = [];
  loading = false;
  saving = false;
  updatingUserId: number | null = null;
  error = '';
  success = '';
  fieldErrors: string[] = [];

  search = '';
  role = '';
  active = '';

  readonly roleOptions: readonly StaffRoleOption[] = STAFF_ROLE_OPTIONS;
  readonly roles: StaffRole[] = STAFF_ROLE_OPTIONS.map(option => option.value);
  readonly assignableRoles: StaffRoleOption[] = STAFF_ROLE_OPTIONS.filter(option => option.creatable);
  readonly documentTypes = [
    { code: '13', label: 'Cédula de ciudadanía (CC)' },
    { code: '22', label: 'Cédula de extranjería (CE)' },
    { code: '41', label: 'Pasaporte (PA)' },
    { code: '12', label: 'Tarjeta de identidad (TI)' }
  ];

  roleDrafts: Record<number, StaffRole> = {};

  profileForm = this.fb.nonNullable.group({
    first_name: ['', [Validators.required, Validators.maxLength(150)]],
    last_name: ['', [Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    telephone: ['', [Validators.maxLength(20)]]
  });

  passwordForm = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
    confirm_password: ['', Validators.required]
  });

  form = this.fb.nonNullable.group({
    identification_document_code: ['13', Validators.required],
    identification_number: ['', [Validators.required, Validators.maxLength(20)]],
    first_name: ['', [Validators.required, Validators.maxLength(150)]],
    last_name: ['', [Validators.required, Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
    telephone: ['', [Validators.required, Validators.maxLength(20)]],
    role: ['seller' as StaffRole, Validators.required],
    username: [''],
    password: ['']
  });

  get isAdmin(): boolean {
    return this.profile?.role === 'admin' || this.auth.hasRole('admin');
  }

  get fullName(): string {
    if (!this.profile) return 'Perfil Administrativo';
    return (
      this.profile.name ||
      [this.profile.first_name, this.profile.last_name].filter(Boolean).join(' ') ||
      this.profile.username
    );
  }

  get initials(): string {
    return (
      this.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? '')
        .join('') || 'AD'
    );
  }

  get selectedCreateRoleOption(): StaffRoleOption | undefined {
    const selected = this.form.controls.role.value;
    return this.roleOptions.find(item => item.value === selected);
  }

  get activeUsersCount(): number {
    return this.users.filter(user => user.is_active).length;
  }

  get adminUsersCount(): number {
    return this.users.filter(user => user.role === 'admin').length;
  }

  ngOnInit(): void {
    const defaultSection = this.route.snapshot.data['section'] as AdminProfileTab | undefined;
    if (defaultSection === 'users' || defaultSection === 'profile') {
      this.activeTab = defaultSection;
    }

    this.route.queryParamMap.pipe(takeUntil(this.destroyed)).subscribe(params => {
      const vista = params.get('vista') || params.get('tab');
      if (vista === 'usuarios' || vista === 'users') {
        this.activeTab = 'users';
      } else if (vista === 'perfil' || vista === 'profile') {
        this.activeTab = 'profile';
      }
    });

    this.loadMyProfile();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
  }

  selectTab(tab: AdminProfileTab): void {
    if (tab === 'users' && !this.isAdmin) {
      return;
    }
    this.activeTab = tab;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vista: tab === 'users' ? 'usuarios' : 'perfil' },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
    if (tab === 'users' && !this.users.length && !this.loading) {
      this.load();
    }
  }

  selectRoleForNewUser(role: StaffRole): void {
    const opt = this.roleOptions.find(item => item.value === role);
    if (!opt?.creatable) return;
    this.form.controls.role.setValue(role);
    this.form.controls.role.markAsDirty();
  }

  loadMyProfile(): void {
    if (this.profileLoading) return;
    this.profileLoading = true;
    this.profileError = '';
    const cached = this.auth.currentProfile();
    if (cached) {
      this.profile = cached;
      this.patchProfileForm(cached);
    }
    this.auth.loadProfile().subscribe({
      next: profile => {
        this.profile = profile;
        this.patchProfileForm(profile);
        this.profileLoading = false;
        if (!this.isAdmin && this.activeTab === 'users') {
          this.activeTab = 'profile';
        }
      },
      error: err => {
        this.profileLoading = false;
        this.profileError =
          typeof err.error?.detail === 'string'
            ? err.error.detail
            : 'No se pudo cargar la información del perfil.';
      }
    });
  }

  private patchProfileForm(profile: UserProfile): void {
    const parts = (profile.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = profile.first_name ?? parts[0] ?? '';
    const lastName = profile.last_name ?? (parts.length > 1 ? parts.slice(1).join(' ') : '');
    this.profileForm.reset({
      first_name: firstName,
      last_name: lastName,
      email: profile.email ?? '',
      telephone: profile.telephone ?? ''
    });
  }

  startEditProfile(): void {
    if (!this.profile) return;
    this.patchProfileForm(this.profile);
    this.editingProfile = true;
    this.profileError = '';
    this.profileSuccess = '';
  }

  cancelEditProfile(): void {
    if (this.profile) {
      this.patchProfileForm(this.profile);
    }
    this.editingProfile = false;
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.profileSaving) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.profileSaving = true;
    this.profileError = '';
    this.profileSuccess = '';
    const raw = this.profileForm.getRawValue();
    const first_name = raw.first_name.trim();
    const last_name = raw.last_name.trim();
    const name = [first_name, last_name].filter(Boolean).join(' ');
    this.auth
      .updateProfile({
        name,
        first_name,
        last_name,
        email: raw.email.trim().toLowerCase(),
        telephone: raw.telephone.trim()
      })
      .subscribe({
        next: updated => {
          this.profile = { ...this.profile, ...updated };
          this.profileSaving = false;
          this.editingProfile = false;
          this.profileSuccess = 'Datos de tu perfil actualizados correctamente.';
        },
        error: err => {
          this.profileSaving = false;
          this.profileError =
            typeof err.error?.detail === 'string'
              ? err.error.detail
              : 'No se pudo actualizar el perfil. Verifica los datos ingresados.';
        }
      });
  }

  togglePasswordForm(): void {
    this.changingPassword = !this.changingPassword;
    this.passwordForm.reset({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    this.profileError = '';
    this.profileSuccess = '';
  }

  savePassword(): void {
    if (this.passwordForm.invalid || this.passwordSaving) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const raw = this.passwordForm.getRawValue();
    if (raw.new_password !== raw.confirm_password) {
      this.profileError = 'La confirmación de la nueva contraseña no coincide.';
      return;
    }
    this.passwordSaving = true;
    this.profileError = '';
    this.profileSuccess = '';
    this.auth.changePassword(raw.current_password, raw.new_password).subscribe({
      next: res => {
        this.passwordSaving = false;
        this.changingPassword = false;
        this.passwordForm.reset();
        this.profileSuccess = res.detail || 'Contraseña actualizada correctamente.';
      },
      error: err => {
        this.passwordSaving = false;
        this.profileError =
          typeof err.error?.detail === 'string'
            ? err.error.detail
            : Array.isArray(err.error?.current_password)
              ? err.error.current_password.join(' ')
              : Array.isArray(err.error?.new_password)
                ? err.error.new_password.join(' ')
                : 'No se pudo cambiar la contraseña. Revisa tu contraseña actual y los requisitos de seguridad.';
      }
    });
  }

  label(role?: string | null): string {
    if (!role) return 'Sin rol';
    return (
      ({
        admin: 'Administrador',
        seller: 'Vendedor',
        dispatcher: 'Despachador',
        auditor: 'Auditor',
        driver: 'Conductor',
        client: 'Cliente'
      } as Record<string, string>)[role] || role
    );
  }

  documentLabel(code?: string | null): string {
    if (!code) return 'CC (13)';
    return (
      ({
        '13': 'Cédula de ciudadanía (13)',
        '22': 'Cédula de extranjería (22)',
        '41': 'Pasaporte (41)',
        '12': 'Tarjeta de identidad (12)'
      } as Record<string, string>)[code] || `Código ${code}`
    );
  }

  name(user: StaffUser): string {
    return user.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
  }

  userInitials(user: StaffUser): string {
    return (
      this.name(user)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0]?.toUpperCase() ?? '')
        .join('') || 'US'
    );
  }

  load(): void {
    if (this.loading) return;
    if (this.profile && !this.isAdmin) return;
    this.loading = true;
    this.error = '';
    this.api
      .list({
        search: this.search,
        role: (this.role as StaffRole) || undefined,
        is_active: this.active === '' ? undefined : this.active === 'true'
      })
      .subscribe({
        next: rows => {
          this.users = rows;
          this.roleDrafts = {};
          for (const user of rows) {
            this.roleDrafts[user.id] = user.role;
          }
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.error =
            err.status === 403
              ? 'Solo un administrador puede consultar y gestionar las cuentas de usuarios.'
              : 'No se pudo consultar el listado de usuarios (HTTP ' + (err.status ?? 'sin respuesta') + ').';
        }
      });
  }

  clearFilters(): void {
    this.search = '';
    this.role = '';
    this.active = '';
    this.load();
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    this.success = '';
    this.fieldErrors = [];
    const value = this.form.getRawValue();
    this.api
      .create({
        identification_document_code: value.identification_document_code,
        identification_number: value.identification_number.trim(),
        first_name: value.first_name.trim(),
        last_name: value.last_name.trim(),
        email: value.email.trim().toLowerCase(),
        telephone: value.telephone.trim(),
        role: value.role,
        ...(value.username.trim() ? { username: value.username.trim() } : {}),
        ...(value.password ? { password: value.password } : {})
      })
      .subscribe({
        next: user => {
          this.saving = false;
          this.success =
            'Usuario ' +
            this.name(user) +
            ' añadido con el rol de ' +
            this.label(user.role) +
            '. ' +
            (user.password_change_required
              ? 'Deberá cambiar su contraseña en el primer inicio de sesión.'
              : '');
          this.form.reset({
            identification_document_code: '13',
            role: 'seller',
            identification_number: '',
            first_name: '',
            last_name: '',
            email: '',
            telephone: '',
            username: '',
            password: ''
          });
          this.load();
        },
        error: err => {
          this.saving = false;
          this.error =
            typeof err.error?.detail === 'string'
              ? err.error.detail
              : 'No se pudo crear el usuario. Revisa los datos e intenta nuevamente.';
          if (err.error && typeof err.error === 'object') {
            const labels: Record<string, string> = {
              identification_document_code: 'Tipo de documento',
              identification_number: 'Número de documento',
              first_name: 'Nombres',
              last_name: 'Apellidos',
              email: 'Correo electrónico',
              telephone: 'Teléfono',
              role: 'Rol',
              username: 'Usuario',
              password: 'Contraseña',
              non_field_errors: 'Validación'
            };
            this.fieldErrors = Object.entries(err.error)
              .filter(([key]) => key in labels)
              .map(([key, val]) => {
                const msg = Array.isArray(val) ? val.join(' ') : typeof val === 'string' ? val : 'Valor inválido';
                return `${labels[key]}: ${msg}`;
              });
          }
        }
      });
  }

  changeUserRole(user: StaffUser): void {
    const newRole = this.roleDrafts[user.id];
    if (!newRole || newRole === user.role || this.saving || this.updatingUserId !== null) return;
    this.updatingUserId = user.id;
    this.error = '';
    this.success = '';
    this.api.setRole(user.id, newRole).subscribe({
      next: updated => {
        this.updatingUserId = null;
        this.users = this.users.map(item => (item.id === updated.id ? updated : item));
        this.roleDrafts[updated.id] = updated.role;
        this.success = `Rol de ${this.name(updated)} actualizado a ${this.label(updated.role)}.`;
      },
      error: err => {
        this.updatingUserId = null;
        this.roleDrafts[user.id] = user.role;
        this.error =
          typeof err.error?.detail === 'string'
            ? err.error.detail
            : 'No se pudo actualizar el rol del usuario. Verifica si el servidor permite modificar este rol.';
      }
    });
  }

  toggle(user: StaffUser): void {
    if (this.saving || this.updatingUserId !== null) return;
    if (!confirm((user.is_active ? '¿Desactivar' : '¿Activar') + ' la cuenta de ' + this.name(user) + '?')) return;
    this.updatingUserId = user.id;
    this.error = '';
    this.success = '';
    this.api.setActive(user.id, !user.is_active).subscribe({
      next: updated => {
        this.updatingUserId = null;
        this.users = this.users.map(item => (item.id === updated.id ? updated : item));
        this.roleDrafts[updated.id] = updated.role;
        this.success = `Cuenta de ${this.name(updated)} ${updated.is_active ? 'activada' : 'desactivada'}.`;
      },
      error: err => {
        this.updatingUserId = null;
        this.error =
          typeof err.error?.detail === 'string'
            ? err.error.detail
            : 'No se pudo cambiar el estado de la cuenta.';
      }
    });
  }
}
