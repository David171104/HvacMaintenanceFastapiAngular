import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Service {
  id: number;
  client_name: string;
  technician_name?: string;
  service_type: string;
  request_date: string;
  request_time: string;
  address: string;
  current_status: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services.html',
  styleUrls: ['./services.css'],
})
export class Services implements OnInit {

  services: Service[] = [];
  loading = true;
  error = '';

  private apiUrl = 'http://localhost:8000/users/services/all';

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.getServices();
  }

  /* ===============================
     OBTENER SERVICIOS
  =============================== */

  getServices() {

    this.loading = true;

    this.http.get<any>(this.apiUrl)
      .subscribe({
        next: (response) => {

          console.log('Servicios API:', response);

          // 🔥 nueva referencia para Angular
          this.services = [...(response.resultado ?? [])];

          this.loading = false;
          this.cd.detectChanges();
        },

        error: (err) => {
          console.error('Error cargando servicios', err);

          this.error = 'Error cargando servicios';
          this.services = [];
          this.loading = false;

          this.cd.detectChanges();
        }
      });
  }

  /* ===============================
     STATUS LABEL
  =============================== */

  getStatusClass(status: string): string {

    if (!status) return 'services-status';

    switch (status.toLowerCase()) {

      case 'pendiente':
        return 'services-status services-status-pending';

      case 'asignado':
      case 'asignado a técnico':
        return 'services-status services-status-assigned';

      case 'en proceso':
        return 'services-status services-status-progress';

      case 'completado':
      case 'finalizado':
        return 'services-status services-status-completed';

      default:
        return 'services-status';
    }
  }

  /* ===============================
     TRACK BY (performance)
  =============================== */

  trackById(index: number, item: Service) {
    return item.id;
  }

}
