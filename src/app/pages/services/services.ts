import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { getStatusLabel } from '../../shared/service-status.util';

/* ===============================
   INTERFACES
================================ */

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

/* ===============================
   COMPONENT
================================ */

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services.html',
  styleUrls: ['./services.css'],
})
export class Services implements OnInit {

  /* ===============================
     DATA
  =============================== */

  services: Service[] = [];
  technicians: Technician[] = [];

  loading = true;
  loadingTechnicians = false;
  error = '';

  /* ===============================
     MODAL STATE
  =============================== */

  showModal = false;
  selectedServiceId: number | null = null;
  selectedTechnicianId: number | null = null;

  /* ===============================
     API URLS
  =============================== */

  private servicesUrl =
    'http://localhost:8000/users/services/all';

  private techniciansUrl =
    'http://localhost:8000/users/technicians/all';

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  /* ===============================
     INIT
  =============================== */

  ngOnInit(): void {
    this.getServices();
  }

  /* ===============================
     GET SERVICES
  =============================== */

  getServices() {

    this.loading = true;

    this.http.get<any>(this.servicesUrl)
      .subscribe({
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
        }
      });
  }

  /* ===============================
     STATUS HTML (UTIL SHARED)
  =============================== */

  getStatusHTML(status: string): string {
    return getStatusLabel(status?.toLowerCase());
  }

  /* ===============================
     MODAL CONTROL
  =============================== */

  openAssignModal(service: Service) {

    this.selectedServiceId = service.id;
    this.selectedTechnicianId = null;

    this.showModal = true;

    this.loadTechnicians();
  }

  closeModal() {
    this.showModal = false;
    this.selectedServiceId = null;
    this.selectedTechnicianId = null;
  }

  /* ===============================
     LOAD TECHNICIANS
  =============================== */

  loadTechnicians() {

    this.loadingTechnicians = true;

    this.http.get<any>(this.techniciansUrl)
      .subscribe({
        next: (response) => {

          console.log('Tecnicos:', response);

          this.technicians = response.resultado ?? [];
          this.loadingTechnicians = false;

          this.cd.detectChanges();
        },

        error: (err) => {
          console.error('Error cargando técnicos', err);
          this.loadingTechnicians = false;
        }
      });
  }

  /* ===============================
     ASSIGN TECHNICIAN
  =============================== */

  assignTechnician(technicianId: number | null) {

    if (!technicianId || !this.selectedServiceId) return;

    const url = `http://localhost:8000/users/services/${this.selectedServiceId}/assign`;

    const body = {
      technician_id: technicianId
    };

    this.http.put(url, body)
      .subscribe({
        next: () => {

          console.log('Tecnico asignado');

          this.closeModal();

          // refrescar tabla
          this.getServices();
        },

        error: (err) => {
          console.error('Error asignando técnico', err);
          alert('No se pudo asignar el técnico');
        }
      });
  }

  /* ===============================
    CONFIRMAR COMPLETAR SERVICIO
  ================================ */

  confirmComplete(service: Service) {

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

  /* ===============================
    COMPLETAR SERVICIO API
  ================================ */

  completeService(serviceId: number) {

    const url = `http://localhost:8000/services/${serviceId}/complete`;

    Swal.fire({
      title: 'Procesando...',
      text: 'Actualizando servicio',
      allowOutsideClick: false,
      
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.http.put(url, {}).subscribe({

      next: () => {

        Swal.fire({
          icon: 'success',
          title: 'Servicio completado',
          text: 'El servicio fue actualizado correctamente',
          
        });

        this.getServices(); // refrescar tabla
      },

      error: (err) => {

        console.error(err);

        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo completar el servicio',
          background: '#0f172a',
          color: '#fff',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }

  /* ===============================
     TRACK BY (performance)
  =============================== */

  trackById(index: number, item: Service) {
    return item.id;
  }

}