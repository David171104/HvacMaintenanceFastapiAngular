import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

interface MaintenanceRecord {
  report_id: number;
  service_id: number;
  last_service_date: string;
  last_notification_date: string | null;
  client_id: number;
  client_name: string;
  client_last_name: string;
  client_email: string;
  technician_id: number | null;
  technician_name: string | null;
  service_type: string;
  address: string;
  can_notify: boolean;
  status_badge: 'Elegible' | 'Notificado' | 'Al día';
}

@Component({
  selector: 'app-maintenance-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: 'maintenance-control.html',
  styleUrls: ['./maintenance-control.css']
})
export class MaintenanceControlComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cd = inject(ChangeDetectorRef);

  records: MaintenanceRecord[] = [];
  loading = true;
  error = '';

  /** IDs en proceso — habilita spinner por fila */
  sendingIds = new Set<number>();

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading = true;
    this.error = '';

    this.http.get<{ records: MaintenanceRecord[]; total: number }>(
      'http://localhost:8000/admin/maintenance/status-list',
      { headers: this.headers }
    )
    .pipe(finalize(() => {
      this.loading = false;
      this.cd.detectChanges();
    }))
    .subscribe({
      next: (res) => {
        this.records = res.records;
      },
      error: (err) => {
        this.error = err.error?.detail || 'Error al cargar el historial de mantenimiento.';
      }
    });
  }

  isSending(reportId: number): boolean {
    return this.sendingIds.has(reportId);
  }

  enviarNotificacion(record: MaintenanceRecord): void {
    if (!record.can_notify || this.sendingIds.has(record.report_id)) return;

    this.sendingIds.add(record.report_id);

    this.http.post<{ message: string }>(
      `http://localhost:8000/admin/maintenance/trigger/${record.report_id}`,
      {},
      { headers: this.headers }
    )
    .pipe(finalize(() => {
      this.sendingIds.delete(record.report_id);
      this.cd.detectChanges();
    }))
    .subscribe({
      next: (res) => {
        // Mutar estado local — la fila permanece pero el botón se bloquea
        record.can_notify = false;
        record.status_badge = 'Notificado';

        Swal.fire({
          icon: 'success',
          title: '¡Notificación enviada!',
          text: res.message,
          background: '#0a0f1c',
          color: '#e2e8f0',
          confirmButtonColor: '#0ef0d1'
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'warning',
          title: 'No se pudo enviar',
          text: err.error?.detail || 'Error al disparar la notificación.',
          background: '#0a0f1c',
          color: '#e2e8f0',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr));
  }

  badgeTone(badge: string): string {
    if (badge === 'Elegible') return 'mc-badge--eligible';
    if (badge === 'Notificado') return 'mc-badge--notified';
    return 'mc-badge--ok';
  }
}
