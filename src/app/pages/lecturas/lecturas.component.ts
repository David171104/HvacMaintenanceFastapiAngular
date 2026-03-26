import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgIf, NgFor } from '@angular/common';
import { Lectura, LecturasService } from '../../services/lecturas/lecturas.service';
import { Subscription, interval } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-lecturascomponent',
  standalone: true,

  // 👇 IMPORTANTE
  imports: [NgIf, NgFor, SidebarComponent],

  templateUrl: './lecturas.component.html',
  styleUrls: ['./lecturas.component.css']
})
export class LecturasComponent implements OnInit, OnDestroy {

  ultimaLectura: Lectura | null = null;
  lecturas: Lectura[] = [];
  loading = false;
  error = '';

  private autoRefreshSub?: Subscription;

  constructor(private lecturasService: LecturasService) {}

  ngOnInit(): void {
    this.cargarDatos();

    this.autoRefreshSub = interval(5000).subscribe(() => {
      this.cargarDatos();
    });
  }

  ngOnDestroy(): void {
    this.autoRefreshSub?.unsubscribe();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    this.lecturasService.getUltimaLectura().subscribe({
      next: (data) => this.ultimaLectura = data
    });

    this.lecturasService.getLecturas(20).subscribe({
      next: (data) => {
        console.log("DATOS API:", data); // 👈 DEBUG
        this.lecturas = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.log(err);
        this.error = 'No se pudieron cargar las lecturas';
        this.loading = false;
      }
    });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-CO');
  }
}
