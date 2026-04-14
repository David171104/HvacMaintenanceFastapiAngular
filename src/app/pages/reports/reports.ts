import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs/operators';

import {
  ReportEquipmentOption,
  ReportOptionsResponse,
  ReportTechnicianOption,
  ReportsService,
} from '../../services/reports/reports.service';
import { NotificationService } from '../../shared/notifications/notification.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css'],
})
export class Reports implements OnInit, OnDestroy {
  roleId = 0;
  optionsLoading = true;
  downloadingReadings = false;
  downloadingServices = false;
  downloadingSummary = false;
  optionsError = '';
  showPreviewModal = false;
  previewTitle = '';
  previewReportName = '';
  previewUrl: SafeResourceUrl | null = null;
  previewObjectUrl = '';

  technicians: ReportTechnicianOption[] = [];
  serviceTypes: string[] = [];
  serviceStatuses: string[] = [];
  equipmentOptions: ReportEquipmentOption[] = [];

  readonly readingsFilters = {
    date_from: this.getDateOffset(-30),
    date_to: this.getDateOffset(0),
    equipment_id: '',
    limit: 200,
  };

  readonly servicesFilters = {
    date_from: this.getDateOffset(-30),
    date_to: this.getDateOffset(0),
    technician_id: null as number | null,
    status: '',
    service_type: '',
  };

  readonly summaryFilters = {
    date_from: this.getDateOffset(-30),
    date_to: this.getDateOffset(0),
  };

  constructor(
    private readonly reportsService: ReportsService,
    private readonly notificationService: NotificationService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.roleId = Number(user?.role_id || 0);

    if (this.roleId !== 1) {
      this.optionsLoading = false;
      return;
    }

    this.loadOptions();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  loadOptions(): void {
    this.optionsLoading = true;
    this.optionsError = '';

    this.reportsService
      .getReportOptions()
      .pipe(finalize(() => (this.optionsLoading = false)))
      .subscribe({
        next: (response) => this.applyOptions(response),
        error: (error: HttpErrorResponse) => {
          console.error('Error loading report options:', error);
          this.optionsError = 'No se pudieron cargar los filtros de reportes.';
          this.notificationService.error('Reportes no disponibles', this.optionsError);
        },
      });
  }

  downloadReadingsReport(): void {
    this.downloadingReadings = true;

    this.reportsService
      .downloadIoTReadingsReport(this.readingsFilters)
      .pipe(finalize(() => (this.downloadingReadings = false)))
      .subscribe({
        next: (response) => {
          this.openPreview(
            response,
            'reporte_lecturas_iot.pdf',
            'Previsualizacion de lecturas IoT',
          );
          this.notificationService.success(
            'Reporte generado',
            'El historial de lecturas IoT esta listo para previsualizarse.',
          );
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error downloading IoT report:', error);
          this.notificationService.error(
            'No se pudo descargar',
            this.getErrorMessage(error, 'Ocurrio un error generando el reporte de lecturas.'),
          );
        },
      });
  }

  downloadServicesReport(): void {
    this.downloadingServices = true;

    this.reportsService
      .downloadServicesReport(this.servicesFilters)
      .pipe(finalize(() => (this.downloadingServices = false)))
      .subscribe({
        next: (response) => {
          this.openPreview(
            response,
            'reporte_servicios_admin.pdf',
            'Previsualizacion de servicios y mantenimientos',
          );
          this.notificationService.success(
            'Reporte generado',
            'El reporte administrativo de servicios esta listo para previsualizarse.',
          );
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error downloading services report:', error);
          this.notificationService.error(
            'No se pudo descargar',
            this.getErrorMessage(error, 'Ocurrio un error generando el reporte de servicios.'),
          );
        },
      });
  }

  downloadSummaryReport(): void {
    this.downloadingSummary = true;

    this.reportsService
      .downloadAdminSummaryReport(this.summaryFilters)
      .pipe(finalize(() => (this.downloadingSummary = false)))
      .subscribe({
        next: (response) => {
          this.openPreview(
            response,
            'reporte_resumen_admin.pdf',
            'Previsualizacion del resumen administrativo',
          );
          this.notificationService.success(
            'Reporte generado',
            'El resumen administrativo esta listo para previsualizarse.',
          );
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error downloading admin summary report:', error);
          this.notificationService.error(
            'No se pudo descargar',
            this.getErrorMessage(error, 'Ocurrio un error generando el resumen administrativo.'),
          );
        },
      });
  }

  private applyOptions(response: ReportOptionsResponse): void {
    this.technicians = response.technicians ?? [];
    this.serviceTypes = response.service_types ?? [];
    this.serviceStatuses = response.service_statuses ?? [];
    this.equipmentOptions = response.iot_equipment ?? [];
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
    this.previewTitle = '';
    this.previewReportName = '';
    this.previewUrl = null;
    this.revokePreviewUrl();
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

  private openPreview(
    response: HttpResponse<Blob>,
    fallbackName: string,
    title: string,
  ): void {
    const blob = response.body;
    if (!blob) {
      throw new Error('No se recibio contenido para descargar.');
    }

    this.closePreviewModal();

    this.previewReportName = this.getFilename(response) || fallbackName;
    this.previewTitle = title;
    this.previewObjectUrl = window.URL.createObjectURL(blob);
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl);
    this.showPreviewModal = true;
  }

  private getFilename(response: HttpResponse<Blob>): string | null {
    const contentDisposition = response.headers.get('content-disposition');
    if (!contentDisposition) {
      return null;
    }

    const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
    return match?.[1] ?? null;
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    if (typeof error.error === 'string') {
      return error.error || fallback;
    }

    return error.error?.detail || fallback;
  }

  private getDateOffset(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().slice(0, 10);
  }

  private revokePreviewUrl(): void {
    if (this.previewObjectUrl) {
      window.URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = '';
    }
  }
}
