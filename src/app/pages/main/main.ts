import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonComponent } from '../../ui/button/button';
import { CardComponent } from '../../ui/card/card';
import { SectionHeaderComponent } from '../../ui/section-header/section-header';
import { StatCardComponent } from '../../ui/stat-card/stat-card';

interface LandingItem {
  icon: string;
  title: string;
  description: string;
}

interface LandingMetric {
  label: string;
  value: string;
  meta: string;
  accent: 'primary' | 'success' | 'error';
}

interface LandingTrustItem {
  value: string;
  label: string;
}

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, ButtonComponent, CardComponent, SectionHeaderComponent, StatCardComponent],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  readonly benefits: LandingItem[] = [
    {
      icon: 'RT',
      title: 'Monitoreo en tiempo real',
      description:
        'Visualiza el estado de tus equipos de climatización con lecturas actualizadas y alertas operativas.',
    },
    {
      icon: 'EN',
      title: 'Optimización energética',
      description:
        'Detecta patrones de consumo, reduce desperdicios y mejora la eficiencia térmica de cada instalación.',
    },
    {
      icon: 'IA',
      title: 'Diagnóstico inteligente',
      description:
        'Convierte la telemetría en decisiones accionables para identificar fallas y anticipar desviaciones.',
    },
    {
      icon: 'MP',
      title: 'Mantenimiento preventivo',
      description:
        'Organiza servicios y revisiones con información contextual para disminuir paradas no planificadas.',
    },
  ];

  readonly metrics: LandingMetric[] = [
    {
      label: 'Ahorro energético',
      value: '30%',
      meta: 'Reducción potencial en consumo operativo',
      accent: 'success',
    },
    {
      label: 'Disponibilidad del sistema',
      value: '24/7',
      meta: 'Supervisión continua de variables críticas',
      accent: 'primary',
    },
    {
      label: 'Tiempo de respuesta',
      value: '<15 min',
      meta: 'Alertas y seguimiento más ágiles para soporte',
      accent: 'primary',
    },
    {
      label: 'Eficiencia térmica',
      value: '+18%',
      meta: 'Mejora estimada con ajustes basados en datos',
      accent: 'success',
    },
  ];

  readonly services: LandingItem[] = [
    {
      icon: 'IN',
      title: 'Instalación',
      description:
        'Diseño, configuración y puesta en marcha de sistemas HVAC con criterios de rendimiento y seguridad.',
    },
    {
      icon: 'MT',
      title: 'Mantenimiento',
      description:
        'Rutinas preventivas y correctivas con seguimiento digital de servicios y estado de activos.',
    },
    {
      icon: 'DI',
      title: 'Diagnóstico IoT',
      description:
        'Sensórica, análisis de lecturas y trazabilidad para entender el comportamiento real de cada equipo.',
    },
  ];

  readonly trustItems: LandingTrustItem[] = [
    { value: '+120', label: 'equipos monitoreados' },
    { value: '+30%', label: 'eficiencia energetica estimada' },
    { value: '24/7', label: 'monitoreo en tiempo real' },
  ];

  constructor(private readonly router: Router) {}

  scrollToSection(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }
}
