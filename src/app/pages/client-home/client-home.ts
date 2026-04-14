import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { finalize, takeUntil, timeout } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import {
  ServicioCliente,
  ServicesStateService,
} from '../../shared/services-state/services-state.service';

const API_TIMEOUT_MS = 15_000;

@Component({
  selector: 'app-client-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-home.html',
  styleUrls: ['./client-home.css'],
})
export class ClientHome implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  userName = '';
  userLastName = '';
  userRole = '';
  clientId = '';

  // KPIs reactivos — se actualizan automáticamente cuando client-services cambia el estado
  totalPendientes = 0;
  totalCompletados = 0;
  totalServicios = 0;
  loadingStats = false;

  constructor(
    private readonly http: HttpClient,
    private readonly servicesState: ServicesStateService,
  ) {}

  ngOnInit(): void {
    this.userName     = localStorage.getItem('userName')     || '';
    this.userLastName = localStorage.getItem('userLastName') || '';
    this.userRole     = localStorage.getItem('userRole')     || '';

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.id) {
      this.clientId = String(user.id);
    }

    // Suscribir a los contadores reactivos del BehaviorSubject
    this.servicesState.totalPendientes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((n) => (this.totalPendientes = n));

    this.servicesState.totalCompletados$
      .pipe(takeUntil(this.destroy$))
      .subscribe((n) => (this.totalCompletados = n));

    this.servicesState.totalServicios$
      .pipe(takeUntil(this.destroy$))
      .subscribe((n) => (this.totalServicios = n));

    this.servicesState.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => (this.loadingStats = loading));

    // Si el estado aún está vacío (acceso directo al dashboard sin pasar por services),
    // cargar los datos proactivamente
    if (this.servicesState.snapshot.length === 0 && this.clientId) {
      this.hydrateServicesState();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private hydrateServicesState(): void {
    this.servicesState.setLoading(true);

    this.http
      .get<{ resultado: ServicioCliente[] }>(
        `http://localhost:8000/users/services/list/${this.clientId}`,
      )
      .pipe(
        timeout(API_TIMEOUT_MS),
        finalize(() => this.servicesState.setLoading(false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (res) => {
          this.servicesState.setServicios(res.resultado ?? []);
        },
        error: () => {
          this.servicesState.setServicios([]);
        },
      });
  }
}
