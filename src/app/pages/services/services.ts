import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { getStatusLabel } from '../../shared/service-status.util';

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

interface Technician {
  id: number;
  name: string;
  last_name: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services.html',
  styleUrls: ['./services.css'],
})
export class Services implements OnInit {
  services: Service[] = [];
  technicians: Technician[] = [];

  loading = true;
  loadingTechnicians = false;
  error = '';

  showModal = false;
  selectedServiceId: number | null = null;
  selectedTechnicianId: number | null = null;

  private readonly servicesUrl = 'http://localhost:8000/users/services/all';
  private readonly techniciansUrl = 'http://localhost:8000/users/technicians/all';

  constructor(
    private readonly http: HttpClient,
    private readonly cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.getServices();
  }

  getServices(): void {
    this.loading = true;

    this.http.get<any>(this.servicesUrl).subscribe({
      next: (response) => {
        console.log('Servicios API:', response);

        this.services = [...(response.resultado ?? [])];
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);

        this.error = 'Error cargando servicios';
        this.loading = false;
        this.services = [];
        this.cd.detectChanges();
      },
    });
  }

  getStatusHTML(status: string): string {
    return getStatusLabel(status?.toLowerCase());
  }

  openAssignModal(service: Service): void {
    this.selectedServiceId = service.id;
    this.selectedTechnicianId = null;
    this.showModal = true;
    this.loadTechnicians();
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedServiceId = null;
    this.selectedTechnicianId = null;
  }

  loadTechnicians(): void {
    this.loadingTechnicians = true;

    this.http.get<any>(this.techniciansUrl).subscribe({
      next: (response) => {
        console.log('Técnicos:', response);

        this.technicians = response.resultado ?? [];
        this.loadingTechnicians = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando técnicos', err);
        this.loadingTechnicians = false;
      },
    });
  }

  assignTechnician(technicianId: number | null): void {
    if (!technicianId || !this.selectedServiceId) {
      return;
    }

    const url = `http://localhost:8000/users/services/${this.selectedServiceId}/assign`;
    const body = { technician_id: technicianId };

    this.http.put(url, body).subscribe({
      next: () => {
        console.log('Técnico asignado');
        this.closeModal();
        this.getServices();
      },
      error: (err) => {
        console.error('Error asignando técnico', err);
        alert('No se pudo asignar el técnico');
      },
    });
  }

  confirmComplete(service: Service): void {
    Swal.fire({
      title: '¿Completar servicio?',
      text: `El servicio #${service.id} será marcado como completado.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, completar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.completeService(service.id);
      }
    });
  }

  completeService(serviceId: number): void {
    const url = `http://localhost:8000/services/${serviceId}/complete`;

    Swal.fire({
      title: 'Procesando...',
      text: 'Actualizando servicio',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    this.http.put(url, {}).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Servicio completado',
          text: 'El servicio fue actualizado correctamente',
        });

        this.getServices();
      },
      error: (err) => {
        console.error(err);

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo completar el servicio',
          background: '#0f172a',
          color: '#fff',
          confirmButtonColor: '#ef4444',
        });
      },
    });
  }

  formatearHora(hora: any): string {
    if (!hora) {
      return '';
    }

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
    if (!fecha) {
      return '';
    }

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

  pad(value: number): string {
    return value < 10 ? '0' + value : value.toString();
  }

  trackById(index: number, item: Service): number {
    return item.id;
  }
}
