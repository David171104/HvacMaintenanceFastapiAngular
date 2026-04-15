import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

interface TechnicianStatsResponse {
  success: boolean;
  completed: number;
  pending: number;
  clients: number;
  avg_rating: number;
}

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

interface AgendaItem {
  id: number;
  clientName: string;
  serviceType: string;
  requestDate: string;
  requestTime: string;
  address: string;
  currentStatus: string;
}

@Component({
  selector: 'app-tecnic-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tecnic-home.html',
  styleUrls: ['./tecnic-home.css'],
})
export class TecnicHome implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  userName = '';
  userLastName = '';
  userRole = '';
  technicianId = 0;

  loading = true;
  totalServices = 0;
  completedServices = 0;
  averageRating = 0;
  upcomingAgenda: AgendaItem[] = [];

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') || '';
    this.userLastName = localStorage.getItem('userLastName') || '';
    this.userRole = localStorage.getItem('userRole') || '';

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.technicianId = Number(user?.id || 0);

    if (!this.technicianId) {
      this.loading = false;
      return;
    }

    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get averageRatingLabel(): string {
    if (!this.averageRating) {
      return 'Sin calificaciones aun';
    }

    return `${this.averageRating.toFixed(1)} / 5`;
  }

  get agendaHasItems(): boolean {
    return this.upcomingAgenda.length > 0;
  }

  getGreeting(): string {
    return `${this.userName} ${this.userLastName}`.trim();
  }

  getStatusText(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'completed') return 'Completado';
    if (normalized === 'assigned') return 'Asignado';
    if (normalized === 'pending') return 'Pendiente';
    if (normalized === 'in_progress') return 'En proceso';
    return status || 'Sin estado';
  }

  formatDate(value: string): string {
    if (!value) return '';

    const normalizedDate = this.normalizeDatePart(value);
    if (!normalizedDate) {
      return '';
    }

    const date = new Date(`${normalizedDate}T00:00:00`);
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  }

  formatTime(value: string): string {
    if (!value) return '';

    const normalizedTime = this.normalizeTimePart(value);
    if (!normalizedTime) {
      return '';
    }

    const parts = normalizedTime.split(':');
    const hours = Number(parts[0] || 0);
    const minutes = Number(parts[1] || 0);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;

    return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  private loadDashboard(): void {
    this.loading = true;

    forkJoin({
      stats: this.http.get<TechnicianStatsResponse>(
        `http://localhost:8000/techniccian/stats/${this.technicianId}`,
        { headers: this.buildAuthHeaders() },
      ),
      services: this.http.get<{ resultado?: any[] }>(
        `http://localhost:8000/services/technician/${this.technicianId}`,
      ),
    })
      .pipe(
        finalize(() => (this.loading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: ({ stats, services }) => {
          const mappedServices = (services.resultado ?? []).map((row: any[]): TechnicianServiceRow => ({
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

          this.totalServices = mappedServices.length;
          this.completedServices = Number(stats?.completed || 0);
          this.averageRating = Number(stats?.avg_rating || 0);
          this.upcomingAgenda = this.buildAgenda(mappedServices);
        },
        error: (error) => {
          console.error('Error loading technician dashboard:', error);
          this.totalServices = 0;
          this.completedServices = 0;
          this.averageRating = 0;
          this.upcomingAgenda = [];
        },
      });
  }

  private buildAgenda(services: TechnicianServiceRow[]): AgendaItem[] {
    const now = Date.now();

    return services
      .filter((service) => {
        const normalizedStatus = (service.current_status || '').toLowerCase();
        if (normalizedStatus === 'completed') {
          return false;
        }

        const scheduledAt = this.getServiceTimestamp(service);
        return scheduledAt !== null && scheduledAt >= now;
      })
      .sort((left, right) => {
        const leftDate = this.getServiceTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
        const rightDate = this.getServiceTimestamp(right) ?? Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate;
      })
      .slice(0, 6)
      .map((service) => ({
        id: service.id,
        clientName: service.client_name,
        serviceType: service.service_type,
        requestDate: service.request_date,
        requestTime: service.request_time,
        address: service.address,
        currentStatus: service.current_status,
      }));
  }

  private getServiceTimestamp(service: TechnicianServiceRow): number | null {
    if (!service.request_date || !service.request_time) {
      return null;
    }

    const normalizedDate = this.normalizeDatePart(service.request_date);
    const normalizedTime = this.normalizeTimePart(service.request_time);
    if (!normalizedDate || !normalizedTime) {
      return null;
    }

    const dateValue = new Date(`${normalizedDate}T${normalizedTime}:00`);
    if (!Number.isNaN(dateValue.getTime())) {
      return dateValue.getTime();
    }

    const fallbackDate = new Date(service.request_date);
    if (Number.isNaN(fallbackDate.getTime())) {
      return null;
    }

    const [hours, minutes] = normalizedTime.split(':').map((part) => Number(part || 0));
    fallbackDate.setHours(hours, minutes, 0, 0);
    return fallbackDate.getTime();
  }

  private normalizeDatePart(value: string): string | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }

    const isoLikeMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoLikeMatch) {
      return isoLikeMatch[1];
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeTimePart(value: string): string | null {
    const raw = String(value || '').trim();
    if (!raw) {
      return null;
    }

    if (/^\d+$/.test(raw)) {
      const totalSeconds = Number(raw);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    const hhmmssMatch = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (hhmmssMatch) {
      const hours = String(Number(hhmmssMatch[1])).padStart(2, '0');
      const minutes = hhmmssMatch[2];
      return `${hours}:${minutes}`;
    }

    const parsed = new Date(`1970-01-01T${raw}`);
    if (!Number.isNaN(parsed.getTime())) {
      const hours = String(parsed.getHours()).padStart(2, '0');
      const minutes = String(parsed.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    return null;
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
