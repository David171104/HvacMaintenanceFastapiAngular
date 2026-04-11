import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

import { dateNotPast, requiredTrimmed, timeRange } from '../../shared/validation/custom-validators';
import {
  controlInvalid,
  getControlErrorMessage,
  markFormGroupTouched,
  trimFormValues,
} from '../../shared/validation/form-utils';

import { NotificationService } from '../../shared/notifications/notification.service';
import { SidebarComponent } from '../../components/sidebar/sidebar';

/* ===============================
   INTERFACE
================================ */

interface ClientService {
  id: number;
  client_id: number;
  request_date: string;
  request_time: string | number;
  service_type: string;
  address: string;
  current_status: string;
}

/* ===============================
   COMPONENT
================================ */

@Component({
  selector: 'app-client-services',
  standalone: true,
  templateUrl: './client-services.html',
  styleUrls: ['./client-services.css'],
  imports: [RouterModule, ReactiveFormsModule, CommonModule, SidebarComponent],
})
export class ClientServices implements OnInit {

  private readonly fb = inject(FormBuilder);

  /* ===============================
     FORM
  =============================== */

  readonly serviceForm = this.fb.nonNullable.group({
    request_date: ['', [Validators.required, dateNotPast]],
    request_time: ['', [Validators.required, timeRange()]],
    service_type: ['Correctivo', [Validators.required]],
    address: [
      '',
      [Validators.required, requiredTrimmed, Validators.minLength(8), Validators.maxLength(180)],
    ],
  });

  /* ===============================
     STATE
  =============================== */

  showModal = false;
  submitted = false;
  isSubmitting = false;
  submitError = '';

  servicios: ClientService[] = [];
  loadingServices = false;

  clientId = '';

  /* ===============================
     CONSTRUCTOR
  =============================== */

  constructor(
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService
  ) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user?.id) {
      this.clientId = String(user.id);
    }
  }

  /* ===============================
     INIT
  =============================== */

  ngOnInit(): void {
    this.loadServices();
  }

  /* ===============================
     LOAD SERVICES
  =============================== */

  loadServices(): void {

    if (!this.clientId) return;

    this.loadingServices = true;
    this.servicios = [];

    this.http
      .get<any>(`http://localhost:8000/users/services/list/${this.clientId}`)
      .pipe(finalize(() => (this.loadingServices = false)))
      .subscribe({
        next: (response) => {
          this.servicios = response?.resultado ?? [];
        },

        error: (error) => {
          console.error('Error cargando servicios:', error);

          // Si backend manda 404 → lista vacía
          if (error.status === 404) {
            this.servicios = [];
            return;
          }

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudieron cargar los servicios',
          });
        },
      });
  }

  /* ===============================
     MODAL
  =============================== */

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

  /* ===============================
     CREATE SERVICE
  =============================== */

  guardarServicio(): void {

    this.submitted = true;
    this.submitError = '';

    trimFormValues(this.serviceForm);

    if (this.serviceForm.invalid) {
      markFormGroupTouched(this.serviceForm);
      return;
    }

    if (this.isSubmitting) return;

    const token = localStorage.getItem('access_token');

    if (!token || !this.clientId) {
      this.notificationService.error(
        'Sesión requerida',
        'Debes iniciar sesión.'
      );
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
        }
      )
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {

          Swal.fire({
            icon: 'success',
            title: 'Servicio solicitado',
            text: 'Tu solicitud fue registrada correctamente',
            timer: 1800,
            showConfirmButton: false,
          });

          this.cerrarModal();
          this.loadServices(); // 🔥 refresca tabla
        },

        error: (error) => {
          console.error(error);

          this.submitError =
            error.error?.detail || 'Error al solicitar servicio';

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: this.submitError,
          });
        },
      });
  }

  /* ===============================
     FORMAT HOUR
  =============================== */

  formatearHora(hora: any): string {

    if (!hora) return '';

    // segundos → HH:mm
    if (typeof hora === 'number') {
      const hours = Math.floor(hora / 3600);
      const minutes = Math.floor((hora % 3600) / 60);

      return `${this.pad(hours)}:${this.pad(minutes)}`;
    }

    // "10:00:00" → "10:00"
    if (typeof hora === 'string') {
      return hora.length >= 5 ? hora.slice(0, 5) : hora;
    }

    return '';
  }

  private pad(value: number): string {
    return value < 10 ? '0' + value : value.toString();
  }

  /* ===============================
     VALIDATIONS HELPERS
  =============================== */

  isInvalid(
    controlName: 'request_date' | 'request_time' | 'service_type' | 'address'
  ): boolean {
    return controlInvalid(this.serviceForm.get(controlName), this.submitted);
  }

  getError(
    controlName: 'request_date' | 'request_time' | 'service_type' | 'address',
    label: string
  ): string | null {
    return getControlErrorMessage(this.serviceForm.get(controlName), label);
  }

  get minServiceDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}