import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Lectura {
  id: number;
  fecha_hora: string;
  temperatura: number;
  humedad: number;
  corriente: number;
  equipo_id?: string | null;
  observacion?: string | null;
  manual_entry?: boolean;
}

export interface IoTEquipment {
  id: string;
  name: string;
  location: string;
}

export interface ManualReadingPayload {
  temperatura: number;
  humedad: number;
  corriente: number;
  fecha_hora_manual: string;
  equipo_id: string;
  observacion?: string;
}

export interface ComparisonPeriod {
  average_temperature: number | null;
  average_humidity: number | null;
  average_current: number | null;
  readings_count: number;
  first_reading_at: string | null;
  last_reading_at: string | null;
}

export interface ComparisonDelta {
  temperature: number | null;
  humidity: number | null;
  current: number | null;
}

export interface IoTComparisonResult {
  equipo_id: string;
  equipment_name: string;
  before: ComparisonPeriod;
  after: ComparisonPeriod;
  delta: ComparisonDelta;
  status: 'improved' | 'worsened' | 'stable' | 'mixed' | 'insufficient_data';
  interpretation: string;
  has_enough_data: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LecturasService {
  private readonly apiUrl = 'http://127.0.0.1:8001';
  private equipmentCache$?: Observable<IoTEquipment[]>;

  constructor(private readonly http: HttpClient) {}

  getUltimaLectura(): Observable<Lectura> {
    return this.http.get<Lectura>(`${this.apiUrl}/lecturas/ultima`);
  }

  getLecturas(limit = 50): Observable<Lectura[]> {
    return this.http.get<Lectura[]>(`${this.apiUrl}/lecturas?limit=${limit}`);
  }

  getIoTEquipment(forceRefresh = false): Observable<IoTEquipment[]> {
    if (!this.equipmentCache$ || forceRefresh) {
      this.equipmentCache$ = this.http.get<IoTEquipment[]>(`${this.apiUrl}/lecturas/equipos`).pipe(
        shareReplay(1),
        catchError((error) => {
          this.equipmentCache$ = undefined;
          return throwError(() => error);
        }),
      );
    }

    return this.equipmentCache$;
  }

  createManualReading(payload: ManualReadingPayload): Observable<Lectura> {
    return this.http.post<Lectura>(`${this.apiUrl}/lecturas`, payload);
  }

  compareReadings(params: {
    equipo_id: string;
    before_from: string;
    before_to: string;
    after_from: string;
    after_to: string;
  }): Observable<IoTComparisonResult> {
    const searchParams = new URLSearchParams(params);
    return this.http.get<IoTComparisonResult>(`${this.apiUrl}/lecturas/comparar?${searchParams.toString()}`);
  }
}
