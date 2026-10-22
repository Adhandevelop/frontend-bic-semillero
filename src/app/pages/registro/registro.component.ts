import { PassengerService, passengerError } from '../../core/services/passenger.service';
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
  private api=inject(PassengerService);loading=false;registered=false;
  showPassword = false;
  showConfirmation = false;
  message = '';
  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    documentType: ['CC', Validators.required],
    documentNumber: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9-]{5,20}$/)]],
    phone: ['', [Validators.required, Validators.pattern(/^3\d{9}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
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
    if(this.loading||this.registered)return;
    this.message = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.message = 'Revisa los campos indicados antes de continuar.';
      return;
    }
    const v=this.form.getRawValue(),name=(v.firstName.trim()+' '+v.lastName.trim()).replace(/\s+/g,' ');
    if(name.length>150){this.message='El nombre completo no puede superar los 150 caracteres.';return;}
    const codes:Record<string,string>={CC:'13',CE:'22',PAS:'41'};
    this.loading=true;
    this.api.register({name,email:v.email.trim().toLowerCase(),telephone:'+57'+v.phone,identification_number:v.documentNumber.trim(),identification_document_code:codes[v.documentType],password:v.password}).subscribe({next:()=>{this.loading=false;this.registered=true;this.form.controls.password.reset();this.form.controls.confirmPassword.reset();this.message='Cuenta creada. Ya puedes iniciar sesión con tu correo o documento.';},error:err=>{this.loading=false;this.message=passengerError(err);}});
  }
}

