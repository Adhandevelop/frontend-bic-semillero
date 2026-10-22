import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

export function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmPassword')?.value
    ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  showPassword = false;
  showConfirmation = false;
  message = '';
  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    documentType: ['CC', Validators.required],
    documentNumber: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9-]{5,20}$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\s\S]+$/)]],
    confirmPassword: ['', Validators.required],
    terms: [false, Validators.requiredTrue],
    promotions: [false]
  }, { validators: passwordsMatch });

  get strength(): number {
    const value = this.form.controls.password.value;
    if (!value) return 0;
    return Number(value.length >= 8) + Number(/[a-z]/.test(value) && /[A-Z]/.test(value))
      + Number(/\d/.test(value)) + Number(/[^a-zA-Z0-9]/.test(value));
  }

  get strengthLabel(): string {
    return ['Mínimo 8 caracteres', 'Débil', 'Aceptable', 'Buena', 'Excelente'][this.strength];
  }

  invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  submit(): void {
    this.message = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.message = 'Revisa los campos indicados antes de continuar.';
      return;
    }
    this.message = 'Los datos son válidos. La creación de cuentas aún no está disponible. Tus datos no se han enviado ni guardado.';
  }
}
