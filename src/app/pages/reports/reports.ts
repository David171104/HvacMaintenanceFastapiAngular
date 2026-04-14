import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
export class Reports implements OnInit {
  optionsLoading = true;
  downloadingReadings = false;
  downloadingServices = false;
  downloadingSummary = false;
  optionsError = '';

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
  ) {}

  ngOnInit(): void {
    this.loadOptions();
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
          this.saveResponseFile(response, 'reporte_lecturas_iot.pdf');
          this.notificationService.success(
            'Reporte generado',
            'El historial de lecturas IoT se descargo correctamente.',
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
          this.saveResponseFile(response, 'reporte_servicios_admin.pdf');
          this.notificationService.success(
            'Reporte generado',
            'El reporte administrativo de servicios se descargo correctamente.',
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
          this.saveResponseFile(response, 'reporte_resumen_admin.pdf');
          this.notificationService.success(
            'Reporte generado',
            'El resumen administrativo se descargo correctamente.',
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

  private saveResponseFile(response: HttpResponse<Blob>, fallbackName: string): void {
    const blob = response.body;
    if (!blob) {
      throw new Error('No se recibio contenido para descargar.');
    }

    const filename = this.getFilename(response) || fallbackName;
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
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
}
