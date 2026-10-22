import { PassengerService, passengerError } from '../../core/services/passenger.service';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
  private api=inject(PassengerService);private router=inject(Router);loading=false;
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

  submit():void{
    if(this.loading)return;this.form.markAllAsTouched();
    if(this.form.invalid){this.message='Revisa los campos indicados antes de continuar.';return;}
    this.loading=true;this.message='';const v=this.form.getRawValue();
    this.api.login(this.method==='email'?v.email:v.documentNumber,v.password,v.remember).subscribe({next:()=>{this.form.controls.password.reset();void this.router.navigateByUrl('/clientes/panel').then(ok=>{this.loading=false;if(!ok)this.message='No se pudo abrir el perfil. Revisa tu sesión.';}).catch(()=>{this.loading=false;this.message='No se pudo abrir el perfil.';});},error:err=>{this.loading=false;this.message=passengerError(err);}});
  }
  recoverPassword(): void {
    this.message = 'La recuperación de contraseña estará disponible próximamente.';
  }
}

