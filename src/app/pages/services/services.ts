import {
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { getStatusLabel } from '../../shared/service-status.util';
import { ServicesStateService } from '../../shared/services-state/services-state.service';

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

interface Client {
  id: number;
  name: string;
  last_name: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './services.html',
  styleUrls: ['./services.css'],
})
export class Services implements OnInit {
  services: Service[] = [];
  technicians: Technician[] = [];
  clientesList: Client[] = [];

  loading = true;
  loadingTechnicians = false;
  loadingClientes = false;
  error = '';

  // ── Modal asignación (existente) ──
  showModal = false;
  selectedServiceId: number | null = null;
  selectedTechnicianId: number | null = null;

  // ── Modal creación manual (nuevo) ──
  showModalCreacion = false;
  isCreando = false;
  creacionError = '';
  creacionForm!: FormGroup;

  private readonly servicesUrl    = 'http://localhost:8000/users/services/all';
  private readonly techniciansUrl = 'http://localhost:8000/users/select/role/tecnico';
  private readonly clientesUrl    = 'http://localhost:8000/users/select/role/cliente';
  private readonly createUrl      = 'http://localhost:8000/users/services/manual_create';

  constructor(
    private readonly http: HttpClient,
    private readonly cd: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    private readonly servicesState: ServicesStateService,
  ) {}

  ngOnInit(): void {
    this.creacionForm = this.fb.nonNullable.group({
      client_id:    [null as number | null,  Validators.required],
      technician_id:[null as number | null],  // opcional
      request_date: ['', Validators.required],
      request_time: ['', Validators.required],
      service_type: ['Correctivo', Validators.required],
      address:      ['', [Validators.required, Validators.minLength(8)]],
    });
    this.getServices();
  }

  getServices(): void {
    this.loading = true;

    this.http.get<any>(this.servicesUrl)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cd.detectChanges();
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('Servicios API:', response);

          this.services = [...(response.resultado ?? [])];
          this.cd.detectChanges();
        },
        error: (err) => {
          console.error(err);

          this.error = 'Error cargando servicios';
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

  // ── MODAL: CREACIÓN MANUAL ────────────────────────────────────────────────

  abrirModalCreacion(): void {
    this.creacionError = '';
    this.creacionForm.reset({
      client_id: null,
      technician_id: null,
      request_date: '',
      request_time: '',
      service_type: 'Correctivo',
      address: '',
    });

    // Carga clientes y técnicos en paralelo si las listas aún están vacías
    if (this.clientesList.length === 0 || this.technicians.length === 0) {
      this.loadingClientes = true;
      this.loadingTechnicians = true;

      const token = localStorage.getItem('access_token');
      const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

      forkJoin({
        clientes:   this.http.get<any>(this.clientesUrl, { headers }),
        tecnicos:   this.http.get<any>(this.techniciansUrl, { headers }),
      })
        .pipe(finalize(() => {
          this.loadingClientes = false;
          this.loadingTechnicians = false;
          this.cd.detectChanges();
        }))
        .subscribe({
          next: ({ clientes, tecnicos }) => {
            this.clientesList = clientes.resultado ?? clientes ?? [];
            this.technicians  = tecnicos.resultado  ?? tecnicos  ?? [];
          },
          error: (err) => {
            console.error('Error cargando selectores:', err);
            this.creacionError = 'No se pudieron cargar los selectores. Intenta de nuevo.';
          },
        });
    }

    this.showModalCreacion = true;
  }

  cerrarModalCreacion(): void {
    this.showModalCreacion = false;
    this.creacionError = '';
    this.creacionForm.reset({
      client_id: null, technician_id: null,
      request_date: '', request_time: '',
      service_type: 'Correctivo', address: '',
    });
  }

  guardarServicioManual(): void {
    if (this.creacionForm.invalid) {
      this.creacionForm.markAllAsTouched();
      return;
    }

    if (this.isCreando) return;

    const raw = this.creacionForm.getRawValue();
    const token = localStorage.getItem('access_token');

    const payload = {
      client_id:     Number(raw.client_id),
      technician_id: raw.technician_id ? Number(raw.technician_id) : null,
      request_date:  raw.request_date,
      request_time:  raw.request_time,
      service_type:  raw.service_type,
      address:       raw.address.trim(),
    };

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    this.isCreando = true;
    this.http.post(this.createUrl, payload, { headers })
      .pipe(finalize(() => { 
        this.isCreando = false; 
        this.cd.detectChanges(); 
      }))
      .subscribe({
        next: () => { 
          this.cerrarModalCreacion(); 
          this.getServices(); 
          Swal.fire({
            icon: 'success',
            title: 'Servicio Creado',
            text: 'El servicio manual se ha registrado correctamente.',
            background: '#0a0f1c',
            color: '#e2e8f0',
            confirmButtonColor: '#0ef0d1'
          });
        },
        error: (err) => { 
          this.creacionError = err.error?.detail || 'Error al crear el servicio.';
          Swal.fire({
            icon: 'error',
            title: 'Error de Creación',
            text: this.creacionError,
            background: '#0a0f1c',
            color: '#e2e8f0',
            confirmButtonColor: '#ef4444'
          });
        },
      });
  }

  loadClientes(): void {
    this.loadingClientes = true;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    
    this.http.get<any>(this.clientesUrl, { headers })
      .pipe(finalize(() => { this.loadingClientes = false; this.cd.detectChanges(); }))
      .subscribe({
        next: (res) => { this.clientesList = res.resultado ?? res ?? []; },
        error: (err) => { console.error('Error cargando clientes:', err); },
      });
  }



  loadTechnicians(): void {
    this.loadingTechnicians = true;
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(this.techniciansUrl, { headers })
      .pipe(
        finalize(() => {
          this.loadingTechnicians = false;
          this.cd.detectChanges();
        }),
      )
      .subscribe({
      next: (response) => {
        console.log('Técnicos:', response);

        this.technicians = response.resultado ?? [];
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando técnicos', err);
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
