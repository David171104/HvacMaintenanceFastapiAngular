import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ChartData,
  ChartDataset,
  ChartOptions,
  TooltipItem,
  TooltipOptions,
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { forkJoin } from 'rxjs';

import { IoTEquipment, Lectura, LecturasService } from '../../services/lecturas/lecturas.service';
import { BadgeComponent } from '../../ui/badge/badge';
import { CardComponent } from '../../ui/card/card';
import { SectionHeaderComponent } from '../../ui/section-header/section-header';
import { StatCardComponent } from '../../ui/stat-card/stat-card';

interface DashboardUser {
  id?: number;
  name: string;
  last_name: string;
  email: string;
  role_id: number;
}

interface DashboardService {
  id: number;
  client_name: string;
  technician_name?: string;
  service_type: string;
  request_date: string;
  request_time: string;
  address: string;
  current_status: string;
}

interface QuickLink {
  title: string;
  description: string;
  route: string;
}

interface RecentReadingRow {
  equipo: string;
  fecha: string;
  temperatura: string;
  humedad: string;
  corriente: string;
  origen: string;
  origenTone: 'primary' | 'success';
  observacion: string;
}

interface AlertItem {
  equipo: string;
  fecha: string;
  variable: string;
  motivo: string;
  severidad: 'error' | 'primary';
}

interface MetricSummary {
  average: number | null;
  min: number | null;
  max: number | null;
  statusLabel: string;
  statusTone: 'success' | 'error' | 'primary';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardComponent,
    StatCardComponent,
    SectionHeaderComponent,
    BadgeComponent,
    BaseChartDirective,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomeComponent implements OnInit {
  userName = '';
  userLastName = '';
  userRole = '';

  loading = true;
  error = '';

  totalLecturas = 0;
  totalUsuarios = 0;
  totalServicios = 0;
  serviciosPendientes = 0;
  alertasActivas = 0;
  equiposOperativos = 0;

  promedioTemperatura: number | null = null;
  promedioHumedad: number | null = null;
  promedioCorriente: number | null = null;

  temperatureSummary: MetricSummary = this.emptySummary();
  humiditySummary: MetricSummary = this.emptySummary();
  currentSummary: MetricSummary = this.emptySummary();

  systemIndicator = 'Sistema estable';
  systemIndicatorTone: 'success' | 'error' | 'primary' = 'success';

  recentRows: RecentReadingRow[] = [];
  alertItems: AlertItem[] = [];

  temperatureChartData: ChartData<'line'> = { labels: [], datasets: [] };
  humidityChartData: ChartData<'line'> = { labels: [], datasets: [] };
  currentChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  readonly temperatureChartOptions = this.createLineChartOptions('Temperatura');
  readonly humidityChartOptions = this.createLineChartOptions('Humedad');
  readonly currentChartOptions = this.createBarChartOptions();

  readonly quickLinks: QuickLink[] = [
    {
      title: 'Usuarios',
      description: 'Gestiona operadores, técnicos y clientes registrados.',
      route: '/users',
    },
    {
      title: 'Servicios',
      description: 'Supervisa asignaciones, pendientes y servicios completados.',
      route: '/services',
    },
    {
      title: 'Reportes',
      description: 'Genera documentos administrativos y operativos en PDF.',
      route: '/reports',
    },
    {
      title: 'Lecturas IoT',
      description: 'Consulta telemetría, registro manual y comparativos.',
      route: '/lecturas',
    },
  ];

  private readonly usersApi = 'http://localhost:8000/users/get_users/';
  private readonly servicesApi = 'http://localhost:8000/users/services/all';
  private readonly tempThreshold = { min: 18, max: 28 };
  private readonly humidityThreshold = { min: 35, max: 65 };
  private readonly currentThreshold = { max: 16 };

  constructor(
    private readonly http: HttpClient,
    private readonly lecturasService: LecturasService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') || 'Administrador';
    this.userLastName = localStorage.getItem('userLastName') || '';
    this.userRole = localStorage.getItem('userRole') || '';
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      usersResponse: this.http.get<{ resultado?: DashboardUser[] }>(this.usersApi),
      servicesResponse: this.http.get<{ resultado?: DashboardService[] }>(this.servicesApi),
      lecturas: this.lecturasService.getLecturas(12),
      equipment: this.lecturasService.getIoTEquipment(),
    }).subscribe({
      next: ({ usersResponse, servicesResponse, lecturas, equipment }) => {
        const users = usersResponse.resultado ?? [];
        const services = servicesResponse.resultado ?? [];
        const recentReadings = lecturas ?? [];
        const equipmentMap = new Map<string, IoTEquipment>(equipment.map((item) => [item.id, item]));

        this.totalUsuarios = users.length;
        this.totalServicios = services.length;
        this.totalLecturas = recentReadings.length;
        this.serviciosPendientes = services.filter(
          (service) => !['completed', 'completado'].includes((service.current_status || '').toLowerCase()),
        ).length;
        this.equiposOperativos = equipment.length;

        this.promedioTemperatura = this.getAverage(recentReadings, 'temperatura');
        this.promedioHumedad = this.getAverage(recentReadings, 'humedad');
        this.promedioCorriente = this.getAverage(recentReadings, 'corriente');

        this.temperatureSummary = this.buildSummary(recentReadings, 'temperatura', 'temperatura');
        this.humiditySummary = this.buildSummary(recentReadings, 'humedad', 'humedad');
        this.currentSummary = this.buildSummary(recentReadings, 'corriente', 'corriente');

        this.alertasActivas = this.getActiveAlerts(recentReadings);
        this.defineSystemIndicator();
        this.recentRows = recentReadings.slice(0, 6).map((reading) =>
          this.mapRecentRow(reading, equipmentMap),
        );
        this.alertItems = this.buildAlertItems(recentReadings, equipmentMap);

        this.buildCharts(recentReadings);
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el resumen operativo del dashboard.';
        this.loading = false;
      },
    });
  }

  get greetingName(): string {
    return `${this.userName} ${this.userLastName}`.trim();
  }

  get platformStatusText(): string {
    if (this.alertasActivas > 0) {
      return `${this.alertasActivas} alertas activas en telemetría reciente`;
    }

    if (this.serviciosPendientes > 0) {
      return `${this.serviciosPendientes} servicios pendientes por gestionar`;
    }

    return 'Plataforma operativa con monitoreo estable';
  }

  get recentActivityTitle(): string {
    return this.totalLecturas > 0 ? 'Últimas lecturas registradas' : 'Sin lecturas recientes';
  }

  formatMetric(value: number | null, suffix: string, decimals = 1): string {
    if (value === null || Number.isNaN(value)) {
      return '-';
    }

    return `${value.toFixed(decimals)} ${suffix}`.trim();
  }

  formatDateTime(value: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private buildCharts(readings: Lectura[]): void {
    const sortedReadings = readings
      .slice()
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

    const labels = sortedReadings.map((reading) => this.formatHourLabel(reading.fecha_hora));
    const fullLabels = sortedReadings.map((reading) => this.formatDateTime(reading.fecha_hora));

    this.temperatureChartData = {
      labels,
      datasets: [
        this.createLineDataset(
          'Temperatura',
          sortedReadings.map((reading) => reading.temperatura),
          '#53ddfc',
        ),
      ],
    };

    this.humidityChartData = {
      labels,
      datasets: [
        this.createLineDataset(
          'Humedad',
          sortedReadings.map((reading) => reading.humedad),
          '#69f6b8',
        ),
      ],
    };

    this.currentChartData = {
      labels,
      datasets: [
        this.createBarDataset(
          'Corriente',
          sortedReadings.map((reading) => reading.corriente),
          sortedReadings.map((reading) =>
            this.isCurrentOutOfRange(reading.corriente)
              ? 'rgba(255, 113, 108, 0.82)'
              : 'rgba(255, 207, 109, 0.78)',
          ),
        ),
      ],
    };

    this.temperatureChartOptions.plugins = {
      ...this.temperatureChartOptions.plugins,
      tooltip: this.createTooltipOptions(fullLabels, '°C'),
    };
    this.humidityChartOptions.plugins = {
      ...this.humidityChartOptions.plugins,
      tooltip: this.createTooltipOptions(fullLabels, '%'),
    };
    this.currentChartOptions.plugins = {
      ...this.currentChartOptions.plugins,
      tooltip: this.createTooltipOptions(fullLabels, 'A'),
    };
  }

  private createLineDataset(
    label: string,
    data: number[],
    color: string,
  ): ChartDataset<'line'> {
    return {
      type: 'line',
      label,
      data,
      borderColor: color,
      backgroundColor: `${color}22`,
      tension: 0.34,
      fill: true,
      pointRadius: 2.6,
      pointHoverRadius: 4,
      pointBackgroundColor: color,
      pointBorderWidth: 0,
      borderWidth: 2.2,
    };
  }

  private createBarDataset(
    label: string,
    data: number[],
    backgroundColor: string[],
  ): ChartDataset<'bar'> {
    return {
      type: 'bar',
      label,
      data,
      backgroundColor,
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 22,
    };
  }

  private createLineChartOptions(metricLabel: string): ChartOptions<'line'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#8f9dba',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: '#8f9dba',
          },
          grid: {
            color: 'rgba(116, 128, 156, 0.16)',
          },
          title: {
            display: true,
            text: metricLabel,
            color: '#aebbd6',
          },
        },
      },
    };
  }

  private createBarChartOptions(): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#8f9dba',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
          },
          grid: {
            display: false,
          },
        },
        y: {
          ticks: {
            color: '#8f9dba',
          },
          grid: {
            color: 'rgba(116, 128, 156, 0.16)',
          },
          title: {
            display: true,
            text: 'Corriente',
            color: '#aebbd6',
          },
        },
      },
    };
  }

  private createTooltipOptions(
    fullLabels: string[],
    suffix: string,
  ): TooltipOptions<'line' | 'bar'> {
    return {
      backgroundColor: 'rgba(8, 14, 29, 0.95)',
      titleColor: '#f5f7ff',
      bodyColor: '#dbe5f8',
      borderColor: 'rgba(83, 221, 252, 0.18)',
      borderWidth: 1,
      displayColors: false,
      callbacks: {
        title: (items: TooltipItem<'line' | 'bar'>[]) =>
          fullLabels[items[0]?.dataIndex ?? 0] || '',
        label: (item: TooltipItem<'line' | 'bar'>) =>
          `${item.dataset.label}: ${item.formattedValue} ${suffix}`.trim(),
      } as TooltipOptions<'line' | 'bar'>['callbacks'],
    } as TooltipOptions<'line' | 'bar'>;
  }

  private buildSummary(
    readings: Lectura[],
    key: 'temperatura' | 'humedad' | 'corriente',
    metricType: 'temperatura' | 'humedad' | 'corriente',
  ): MetricSummary {
    if (!readings.length) {
      return this.emptySummary();
    }

    const values = readings.map((reading) => Number(reading[key] || 0));
    const average = this.getAverage(readings, key);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (metricType === 'temperatura') {
      if (values.some((value) => this.isTemperatureOutOfRange(value))) {
        return { average, min, max, statusLabel: 'Fuera de rango', statusTone: 'error' };
      }
      if (max - min > 4) {
        return { average, min, max, statusLabel: 'Revisar', statusTone: 'primary' };
      }
    }

    if (metricType === 'humedad') {
      if (values.some((value) => this.isHumidityOutOfRange(value))) {
        return { average, min, max, statusLabel: 'Fuera de rango', statusTone: 'error' };
      }
      if (max - min > 12) {
        return { average, min, max, statusLabel: 'Revisar', statusTone: 'primary' };
      }
    }

    if (metricType === 'corriente') {
      if (values.some((value) => this.isCurrentOutOfRange(value))) {
        return { average, min, max, statusLabel: 'Fuera de rango', statusTone: 'error' };
      }
      if (max - min > 4) {
        return { average, min, max, statusLabel: 'Revisar', statusTone: 'primary' };
      }
    }

    return { average, min, max, statusLabel: 'Estable', statusTone: 'success' };
  }

  private buildAlertItems(
    readings: Lectura[],
    equipmentMap: Map<string, IoTEquipment>,
  ): AlertItem[] {
    const alerts = readings
      .map((reading) => this.mapAlert(reading, equipmentMap))
      .filter((item): item is AlertItem => item !== null);

    return alerts.slice(0, 5);
  }

  private mapAlert(
    reading: Lectura,
    equipmentMap: Map<string, IoTEquipment>,
  ): AlertItem | null {
    const equipo = this.getEquipmentName(reading.equipo_id, equipmentMap);
    const fecha = this.formatDateTime(reading.fecha_hora);

    if (this.isTemperatureOutOfRange(reading.temperatura)) {
      return {
        equipo,
        fecha,
        variable: 'Temperatura',
        motivo: `Valor registrado en ${this.formatMetric(reading.temperatura, '°C')}`,
        severidad: 'error',
      };
    }

    if (this.isHumidityOutOfRange(reading.humedad)) {
      return {
        equipo,
        fecha,
        variable: 'Humedad',
        motivo: `Nivel registrado en ${this.formatMetric(reading.humedad, '%', 0)}`,
        severidad: 'error',
      };
    }

    if (this.isCurrentOutOfRange(reading.corriente)) {
      return {
        equipo,
        fecha,
        variable: 'Corriente',
        motivo: `Consumo registrado en ${this.formatMetric(reading.corriente, 'A')}`,
        severidad: 'primary',
      };
    }

    return null;
  }

  private mapRecentRow(
    reading: Lectura,
    equipmentMap: Map<string, IoTEquipment>,
  ): RecentReadingRow {
    return {
      equipo: this.getEquipmentName(reading.equipo_id, equipmentMap),
      fecha: this.formatDateTime(reading.fecha_hora),
      temperatura: this.formatMetric(reading.temperatura, '°C'),
      humedad: this.formatMetric(reading.humedad, '%'),
      corriente: this.formatMetric(reading.corriente, 'A'),
      origen: reading.manual_entry ? 'Manual' : 'IoT',
      origenTone: reading.manual_entry ? 'primary' : 'success',
      observacion: this.truncateText(reading.observacion?.trim() || 'Sin observación'),
    };
  }

  private truncateText(value: string, limit = 56): string {
    if (value.length <= limit) {
      return value;
    }

    return `${value.slice(0, limit).trim()}...`;
  }

  private defineSystemIndicator(): void {
    if (this.alertasActivas > 0) {
      this.systemIndicator = 'Alertas activas';
      this.systemIndicatorTone = 'error';
      return;
    }

    if (this.serviciosPendientes > 0) {
      this.systemIndicator = 'Servicios pendientes';
      this.systemIndicatorTone = 'primary';
      return;
    }

    this.systemIndicator = 'Sistema estable';
    this.systemIndicatorTone = 'success';
  }

  private getAverage(
    readings: Lectura[],
    key: 'temperatura' | 'humedad' | 'corriente',
  ): number | null {
    if (!readings.length) {
      return null;
    }

    const total = readings.reduce((sum, item) => sum + Number(item[key] || 0), 0);
    return total / readings.length;
  }

  private getActiveAlerts(readings: Lectura[]): number {
    return readings.filter((reading) => this.isReadingAlert(reading)).length;
  }

  private isReadingAlert(reading: Lectura): boolean {
    return (
      this.isTemperatureOutOfRange(reading.temperatura) ||
      this.isHumidityOutOfRange(reading.humedad) ||
      this.isCurrentOutOfRange(reading.corriente)
    );
  }

  private isTemperatureOutOfRange(value: number): boolean {
    return value < this.tempThreshold.min || value > this.tempThreshold.max;
  }

  private isHumidityOutOfRange(value: number): boolean {
    return value < this.humidityThreshold.min || value > this.humidityThreshold.max;
  }

  private isCurrentOutOfRange(value: number): boolean {
    return value > this.currentThreshold.max;
  }

  private getEquipmentName(
    equipmentId: string | null | undefined,
    equipmentMap: Map<string, IoTEquipment>,
  ): string {
    if (!equipmentId) {
      return 'Equipo no asociado';
    }

    return equipmentMap.get(equipmentId)?.name || equipmentId;
  }

  private formatHourLabel(value: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private emptySummary(): MetricSummary {
    return {
      average: null,
      min: null,
      max: null,
      statusLabel: 'Sin datos',
      statusTone: 'primary',
    };
  }
}
