import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil, timeout } from 'rxjs/operators';
import { dateNotPast, requiredTrimmed, timeRange } from '../../shared/validation/custom-validators';
import {
  controlInvalid,
  getControlErrorMessage,
  markFormGroupTouched,
  trimFormValues,
} from '../../shared/validation/form-utils';

import { NotificationService } from '../../shared/notifications/notification.service';
import { ServicesStateService, ServicioCliente } from '../../shared/services-state/services-state.service';
import { getStatusLabel } from '../../shared/service-status.util';
/** Timeout en milisegundos para las peticiones HTTP al backend */
const API_TIMEOUT_MS = 15_000;

@Component({
  selector: 'app-client-services',
  standalone: true,
  templateUrl: './client-services.html',
  styleUrls: ['./client-services.css'],
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
})
export class ClientServices implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

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
  loadingServices = false;
  servicesError = '';
  /** Misión 3: ID del servicio cuyo panel de detalle está abierto (null = ninguno) */
  selectedServiceId: number | null = null;

  // La vista lee directamente del estado compartido
  servicios: ServicioCliente[] = [];
  clientId = '';

  /* ===============================
     CONSTRUCTOR
  =============================== */

  constructor(
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService,
    private readonly servicesState: ServicesStateService,
    private readonly cdr: ChangeDetectorRef,
  ) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.id) {
      this.clientId = String(user.id);
    }
  }

  ngOnInit(): void {
    // Sincronizar la vista local con el estado compartido
    this.servicesState.servicios$
      .pipe(takeUntil(this.destroy$))
      .subscribe((list) => {
        this.servicios = list;
        this.cdr.detectChanges();
      });

    this.cargarServicios();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── CARGA DE SERVICIOS ──────────────────────────────────────────────────────

  cargarServicios(): void {
    this.loadingServices = true;
    this.servicesError = '';
    this.servicesState.setLoading(true);

    if (!this.clientId) {
      this.loadingServices = false;
      this.servicesState.setLoading(false);
      this.servicesError = 'No se encontró el cliente autenticado.';
      this.cdr.detectChanges();
      return;
    }

    this.http
      .get<{ resultado: ServicioCliente[] }>(
        `http://localhost:8000/users/services/list/${this.clientId}`,
      )
      .pipe(
        timeout(API_TIMEOUT_MS),
        finalize(() => {
          this.loadingServices = false;
          this.servicesState.setLoading(false);
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (response) => {
          const lista = response.resultado ?? [];
          this.servicesState.setServicios(lista);   // ← propaga al dashboard
        },
        error: (error) => {
          console.error('Error al cargar servicios:', error);

          if (error.status === 404) {
            this.servicesState.setServicios([]);
            this.servicesError = '';
            this.cdr.detectChanges();
            return;
          }

          // timeout() lanza un TimeoutError con name: 'TimeoutError'
          if (error.name === 'TimeoutError') {
            this.servicesError = 'El servidor tardó demasiado. Intenta nuevamente.';
            this.cdr.detectChanges();
            return;
          }

          this.servicesError =
            error.error?.detail || 'No se pudieron cargar los servicios.';
          this.servicesState.setServicios([]);
          this.cdr.detectChanges();
        },
      });
  }

  // ── MODAL ───────────────────────────────────────────────────────────────────

  /** Misión 3: abre/cierra el panel de detalles de la fila clickeada */
  toggleDetalle(id: number): void {
    this.selectedServiceId = this.selectedServiceId === id ? null : id;
  }

  solicitarServicio(): void {
    console.log('Botón clickeado, abriendo modal...');
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
      this.submitError = 'Debes iniciar sesion para solicitar un servicio.';
      this.notificationService.error('Sesion requerida', this.submitError);
      return;
    }

    this.isSubmitting = true;

    this.http
      .post<ServicioCliente>(
        'http://localhost:8000/users/services/create',
        {
          client_id: Number(this.clientId),
          ...this.serviceForm.getRawValue(),
        },
        {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` }),
        },
      )
      .pipe(
        // Misión 1: timeout de 15 s — si el servidor no responde, lanza error
        timeout(API_TIMEOUT_MS),
        // Misión 1: finalize garantiza que isSubmitting siempre vuelve a false
        finalize(() => (this.isSubmitting = false)),
        takeUntil(this.destroy$),
      )
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
          // Recarga la lista y actualiza el BehaviorSubject (propagará al dashboard)
          this.cargarServicios();
        },

        error: (error) => {
          console.error('Error al solicitar servicio:', error);

          if (error.name === 'TimeoutError') {
            this.submitError =
              'El servidor no respondió a tiempo. Revisa tu conexión e intenta de nuevo.';
          } else {
            this.submitError =
              error.error?.detail || 'Error al solicitar el servicio. Intenta nuevamente.';
          }

          this.notificationService.error('No se pudo guardar', this.submitError);
        },
      });
  }

  // ── HELPERS ─────────────────────────────────────────────────────────────────

  // ── HELPERS ─────────────────────────────────────────────────────────────────

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
