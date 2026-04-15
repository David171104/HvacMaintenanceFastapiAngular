import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { NotificationService } from '../../shared/notifications/notification.service';
import { getStatusLabel } from '../../shared/service-status.util';

interface TechnicianServiceRow {
  id: number;
  client_id: number;
  technician_id: number;
  request_date: string;
  request_time: string;
  service_type: string;
  address: string;
  current_status: string;
  client_name: string;
  technician_name: string;
}

interface TechnicianReportRow {
  id: number;
  service_id: number;
  technician_id: number;
  service_description: string | null;
  service_duration: string | null;
  recommendation: string | null;
  temperature_before: number | null;
  temperature_after: number | null;
  voltage_before: number | null;
  voltage_after: number | null;
  humidity_before: number | null;
  humidity_after: number | null;
  client_rating: number | null;
  client_comments: string | null;
  created_at: string;
}

@Component({
  selector: 'app-technician-reports',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './technician-reports.html',
  styleUrl: './technician-reports.css',
})
export class TechnicianReports implements OnInit {
  private readonly fb = inject(FormBuilder);

  roleId = 0;
  services: TechnicianServiceRow[] = [];
  reportsByServiceId = new Map<number, TechnicianReportRow>();
  selectedServiceIdForCards: number | null = null;

  loading = true;
  saving = false;
  error = '';
  technicianId = 0;

  showModal = false;
  showPreviewModal = false;
  selectedService: TechnicianServiceRow | null = null;
  selectedReport: TechnicianReportRow | null = null;
  previewReportName = '';
  previewUrl: SafeResourceUrl | null = null;
  previewObjectUrl = '';

  readonly reportForm = this.fb.nonNullable.group({
    service_description: ['', [Validators.required]],
    service_duration: ['', [Validators.required]],
    recommendation: ['', [Validators.required]],
    temperature_before: [''],
    temperature_after: [''],
    voltage_before: [''],
    voltage_after: [''],
    humidity_before: [''],
    humidity_after: [''],
  });

  private readonly servicesUrl = 'http://localhost:8000/services/technician';
  private readonly reportsUrl = 'http://localhost:8000/reports/technician';
  private readonly createReportUrl = 'http://localhost:8000/reports';
  private readonly updateReportUrl = 'http://localhost:8000/users/update/reports';

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.roleId = Number(user?.role_id || 0);
    this.technicianId = Number(user?.id || 0);

    if (this.roleId !== 2) {
      this.loading = false;
      this.error = 'Esta vista de reportes es solo para tecnicos.';
      return;
    }

    this.loadData();
  }

  loadData(): void {
    if (!this.technicianId) {
      this.error = 'No se encontro el tecnico autenticado.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = '';

    this.http
      .get<{ resultado?: any[] }>(`${this.servicesUrl}/${this.technicianId}`)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.services = (response.resultado ?? []).map((row: any[]) => ({
            id: row[0],
            client_id: row[1],
            technician_id: row[2],
            request_date: row[3],
            request_time: row[4],
            service_type: row[5],
            address: row[6],
            current_status: row[7],
            client_name: row[8],
            technician_name: row[9],
          }));

          if (!this.selectedServiceIdForCards && this.services.length > 0) {
            this.selectedServiceIdForCards = this.services[0].id;
          }
          this.loadReports();
        },
        error: (error) => {
          console.error('Error loading technician services:', error);
          this.error = 'No se pudieron cargar los servicios asignados.';
          this.services = [];
        },
      });
  }

  loadReports(): void {
    const headers = this.buildAuthHeaders();

    this.http
      .get<TechnicianReportRow[]>(`${this.reportsUrl}/${this.technicianId}`, { headers })
      .subscribe({
        next: (reports) => {
          this.reportsByServiceId = new Map(
            (reports ?? []).map((report) => [Number(report.service_id), report]),
          );
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading technician reports:', error);
          this.notificationService.error(
            'Reportes no disponibles',
            'No se pudieron cargar los reportes tecnicos del tecnico.',
          );
        },
      });
  }

  openReportModal(service: TechnicianServiceRow): void {
    const existingReport = this.reportsByServiceId.get(service.id) ?? null;
    this.selectedService = service;
    this.selectedReport = existingReport;
    this.showModal = true;

    this.reportForm.reset({
      service_description: this.selectedReport?.service_description ?? '',
      service_duration: this.selectedReport?.service_duration ?? '',
      recommendation: this.selectedReport?.recommendation ?? '',
      temperature_before: this.toFormValue(this.selectedReport?.temperature_before),
      temperature_after: this.toFormValue(this.selectedReport?.temperature_after),
      voltage_before: this.toFormValue(this.selectedReport?.voltage_before),
      voltage_after: this.toFormValue(this.selectedReport?.voltage_after),
      humidity_before: this.toFormValue(this.selectedReport?.humidity_before),
      humidity_after: this.toFormValue(this.selectedReport?.humidity_after),
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedService = null;
    this.selectedReport = null;
    this.reportForm.reset({
      service_description: '',
      service_duration: '',
      recommendation: '',
      temperature_before: '',
      temperature_after: '',
      voltage_before: '',
      voltage_after: '',
      humidity_before: '',
      humidity_after: '',
    });
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
    this.previewReportName = '';
    this.previewUrl = null;

    if (this.previewObjectUrl) {
      window.URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = '';
    }
  }

  async saveReport(): Promise<void> {
    if (!this.selectedService) {
      return;
    }

    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      void Swal.fire({
        title: 'Campos incompletos',
        text: 'Completa la descripción, la duración y la recomendación antes de guardar el reporte.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
      });
      return;
    }

    const isEditing = !!this.selectedReport;
    const confirmation = await Swal.fire({
      title: isEditing ? '¿Guardar cambios del reporte?' : '¿Guardar reporte técnico?',
      text: isEditing
        ? 'Se actualizará la información actual del reporte.'
        : 'Se creará el reporte técnico para este servicio.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isEditing ? 'Sí, guardar cambios' : 'Sí, guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const headers = this.buildAuthHeaders();
    const raw = this.reportForm.getRawValue();
    const payload = {
      service_id: this.selectedService.id,
      service_description: raw.service_description.trim(),
      service_duration: raw.service_duration.trim(),
      recommendation: raw.recommendation.trim(),
      temperature_before: this.toNullableNumber(raw.temperature_before),
      temperature_after: this.toNullableNumber(raw.temperature_after),
      voltage_before: this.toNullableNumber(raw.voltage_before),
      voltage_after: this.toNullableNumber(raw.voltage_after),
      humidity_before: this.toNullableNumber(raw.humidity_before),
      humidity_after: this.toNullableNumber(raw.humidity_after),
    };

    const request$ = this.selectedReport
      ? this.http.put(
          `${this.updateReportUrl}/${this.selectedReport.id}`,
          payload,
          { headers },
        )
      : this.http.post(this.createReportUrl, payload, { headers });

    this.saving = true;

    request$
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          const successMessage = isEditing
            ? 'El reporte tecnico fue actualizado correctamente.'
            : 'El reporte tecnico fue creado correctamente.';

          this.notificationService.success('Reporte guardado', successMessage);
          void Swal.fire({
            title: isEditing ? 'Reporte actualizado' : 'Reporte guardado',
            text: successMessage,
            icon: 'success',
            confirmButtonText: 'Aceptar',
          });
          this.closeModal();
          this.loadData();
        },
        error: (error) => {
          console.error('Error saving report:', error);
          this.notificationService.error(
            'No se pudo guardar',
            error.error?.detail || 'No fue posible guardar el reporte tecnico.',
          );
        },
      });
  }

  hasReport(serviceId: number): boolean {
    return this.reportsByServiceId.has(serviceId);
  }

  get selectedServiceForCards(): TechnicianServiceRow | null {
    if (!this.selectedServiceIdForCards) {
      return null;
    }

    return this.services.find((service) => service.id === this.selectedServiceIdForCards) ?? null;
  }

  openSelectedServiceReportModal(): void {
    if (!this.selectedServiceForCards) {
      this.notificationService.error(
        'Servicio requerido',
        'Debes seleccionar un servicio antes de generar o editar el reporte.',
      );
      return;
    }

    this.openReportModal(this.selectedServiceForCards);
  }

  viewSelectedServiceReport(): void {
    if (!this.selectedServiceForCards) {
      this.notificationService.error(
        'Servicio requerido',
        'Debes seleccionar un servicio antes de ver el reporte.',
      );
      return;
    }

    if (!this.hasReport(this.selectedServiceForCards.id)) {
      this.notificationService.error(
        'Reporte no disponible',
        'El servicio seleccionado aun no tiene un reporte tecnico generado.',
      );
      return;
    }

    this.viewReport(this.selectedServiceForCards.id);
  }

  viewReport(serviceId: number): void {
    const report = this.reportsByServiceId.get(serviceId);
    if (!report) {
      return;
    }

    this.http
      .get(`http://localhost:8000/service-report/${report.id}/pdf`, {
        headers: this.buildAuthHeaders(),
        observe: 'response',
        responseType: 'blob',
      })
      .subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) {
            return;
          }

          this.closePreviewModal();
          this.previewObjectUrl = window.URL.createObjectURL(blob);
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
          this.previewReportName = `reporte_${report.id}.pdf`;
          this.showPreviewModal = true;
        },
        error: (error) => {
          console.error('Error downloading technician report:', error);
          this.notificationService.error(
            'No se pudo abrir',
            error.error?.detail || 'No fue posible descargar el reporte tecnico.',
          );
        },
      });
  }

  async downloadPreview(): Promise<void> {
    if (!this.previewObjectUrl) {
      return;
    }

    const confirmation = await Swal.fire({
      title: '¿Descargar PDF?',
      text: 'Se descargará el reporte técnico en formato PDF.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, descargar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = this.previewObjectUrl;
    anchor.download = this.previewReportName || 'reporte.pdf';
    anchor.click();
    anchor.remove();

    void Swal.fire({
      title: 'Descarga iniciada',
      text: 'El reporte técnico se descargó correctamente.',
      icon: 'success',
      timer: 1800,
      showConfirmButton: false,
    });
  }

  getStatusHTML(status: string): string {
    return getStatusLabel(status?.toLowerCase());
  }

  getRatingStars(rating: number | null): string {
    if (!rating || rating < 1) {
      return 'Sin calificar';
    }

    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  trackById(index: number, item: TechnicianServiceRow): number {
    return item.id;
  }

  formatearHora(hora: any): string {
    if (!hora) return '';

    let hours = 0;
    let minutes = 0;

    if (typeof hora === 'number') {
      hours = Math.floor(hora / 3600);
      minutes = Math.floor((hora % 3600) / 60);
    }

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

  formatearFecha(fecha: string): string {
    if (!fecha) return '';

    const date = new Date(fecha);
    const formatted = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return formatted.replace(/^\d{2} (\w+)/, (match, month) => {
      return match.replace(month, month.charAt(0).toUpperCase() + month.slice(1));
    });
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private toNullableNumber(value: string): number | null {
    const trimmed = String(value ?? '').trim();
    return trimmed ? Number(trimmed) : null;
  }

  private toFormValue(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private pad(value: number): string {
    return value < 10 ? '0' + value : value.toString();
  }
}
