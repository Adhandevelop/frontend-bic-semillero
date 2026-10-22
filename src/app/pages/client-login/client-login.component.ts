import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-client-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './client-login.component.html',
  styleUrl: './client-login.component.css'
})
export class ClientLoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly busImage = "https://lh3.googleusercontent.com/aida-public/AB6AXuD2xlXI4nUDTuc5oH_BaAs5-r2rY5i1rBJ1GvQKbIFMTICcqTfcUAr1j_qT9glL2_g6nxEOYRHb0rBOgas7ArWn4o7VmMMOjLHCCe9meblNc4kDdQn8ZeRpdzZOuhHvsDD9ZtDn3pioa1IE2O-f7vzJ8nBqHaz5taSPJeehkEgX3t0SH5SsuTAlsjbU_z-E2twOIuAD9gxp-XQnCxzF_XM9PoPoyDfTkM8_l9w6YT4VW_HPeoQJOmOF";
  method: 'email' | 'document' = 'email';
  showPassword = false;
  message = '';
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    documentType: [{ value: 'CC', disabled: true }, Validators.required],
    documentNumber: [{ value: '', disabled: true }, [Validators.required, Validators.pattern(/^[a-zA-Z0-9-]{5,20}$/)]],
    password: ['', Validators.required],
    remember: [false]
  });

  switchMethod(method: 'email' | 'document'): void {
    this.method = method;
    this.message = '';
    if (method === 'email') {
      this.form.controls.email.enable();
      this.form.controls.documentType.disable();
      this.form.controls.documentNumber.disable();
    } else {
      this.form.controls.email.disable();
      this.form.controls.documentType.enable();
      this.form.controls.documentNumber.enable();
    }
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  submit(): void {
    this.form.markAllAsTouched();
    this.message = this.form.invalid
      ? 'Revisa los campos indicados antes de continuar.'
      : 'El acceso de pasajeros aún no está disponible. Tus credenciales no se han enviado ni guardado.';
  }

  recoverPassword(): void {
    this.message = 'La recuperación de contraseña estará disponible próximamente.';
  }
}
