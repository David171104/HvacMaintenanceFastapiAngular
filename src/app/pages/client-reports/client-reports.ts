import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';

import { NotificationService } from '../../shared/notifications/notification.service';
import { getStatusLabel } from '../../shared/service-status.util';

interface ClientReportRow {
  id: number;
  service_id: number;
  current_status: string;
  technician_id: number;
  technician_name: string;
  technician_last_name: string;
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
  selector: 'app-client-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-reports.html',
  styleUrl: './client-reports.css',
})
export class ClientReports implements OnInit {
  roleId = 0;
  clientId = 0;
  loading = true;
  savingRating = false;
  error = '';
  reports: ClientReportRow[] = [];
  showPreviewModal = false;
  previewReportName = '';
  previewUrl: SafeResourceUrl | null = null;
  previewObjectUrl = '';
  selectedReport: ClientReportRow | null = null;
  showingPdfPreview = false;
  rating = 0;
  comment = '';

  constructor(
    private readonly http: HttpClient,
    private readonly notificationService: NotificationService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.roleId = Number(user?.role_id || 0);
    this.clientId = Number(user?.id || 0);

    if (this.roleId !== 3) {
      this.loading = false;
      this.error = 'Esta vista de reportes es solo para clientes.';
      return;
    }

    this.loadReports();
  }

  loadReports(): void {
    this.loading = true;
    this.error = '';

    this.http
      .get<ClientReportRow[]>(`http://localhost:8000/users/reports/client/${this.clientId}`, {
        headers: this.buildAuthHeaders(),
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (reports) => {
          this.reports = reports ?? [];
        },
        error: (error) => {
          console.error('Error loading client reports:', error);
          this.error = error.error?.detail || 'No se pudieron cargar tus reportes.';
          this.reports = [];
        },
      });
  }

  viewReport(reportId: number): void {
    const report = this.reports.find((item) => item.id === reportId) ?? null;
    this.prepareSelectedReport(report);
    this.showingPdfPreview = true;

    this.http
      .get(`http://localhost:8000/service-report/${reportId}/pdf`, {
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
          this.prepareSelectedReport(report);
          this.showingPdfPreview = true;
          this.previewObjectUrl = window.URL.createObjectURL(blob);
          this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
          this.previewReportName = `reporte_${reportId}.pdf`;
          this.showPreviewModal = true;
        },
        error: (error) => {
          console.error('Error downloading client report:', error);
          this.notificationService.error(
            'No se pudo abrir',
            error.error?.detail || 'No fue posible descargar el reporte.',
          );
        },
      });
  }

  openRatingModal(reportId: number): void {
    const report = this.reports.find((item) => item.id === reportId) ?? null;
    this.closePreviewModal();
    this.prepareSelectedReport(report);
    this.showingPdfPreview = false;
    this.previewReportName = `reporte_${reportId}.pdf`;
    this.showPreviewModal = true;
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
    this.previewReportName = '';
    this.previewUrl = null;
    this.showingPdfPreview = false;
    this.selectedReport = null;
    this.rating = 0;
    this.comment = '';

    if (this.previewObjectUrl) {
      window.URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = '';
    }
  }

  downloadPreview(): void {
    if (!this.previewObjectUrl) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = this.previewObjectUrl;
    anchor.download = this.previewReportName || 'reporte.pdf';
    anchor.click();
    anchor.remove();
  }

  setRating(value: number): void {
    if (!this.canRateSelectedReport()) {
      return;
    }

    this.rating = value;
  }

  guardarCalificacion(): void {
    if (!this.selectedReport) {
      return;
    }

    if (!this.isSelectedReportCompleted()) {
      this.notificationService.error(
        'Calificacion no disponible',
        'El servicio debe estar completado para calificar.',
      );
      return;
    }

    if (this.hasSelectedReportBeenRated()) {
      this.notificationService.error(
        'Calificacion registrada',
        'Ya calificaste este servicio.',
      );
      return;
    }

    if (!this.rating) {
      this.notificationService.error(
        'Calificacion requerida',
        'Selecciona una cantidad de estrellas antes de enviar.',
      );
      return;
    }

    this.savingRating = true;

    this.http
      .put(
        `http://localhost:8000/users/update/reports/${this.selectedReport.id}`,
        {
          client_rating: this.rating,
          client_comments: this.comment.trim(),
        },
        { headers: this.buildAuthHeaders() },
      )
      .pipe(finalize(() => (this.savingRating = false)))
      .subscribe({
        next: () => {
          const updatedReport: ClientReportRow = {
            ...this.selectedReport!,
            client_rating: this.rating,
            client_comments: this.comment.trim(),
          };

          this.selectedReport = updatedReport;
          this.reports = this.reports.map((report) =>
            report.id === updatedReport.id ? updatedReport : report,
          );

          this.notificationService.success(
            'Calificacion enviada',
            'Tu calificacion del servicio fue registrada correctamente.',
          );
        },
        error: (error) => {
          console.error('Error saving client rating:', error);
          this.notificationService.error(
            'No se pudo guardar',
            error.error?.detail || 'No fue posible guardar tu calificacion.',
          );
        },
      });
  }

  getStatusHTML(status: string): string {
    return getStatusLabel(status?.toLowerCase());
  }

  isSelectedReportCompleted(): boolean {
    return this.selectedReport?.current_status === 'completed';
  }

  hasSelectedReportBeenRated(): boolean {
    return this.selectedReport?.client_rating != null;
  }

  canRateSelectedReport(): boolean {
    return this.isSelectedReportCompleted() && !this.hasSelectedReportBeenRated() && !this.savingRating;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';

    const date = new Date(fecha);
    const formatted = date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return formatted.replace(/^\d{2} (\w+)/, (match, month) =>
      match.replace(month, month.charAt(0).toUpperCase() + month.slice(1)),
    );
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private prepareSelectedReport(report: ClientReportRow | null): void {
    this.selectedReport = report;
    this.rating = report?.client_rating ?? 0;
    this.comment = report?.client_comments ?? '';
  }
}
