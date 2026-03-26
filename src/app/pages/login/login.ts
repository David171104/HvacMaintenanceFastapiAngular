import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { requiredTrimmed } from '../../shared/validation/custom-validators';
import {
  controlInvalid,
  getControlErrorMessage,
  markFormGroupTouched,
  trimFormValues,
} from '../../shared/validation/form-utils';
import { NotificationService } from '../../shared/notifications/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, requiredTrimmed]],
    password: ['', [Validators.required, requiredTrimmed]],
  });

  submitted = false;
  isSubmitting = false;
  serverError = '';

  private msalInstance:
    | {
        loginRedirect: (request: { scopes: string[] }) => void;
        logoutRedirect: (request: { postLogoutRedirectUri: string }) => void;
      }
    | undefined;

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    if (!window.msal) {
      console.error('MSAL no cargado (script CDN)');
      return;
    }

    this.msalInstance = new window.msal.PublicClientApplication({
      auth: {
        clientId: '9390d994-fdb5-4104-b1e9-8ce7277fcd35',
        authority: 'https://login.microsoftonline.com/1e9aabe8-67f8-4f1c-a329-a754e92499ae',
        redirectUri: 'http://localhost:4200',
      },
    });
  }

  loginMicrosoft(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.msalInstance) {
      console.error('MSAL no inicializado');
      return;
    }

    this.msalInstance.loginRedirect({
      scopes: ['User.Read'],
    });
  }

  logoutMicrosoft(): void {
    localStorage.clear();
    sessionStorage.clear();

    if (!window.msal) {
      return;
    }

    const msalInstance = new window.msal.PublicClientApplication({
      auth: {
        clientId: '9390d994-fdb5-4104-b1e9-8ce7277fcd35',
        authority: 'https://login.microsoftonline.com/1e9aabe8-67f8-4f1c-a329-a754e92499ae',
        redirectUri: 'http://localhost:4200',
      },
    });

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    msalInstance.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:4200',
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.serverError = '';
    trimFormValues(this.loginForm);

    if (this.loginForm.invalid) {
      markFormGroupTouched(this.loginForm);
      return;
    }

    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    this.http
      .post<{ access_token: string; user: { role_id: number } }>(
        'http://localhost:8000/users/user_login',
        this.loginForm.getRawValue(),
      )
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (response) => {
          localStorage.setItem('access_token', response.access_token);
          localStorage.setItem('user', JSON.stringify(response.user));

          this.notificationService.success(
            'Sesion iniciada',
            'Tu acceso fue validado correctamente.',
          );

          const role = response.user.role_id;

          if (role === 1) {
            this.router.navigateByUrl('/home');
          } else if (role === 2) {
            this.router.navigateByUrl('/tecnic-home');
          } else if (role === 3) {
            this.router.navigateByUrl('/client-home');
          } else {
            this.router.navigateByUrl('/');
          }
        },
        error: (error) => {
          console.error('Error login:', error);
          this.serverError = error.error?.detail || 'Error conectando con el servidor.';
          this.notificationService.error('No se pudo iniciar sesion', this.serverError);
        },
      });
  }

  isInvalid(controlName: 'email' | 'password'): boolean {
    return controlInvalid(this.loginForm.get(controlName), this.submitted);
  }

  getError(controlName: 'email' | 'password', label: string): string | null {
    return getControlErrorMessage(this.loginForm.get(controlName), label);
  }

  goToRegister(): void {
  this.router.navigateByUrl('/register');
  }
}
