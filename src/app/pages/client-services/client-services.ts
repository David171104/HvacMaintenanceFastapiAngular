import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { dateNotPast, requiredTrimmed, timeRange } from '../../shared/validation/custom-validators';
import {
  controlInvalid,
  getControlErrorMessage,
  markFormGroupTouched,
  trimFormValues,
} from '../../shared/validation/form-utils';
import { NotificationService } from '../../shared/notifications/notification.service';

@Component({
  selector: 'app-client-services',
  standalone: true,
  templateUrl: './client-services.html',
  styleUrls: ['./client-services.css'],
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
})
export class ClientServices {
  private readonly fb = inject(FormBuilder);

  readonly serviceForm = this.fb.nonNullable.group({
    request_date: ['', [Validators.required, dateNotPast]],
    request_time: ['', [Validators.required, timeRange()]],
    service_type: ['Correctivo', [Validators.required]],
    address: ['', [Validators.required, requiredTrimmed, Validators.minLength(8), Validators.maxLength(180)]],
  });

  showModal = false;
  submitted = false;
  isSubmitting = false;
  submitError = '';
  servicios: unknown[] = [];
  clientId = '';

  constructor(
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService,
  ) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user?.id) {
      this.clientId = String(user.id);
    }
  }

  solicitarServicio(): void {
    this.submitted = false;
    this.submitError = '';
    this.showModal = true;
  }

  cerrarModal(): void {
    this.showModal = false;
    this.submitted = false;
    this.submitError = '';
    this.serviceForm.reset({
      request_date: '',
      request_time: '',
      service_type: 'Correctivo',
      address: '',
    });
  }

  guardarServicio(): void {
    this.submitted = true;
    this.submitError = '';
    trimFormValues(this.serviceForm);

    if (this.serviceForm.invalid) {
      markFormGroupTouched(this.serviceForm);
      return;
    }

    if (this.isSubmitting) {
      return;
    }

    const token = localStorage.getItem('access_token');

    if (!token || !this.clientId) {
      this.submitError = 'Debes iniciar sesion para solicitar un servicio.';
      this.notificationService.error('Sesion requerida', this.submitError);
      return;
    }

    this.isSubmitting = true;

    this.http
      .post(
        'http://localhost:8000/users/services/create',
        {
          client_id: Number(this.clientId),
          ...this.serviceForm.getRawValue(),
        },
        {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        },
      )
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Servicio solicitado',
            'Tu cita de mantenimiento fue registrada correctamente.',
          );
          this.cerrarModal();
        },
        error: (error) => {
          console.error('Error al solicitar servicio:', error);
          this.submitError = error.error?.detail || 'Error al solicitar servicio.';
          this.notificationService.error('No se pudo guardar', this.submitError);
        },
      });
  }

  isInvalid(controlName: 'request_date' | 'request_time' | 'service_type' | 'address'): boolean {
    return controlInvalid(this.serviceForm.get(controlName), this.submitted);
  }

  getError(
    controlName: 'request_date' | 'request_time' | 'service_type' | 'address',
    label: string,
  ): string | null {
    return getControlErrorMessage(this.serviceForm.get(controlName), label);
  }

  get minServiceDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}
