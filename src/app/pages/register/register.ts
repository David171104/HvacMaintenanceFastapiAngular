import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import {
  fieldsMatch,
  numberRange,
  personName,
  requiredTrimmed,
  safeNumber,
  strongPassword,
} from '../../shared/validation/custom-validators';
import {
  controlInvalid,
  getControlErrorMessage,
  markFormGroupTouched,
  trimFormValues,
} from '../../shared/validation/form-utils';
import { NotificationService } from '../../shared/notifications/notification.service';
import { VALIDATION_LIMITS } from '../../shared/validation/validation.constants';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);

  readonly registerForm = this.fb.nonNullable.group(
    {
      name: [
        '',
        [
          Validators.required,
          requiredTrimmed,
          personName,
          Validators.minLength(VALIDATION_LIMITS.text.short),
          Validators.maxLength(VALIDATION_LIMITS.text.long),
        ],
      ],
      last_name: [
        '',
        [
          Validators.required,
          requiredTrimmed,
          personName,
          Validators.minLength(VALIDATION_LIMITS.text.short),
          Validators.maxLength(VALIDATION_LIMITS.text.long),
        ],
      ],
      document_number: ['', [Validators.maxLength(20), Validators.pattern(/^\d*$/)]],
      age: [
        '',
        [safeNumber, numberRange(VALIDATION_LIMITS.age.min, VALIDATION_LIMITS.age.max)],
      ],
      email: ['', [Validators.required, Validators.email, requiredTrimmed]],
      password: [
        '',
        [
          Validators.required,
          requiredTrimmed,
          Validators.minLength(VALIDATION_LIMITS.password.minLength),
          Validators.maxLength(VALIDATION_LIMITS.password.maxLength),
          strongPassword,
        ],
      ],
      confirmPassword: ['', [Validators.required, requiredTrimmed]],
    },
    { validators: fieldsMatch('password', 'confirmPassword') },
  );

  submitted = false;
  isSubmitting = false;
  serverError = '';

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService,
  ) {}

  onSubmit(): void {
    this.submitted = true;
    this.serverError = '';
    trimFormValues(this.registerForm);

    if (this.registerForm.invalid) {
      markFormGroupTouched(this.registerForm);
      return;
    }

    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;

    const formValue = this.registerForm.getRawValue();
    const payload = {
      name: formValue.name,
      last_name: formValue.last_name,
      email: formValue.email,
      password: formValue.password,
      role_id: 3,
      ...(formValue.document_number ? { document_number: formValue.document_number } : {}),
      ...(formValue.age ? { age: formValue.age } : {}),
    };

    this.http
      .post('http://localhost:8000/users/create_user', payload)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Registro completado',
            'Tu cuenta fue creada correctamente. Ya puedes iniciar sesion.',
          );
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Error registro:', error);
          this.serverError = error.error?.detail || 'No fue posible completar el registro.';
          this.notificationService.error('No se pudo registrar', this.serverError);
        },
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  isInvalid(
    controlName:
      | 'name'
      | 'last_name'
      | 'document_number'
      | 'age'
      | 'email'
      | 'password'
      | 'confirmPassword',
  ): boolean {
    return controlInvalid(this.registerForm.get(controlName), this.submitted);
  }

  getError(
    controlName:
      | 'name'
      | 'last_name'
      | 'document_number'
      | 'age'
      | 'email'
      | 'password'
      | 'confirmPassword',
    label: string,
  ): string | null {
    const control = this.registerForm.get(controlName);

    if (controlName === 'document_number' && control?.hasError('pattern')) {
      return `${label}: solo se permiten digitos.`;
    }

    return getControlErrorMessage(control, label);
  }
}
