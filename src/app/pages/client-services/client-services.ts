import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
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
import { SidebarComponent } from '../../components/sidebar/sidebar';

interface ServicioCliente {
  id: number;
  client_id: number;
  request_date: string;
  request_time: string;
  service_type: string;
  address: string;
  current_status: string;
}

@Component({
  selector: 'app-client-services',
  standalone: true,
  templateUrl: './client-services.html',
  styleUrls: ['./client-services.css'],
  imports: [RouterModule, ReactiveFormsModule, CommonModule, SidebarComponent]
})
export class ClientServices implements OnInit {
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
  loadingServices = false;
  servicesError = '';

  servicios: ServicioCliente[] = [];
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

  ngOnInit(): void {
    this.cargarServicios();
  }

  cargarServicios(): void {
    this.loadingServices = true;
    this.servicesError = '';

    if (!this.clientId) {
      this.loadingServices = false;
      this.servicesError = 'No se encontró el cliente autenticado.';
      return;
    }

    this.http
      .get<{ resultado: ServicioCliente[] }>(
        `http://localhost:8000/users/services/list/${this.clientId}`
      )
      .pipe(finalize(() => (this.loadingServices = false)))
      .subscribe({
        next: (response) => {
          this.servicios = response.resultado ?? [];
          console.log('Servicios del cliente:', this.servicios);
        },
        error: (error) => {
          console.error('Error al cargar servicios:', error);

          if (error.status === 404) {
            this.servicios = [];
            this.servicesError = '';
            return;
          }

          this.servicesError = error.error?.detail || 'No se pudieron cargar los servicios.';
          this.servicios = [];
        },
      });
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
          this.cargarServicios();
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

  getStatusClass(status: string): string {
    const normalized = status?.toLowerCase?.() || '';

    if (normalized.includes('pend')) return 'status-badge status-pending';
    if (normalized.includes('proceso')) return 'status-badge status-progress';
    if (normalized.includes('complet')) return 'status-badge status-done';
    if (normalized.includes('cancel')) return 'status-badge status-cancelled';

    return 'status-badge';
  }

  formatearHora(hora: any): string {
    if (!hora) return '';

    let hours = 0;
    let minutes = 0;

    // Si viene como número (segundos)
    if (typeof hora === 'number') {
      hours = Math.floor(hora / 3600);
      minutes = Math.floor((hora % 3600) / 60);
    }

    // Si viene como string "10:00:00"
    if (typeof hora === 'string') {
      const parts = hora.split(':');
      hours = Number(parts[0]);
      minutes = Number(parts[1]);
    }

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;

    return `${this.pad(hours)}:${this.pad(minutes)} ${ampm}`;
  }

  pad(value: number): string {
    return value < 10 ? '0' + value : value.toString();
  }

  formatearFecha(fecha: string): string {
  if (!fecha) return '';

  const date = new Date(fecha);

  const formatted = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return formatted.replace(/^\d{2} (\w+)/, (match, month) => {
    return match.replace(month, month.charAt(0).toUpperCase() + month.slice(1));
  });
}

  trackByServiceId(index: number, servicio: ServicioCliente): number {
    return servicio.id;
  }
}