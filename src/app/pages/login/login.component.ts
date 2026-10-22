import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  error = '';
  success = '';

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  ingresar(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.success = 'Inicio de sesión correcto.';
        this.router.navigateByUrl('/dashboard').then((navigated) => {
          if (!navigated) {
            this.error = 'No se pudo abrir el panel principal.';
          }

          this.loading = false;
        });
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 0) {
          this.error =
            'No se pudo conectar con el servidor. Comprueba que Django esté ejecutándose.';
        } else if (err.status === 400 || err.status === 401) {
          this.error = 'Usuario o contraseña incorrectos.';
        } else if (err.status === 403) {
          this.error = 'Este panel requiere una cuenta con rol de administrador.';
        } else {
          this.error =
            'Ocurrió un error en el servidor. Inténtalo nuevamente.';
        }

        this.loading = false;
      }
    });
  }
}
