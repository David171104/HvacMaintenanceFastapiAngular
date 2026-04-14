import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ReportTechnicianOption {
  id: number;
  name: string;
}

export interface ReportEquipmentOption {
  id: string;
  name: string;
  location: string;
}

export interface ReportOptionsResponse {
  technicians: ReportTechnicianOption[];
  service_types: string[];
  service_statuses: string[];
  iot_equipment: ReportEquipmentOption[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly apiUrl = 'http://127.0.0.1:8000';

  constructor(private readonly http: HttpClient) {}

  getReportOptions(): Observable<ReportOptionsResponse> {
    return this.http.get<ReportOptionsResponse>(`${this.apiUrl}/admin/reports/options`);
  }

  downloadIoTReadingsReport(filters: {
    date_from?: string;
    date_to?: string;
    equipment_id?: string;
    limit?: number;
  }): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/admin/reports/lecturas/pdf`, {
      params: this.buildParams(filters),
      observe: 'response',
      responseType: 'blob',
    });
  }

  downloadServicesReport(filters: {
    date_from?: string;
    date_to?: string;
    technician_id?: number | null;
    status?: string;
    service_type?: string;
  }): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/admin/reports/services/pdf`, {
      params: this.buildParams(filters),
      observe: 'response',
      responseType: 'blob',
    });
  }

  downloadAdminSummaryReport(filters: {
    date_from?: string;
    date_to?: string;
  }): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/admin/reports/resumen/pdf`, {
      params: this.buildParams(filters),
      observe: 'response',
      responseType: 'blob',
    });
  }

  private buildParams(filters: Record<string, string | number | null | undefined>): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }
}
