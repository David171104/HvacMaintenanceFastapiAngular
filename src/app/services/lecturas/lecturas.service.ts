import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Lectura {
  id: number;
  fecha_hora: string;
  temperatura: number;
  humedad: number;
  corriente: number;
}

@Injectable({
  providedIn: 'root'
})
export class LecturasService {

  private apiUrl = 'http://127.0.0.1:8001';

  constructor(private http: HttpClient) {}

  getUltimaLectura(): Observable<Lectura> {
    return this.http.get<Lectura>(`${this.apiUrl}/lecturas/ultima`);
  }

  getLecturas(limit: number = 50): Observable<Lectura[]> {
    return this.http.get<Lectura[]>(`${this.apiUrl}/lecturas?limit=${limit}`);
  }
}
