import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { getStatusLabel } from '../../shared/service-status.util';

/* ===============================
   INTERFACES
================================ */

interface Service {
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

interface User {
  id: number;
  role_id: number;
  name: string;
  last_name: string;
  email: string;
}

/* ===============================
   COMPONENT
================================ */

@Component({
  selector: 'app-techniccian-services',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './techniccian-services.html',
  styleUrl: './techniccian-services.css',
})
export class TechniccianServices implements OnInit {

  services: Service[] = [];

  loading = true;
  error = '';

  technicianId!: number;

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  /* ===============================
     INIT
  =============================== */

  ngOnInit(): void {
    this.loadUserFromLocalStorage();
    this.getTechnicianServices();
  }

  /* ===============================
     GET USER FROM LOCALSTORAGE
  =============================== */

  loadUserFromLocalStorage() {

    const userData = localStorage.getItem('user');

    if (!userData) {
      this.error = 'Usuario no encontrado en sesión';
      this.loading = false;
      return;
    }

    try {
      const user: User = JSON.parse(userData);
      this.technicianId = user.id;

      console.log('Tecnico ID:', this.technicianId);

    } catch (e) {
      console.error('Error parseando usuario', e);
      this.error = 'Sesión inválida';
      this.loading = false;
    }
  }

  /* ===============================
     GET SERVICES
  =============================== */

  getTechnicianServices() {

    if (!this.technicianId) return;

    this.loading = true;

    const url =
      `http://localhost:8000/services/technician/${this.technicianId}`;

    this.http.get<any>(url)
      .subscribe({

        next: (response) => {

          console.log('Servicios técnico RAW:', response);

          const rows = response.resultado ?? [];

          /* 🔥 CORRECCIÓN CLAVE
             Convertir filas SQL → objetos */
          this.services = rows.map((row: any[]): Service => ({
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

          console.log('Servicios procesados:', this.services);

          this.loading = false;
          this.cd.detectChanges();
        },

        error: (err) => {

          console.error(err);

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

  getStatusHTML(status: string): string {
    return getStatusLabel(status?.toLowerCase());
  }

  /* ===============================
     TRACK BY
  =============================== */

  trackById(index: number, item: Service) {
    return item.id;
  }

  /* ===============================
   FORMAT TIME
================================ */
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
    year: 'numeric'
  });

  return formatted.replace(/^\d{2} (\w+)/, (match, month) => {
    return match.replace(month, month.charAt(0).toUpperCase() + month.slice(1));
  });
}

pad(value: number): string {
  return value < 10 ? '0' + value : value.toString();
}
}