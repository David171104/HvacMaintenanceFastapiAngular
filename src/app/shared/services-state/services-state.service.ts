import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

export interface ServicioCliente {
  id: number;
  client_id: number;
  request_date: string;
  request_time: string;
  service_type: string;
  address: string;
  current_status: string;
}

@Injectable({
  providedIn: 'root',
})
export class ServicesStateService {
  private readonly _servicios$ = new BehaviorSubject<ServicioCliente[]>([]);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);

  /** Lista completa de servicios del cliente activo */
  readonly servicios$: Observable<ServicioCliente[]> = this._servicios$.asObservable();

  /** Estado de carga (para mostrar spinners en cualquier componente subscrito) */
  readonly loading$: Observable<boolean> = this._loading$.asObservable();

  /** Contadores reactivos derivados de la lista */
  readonly totalPendientes$: Observable<number> = this._servicios$.pipe(
    map((list) =>
      list.filter((s) => s.current_status?.toLowerCase().includes('pend')).length,
    ),
    distinctUntilChanged(),
  );

  readonly totalCompletados$: Observable<number> = this._servicios$.pipe(
    map((list) =>
      list.filter((s) => s.current_status?.toLowerCase().includes('complet')).length,
    ),
    distinctUntilChanged(),
  );

  readonly totalServicios$: Observable<number> = this._servicios$.pipe(
    map((list) => list.length),
    distinctUntilChanged(),
  );

  /** Actualiza la lista y notifica a todos los subscriptores */
  setServicios(servicios: ServicioCliente[]): void {
    this._servicios$.next(servicios);
  }

  /** Añade un nuevo servicio al estado sin recargar desde el backend */
  addServicio(servicio: ServicioCliente): void {
    this._servicios$.next([...this._servicios$.getValue(), servicio]);
  }

  /** Marca / desmarca el estado de carga global */
  setLoading(loading: boolean): void {
    this._loading$.next(loading);
  }

  /** Limpia el estado al cerrar sesión */
  clearState(): void {
    this._servicios$.next([]);
    this._loading$.next(false);
  }

  /** Getter snapshot (sin Observable, para acceso sincrónico) */
  get snapshot(): ServicioCliente[] {
    return this._servicios$.getValue();
  }
}
