import { CommonModule } from '@angular/common';
import { NgIf, NgFor } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, Subscription, interval } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartDataset, ChartOptions, TooltipItem, TooltipOptions } from 'chart.js';

import {
  dateRangeOrder,
  dateTimeNotFuture,
  numberRange,
  requiredTrimmed,
  safeNumber,
} from '../../shared/validation/custom-validators';
import {
  controlInvalid,
  getControlErrorMessage,
  markFormGroupTouched,
  trimFormValues,
} from '../../shared/validation/form-utils';
import { NotificationService } from '../../shared/notifications/notification.service';
import { VALIDATION_LIMITS } from '../../shared/validation/validation.constants';
import {
  IoTComparisonResult,
  IoTEquipment,
  Lectura,
  LecturasService,
  ManualReadingPayload,
} from '../../services/lecturas/lecturas.service';

@Component({
  selector: 'app-lecturascomponent',
  standalone: true,

  // 👇 IMPORTANTE
  imports: [CommonModule, NgIf, NgFor, ReactiveFormsModule, BaseChartDirective],

  templateUrl: './lecturas.component.html',
  styleUrls: ['./lecturas.component.css'],
})
export class LecturasComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  @ViewChild(BaseChartDirective) historyChart?: BaseChartDirective;
  userRole = '';
  currentTab: 'historial' | 'comparativa' | 'registro' = 'historial';
  selectedMetrics: Record<'temperatura' | 'humedad' | 'corriente', boolean> = {
    temperatura: true,
    humedad: true,
    corriente: true,
  };
  historyChartData: ChartData<'line'> = { labels: [], datasets: [] };
  readonly historyChartOptions = this.createHistoryChartOptions();

  readonly manualReadingForm = this.fb.nonNullable.group({
    temperatura: [
      '',
      [
        Validators.required,
        safeNumber,
        numberRange(VALIDATION_LIMITS.temperature.min, VALIDATION_LIMITS.temperature.max),
      ],
    ],
    humedad: [
      '',
      [
        Validators.required,
        safeNumber,
        numberRange(VALIDATION_LIMITS.humidity.min, VALIDATION_LIMITS.humidity.max),
      ],
    ],
    corriente: [
      '',
      [
        Validators.required,
        safeNumber,
        numberRange(VALIDATION_LIMITS.current.min, VALIDATION_LIMITS.current.max),
      ],
    ],
    fecha_hora_manual: ['', [Validators.required, dateTimeNotFuture]],
    equipo_id: ['', [Validators.required, requiredTrimmed]],
    observacion: ['', [Validators.maxLength(VALIDATION_LIMITS.observation.maxLength)]],
  });

  readonly comparisonForm = this.fb.nonNullable.group(
    {
      equipo_id: ['', [Validators.required, requiredTrimmed]],
      before_from: ['', [Validators.required, dateTimeNotFuture]],
      before_to: ['', [Validators.required, dateTimeNotFuture]],
      after_from: ['', [Validators.required, dateTimeNotFuture]],
      after_to: ['', [Validators.required, dateTimeNotFuture]],
    },
    {
      validators: [
        dateRangeOrder('before_from', 'before_to', 'beforeRangeOrder'),
        dateRangeOrder('after_from', 'after_to', 'afterRangeOrder'),
      ],
    },
  );

  ultimaLectura: Lectura | null = null;
  lecturas: Lectura[] = [];
  equipmentOptions: IoTEquipment[] = [];
  comparisonResult: IoTComparisonResult | null = null;
  comparisonEmptyMessage = '';

  loading = false;
  equipmentLoading = false;
  comparisonLoading = false;
  error = '';
  equipmentError = '';
  formSubmitted = false;
  comparisonSubmitted = false;
  isSaving = false;

  private autoRefreshSub?: Subscription;
  private chartMotionSub?: Subscription;
  private chartDashOffset = 0;

  constructor(
    private readonly lecturasService: LecturasService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.userRole = this.resolveCurrentRole();
    this.resetManualForm();
    this.resetComparisonForm();
    this.cargarCatalogoEquipos();
    this.cargarDatos();

    this.autoRefreshSub = interval(5000).subscribe(() => {
      this.cargarDatos();
    });

    this.chartMotionSub = interval(120).subscribe(() => {
      this.animateHistoryChart();
    });
  }

  ngOnDestroy(): void {
    this.autoRefreshSub?.unsubscribe();
    this.chartMotionSub?.unsubscribe();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      ultima: this.lecturasService.getUltimaLectura(),
      historial: this.lecturasService.getLecturas(20),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ ultima, historial }) => {
          this.ultimaLectura = ultima;
          this.lecturas = historial || [];
          this.buildHistoryChart();
        },
        error: (err) => {
          console.error('Error cargando lecturas:', err);
          this.error = 'No se pudieron cargar las lecturas.';
        },
      });
  }

  cargarCatalogoEquipos(forceRefresh = false): void {
    this.equipmentLoading = true;
    this.equipmentError = '';

    this.lecturasService
      .getIoTEquipment(forceRefresh)
      .pipe(finalize(() => (this.equipmentLoading = false)))
      .subscribe({
        next: (items) => {
          this.equipmentOptions = items ?? [];
          this.ensureSelectedEquipmentStillExists();
        },
        error: (error) => {
          console.error('Error cargando equipos IoT:', error);
          this.equipmentOptions = [];
          this.ensureSelectedEquipmentStillExists();
          this.equipmentError = 'No se pudo cargar el catalogo de equipos IoT.';
          this.notificationService.error('Catalogo no disponible', this.equipmentError);
        },
      });
  }

  actualizarPanel(): void {
    this.cargarDatos();
    this.cargarCatalogoEquipos(true);
  }

  changeTab(tabName: 'historial' | 'comparativa' | 'registro'): void {
    if (tabName === 'registro' && !this.canAccessManualTab) {
      this.currentTab = 'historial';
      return;
    }

    this.currentTab = tabName;
  }

  toggleMetric(metric: 'temperatura' | 'humedad' | 'corriente'): void {
    if (this.selectedMetricCount === 1 && this.selectedMetrics[metric]) {
      this.notificationService.info(
        'Seleccion minima',
        'Debes mantener al menos una metrica visible en la grafica.',
      );
      return;
    }

    this.selectedMetrics[metric] = !this.selectedMetrics[metric];
    this.buildHistoryChart();
  }

  registrarLecturaManual(): void {
    this.formSubmitted = true;
    trimFormValues(this.manualReadingForm);

    if (!this.hasEquipmentAvailable) {
      this.notificationService.error(
        'Sin equipos disponibles',
        'Debes cargar un equipo IoT valido antes de registrar la lectura.',
      );
      return;
    }

    if (this.manualReadingForm.invalid) {
      markFormGroupTouched(this.manualReadingForm);
      return;
    }

    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    const formValue = this.manualReadingForm.getRawValue();
    const payload: ManualReadingPayload = {
      temperatura: Number(formValue.temperatura),
      humedad: Number(formValue.humedad),
      corriente: Number(formValue.corriente),
      fecha_hora_manual: formValue.fecha_hora_manual,
      equipo_id: formValue.equipo_id,
      ...(formValue.observacion ? { observacion: formValue.observacion } : {}),
    };

    this.lecturasService
      .createManualReading(payload)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.notificationService.success(
            'Lectura registrada',
            'La lectura manual se guardo correctamente.',
          );
          this.resetManualForm();
          this.cargarDatos();
        },
        error: (error) => {
          console.error('Error registrando lectura manual:', error);
          this.notificationService.error(
            'No se pudo guardar',
            error.error?.detail || 'Ocurrio un error al registrar la lectura manual.',
          );
        },
      });
  }

  compararPeriodos(): void {
    this.comparisonSubmitted = true;
    trimFormValues(this.comparisonForm);

    if (!this.hasEquipmentAvailable) {
      this.notificationService.error(
        'Sin equipos disponibles',
        'Debes contar con un equipo activo para ejecutar la comparacion.',
      );
      return;
    }

    if (this.comparisonForm.invalid) {
      markFormGroupTouched(this.comparisonForm);
      return;
    }

    if (this.comparisonLoading) {
      return;
    }

    this.comparisonLoading = true;
    this.comparisonEmptyMessage = '';

    const formValue = this.comparisonForm.getRawValue();

    this.lecturasService
      .compareReadings({
        equipo_id: formValue.equipo_id,
        before_from: formValue.before_from,
        before_to: formValue.before_to,
        after_from: formValue.after_from,
        after_to: formValue.after_to,
      })
      .pipe(finalize(() => (this.comparisonLoading = false)))
      .subscribe({
        next: (result) => {
          this.comparisonResult = result;

          if (!result.has_enough_data) {
            this.comparisonEmptyMessage = result.interpretation;
            this.notificationService.info('Comparacion incompleta', result.interpretation);
            return;
          }

          this.notificationService.success(
            'Comparacion lista',
            'El analisis antes y despues del mantenimiento ya esta disponible.',
          );
        },
        error: (error) => {
          console.error('Error comparando lecturas:', error);
          this.comparisonResult = null;
          this.comparisonEmptyMessage = '';
          this.notificationService.error(
            'No se pudo comparar',
            error.error?.detail || 'Ocurrio un error al comparar los periodos seleccionados.',
          );
        },
      });
  }

  resetManualForm(): void {
    this.manualReadingForm.reset({
      temperatura: '',
      humedad: '',
      corriente: '',
      fecha_hora_manual: this.defaultManualDateTime,
      equipo_id: '',
      observacion: '',
    });
    this.formSubmitted = false;
  }

  resetComparisonForm(): void {
    this.comparisonForm.reset({
      equipo_id: '',
      before_from: this.offsetDateTime(-48),
      before_to: this.offsetDateTime(-24),
      after_from: this.offsetDateTime(-24),
      after_to: this.defaultManualDateTime,
    });
    this.comparisonSubmitted = false;
    this.comparisonResult = null;
    this.comparisonEmptyMessage = '';
  }

  isInvalid(
    controlName:
      | 'temperatura'
      | 'humedad'
      | 'corriente'
      | 'fecha_hora_manual'
      | 'equipo_id'
      | 'observacion',
  ): boolean {
    return controlInvalid(this.manualReadingForm.get(controlName), this.formSubmitted);
  }

  getError(
    controlName:
      | 'temperatura'
      | 'humedad'
      | 'corriente'
      | 'fecha_hora_manual'
      | 'equipo_id'
      | 'observacion',
    label: string,
  ): string | null {
    return getControlErrorMessage(this.manualReadingForm.get(controlName), label);
  }

  isComparisonInvalid(
    controlName: 'equipo_id' | 'before_from' | 'before_to' | 'after_from' | 'after_to',
  ): boolean {
    return controlInvalid(this.comparisonForm.get(controlName), this.comparisonSubmitted);
  }

  getComparisonError(
    controlName: 'equipo_id' | 'before_from' | 'before_to' | 'after_from' | 'after_to',
    label: string,
  ): string | null {
    return getControlErrorMessage(this.comparisonForm.get(controlName), label);
  }

  formatearFecha(fecha: string | null | undefined): string {
    if (!fecha) {
      return 'Sin datos';
    }

    return new Date(fecha).toLocaleString('es-CO');
  }

  formatDelta(value: number | null | undefined, unit: string): string {
    if (value === null || value === undefined) {
      return 'Sin datos';
    }

    const signal = value > 0 ? '+' : '';
    return `${signal}${value.toFixed(2)} ${unit}`;
  }

  get defaultManualDateTime(): string {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  get maxManualDateTime(): string {
    return this.defaultManualDateTime;
  }

  get hasEquipmentAvailable(): boolean {
    return this.equipmentOptions.length > 0;
  }

  get hasBeforeRangeError(): boolean {
    return !!this.comparisonForm.errors?.['beforeRangeOrder'] && this.comparisonSubmitted;
  }

  get hasAfterRangeError(): boolean {
    return !!this.comparisonForm.errors?.['afterRangeOrder'] && this.comparisonSubmitted;
  }

  get canAccessManualTab(): boolean {
    return ['tecnico', 'supervisor'].includes(this.userRoleNormalized);
  }

  get comparisonStatusLabel(): string {
    switch (this.comparisonResult?.status) {
      case 'improved':
        return 'Mejora';
      case 'worsened':
        return 'Empeoramiento';
      case 'stable':
        return 'Sin cambio';
      case 'mixed':
        return 'Mixto';
      default:
        return 'Sin datos';
    }
  }

  get selectedMetricCount(): number {
    return Object.values(this.selectedMetrics).filter(Boolean).length;
  }

  private get userRoleNormalized(): string {
    return (this.userRole || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private resolveCurrentRole(): string {
    return localStorage.getItem('userRole') || '';
  }

  private ensureSelectedEquipmentStillExists(): void {
    const selectedManualEquipment = this.manualReadingForm.get('equipo_id')?.value;
    const selectedComparisonEquipment = this.comparisonForm.get('equipo_id')?.value;

    if (
      selectedManualEquipment &&
      !this.equipmentOptions.some((item) => item.id === selectedManualEquipment)
    ) {
      this.manualReadingForm.get('equipo_id')?.setValue('');
    }

    if (
      selectedComparisonEquipment &&
      !this.equipmentOptions.some((item) => item.id === selectedComparisonEquipment)
    ) {
      this.comparisonForm.get('equipo_id')?.setValue('');
    }
  }

  private offsetDateTime(hoursOffset: number): string {
    const now = new Date();
    now.setHours(now.getHours() + hoursOffset);
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
  }

  private buildHistoryChart(): void {
    const sortedReadings = this.lecturas
      .slice()
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

    const labels = sortedReadings.map((reading) => this.formatHourLabel(reading.fecha_hora));
    const fullLabels = sortedReadings.map((reading) => this.formatearFecha(reading.fecha_hora));
    const datasets: ChartDataset<'line'>[] = [];

    if (this.selectedMetrics.temperatura) {
      datasets.push(
        this.createMetricDataset(
          'Temperatura',
          sortedReadings.map((reading) => Number(reading.temperatura ?? 0)),
          '#53ddfc',
          'yTemperatura',
        ),
      );
    }

    if (this.selectedMetrics.humedad) {
      datasets.push(
        this.createMetricDataset(
          'Humedad',
          sortedReadings.map((reading) => Number(reading.humedad ?? 0)),
          '#69f6b8',
          'yHumedad',
        ),
      );
    }

    if (this.selectedMetrics.corriente) {
      datasets.push(
        this.createMetricDataset(
          'Corriente',
          sortedReadings.map((reading) => Number(reading.corriente ?? 0)),
          '#ffcf6d',
          'yCorriente',
        ),
      );
    }

    this.historyChartData = {
      labels,
      datasets,
    };

    this.historyChartOptions.plugins = {
      ...this.historyChartOptions.plugins,
      tooltip: this.createHistoryTooltipOptions(fullLabels),
    };
  }

  private createMetricDataset(
    label: string,
    data: number[],
    color: string,
    axisId: 'yTemperatura' | 'yHumedad' | 'yCorriente',
  ): ChartDataset<'line'> {
    return {
      type: 'line',
      label,
      data,
      yAxisID: axisId,
      borderColor: color,
      backgroundColor: `${color}20`,
      tension: 0.34,
      fill: false,
      pointRadius: 2.8,
      pointHoverRadius: 4.4,
      pointBackgroundColor: color,
      pointBorderWidth: 0,
      borderWidth: 2.4,
      borderDash: [10, 8],
      borderDashOffset: this.chartDashOffset,
    };
  }

  private createHistoryChartOptions(): ChartOptions<'line'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#cbd5e1',
            usePointStyle: true,
            boxWidth: 10,
            boxHeight: 10,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#8f9dba',
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: {
            display: false,
          },
        },
        yTemperatura: {
          type: 'linear',
          position: 'left',
          ticks: {
            color: '#53ddfc',
            callback: (value) => `${value} °C`,
          },
          grid: {
            color: 'rgba(116, 128, 156, 0.16)',
          },
          title: {
            display: true,
            text: 'Temperatura',
            color: '#53ddfc',
          },
        },
        yHumedad: {
          type: 'linear',
          position: 'right',
          ticks: {
            color: '#69f6b8',
            callback: (value) => `${value} %`,
          },
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Humedad',
            color: '#69f6b8',
          },
        },
        yCorriente: {
          type: 'linear',
          position: 'right',
          offset: true,
          ticks: {
            color: '#ffcf6d',
            callback: (value) => `${value} A`,
          },
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Corriente',
            color: '#ffcf6d',
          },
        },
      },
    };
  }

  private createHistoryTooltipOptions(fullLabels: string[]): TooltipOptions<'line'> {
    return {
      backgroundColor: 'rgba(8, 14, 29, 0.95)',
      titleColor: '#f5f7ff',
      bodyColor: '#dbe5f8',
      borderColor: 'rgba(83, 221, 252, 0.18)',
      borderWidth: 1,
      callbacks: {
        title: (items: TooltipItem<'line'>[]) => fullLabels[items[0]?.dataIndex ?? 0] || '',
        label: (item: TooltipItem<'line'>) =>
          `${item.dataset.label}: ${item.formattedValue} ${this.getMetricSuffix(item.dataset.label || '')}`.trim(),
      } as TooltipOptions<'line'>['callbacks'],
    } as TooltipOptions<'line'>;
  }

  private getMetricSuffix(metricLabel: string): string {
    switch ((metricLabel || '').toLowerCase()) {
      case 'temperatura':
        return '°C';
      case 'humedad':
        return '%';
      case 'corriente':
        return 'A';
      default:
        return '';
    }
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

  private animateHistoryChart(): void {
    if (!this.historyChartData.datasets.length || this.currentTab !== 'historial') {
      return;
    }

    this.chartDashOffset -= 0.7;

    this.historyChartData.datasets.forEach((dataset) => {
      dataset.borderDashOffset = this.chartDashOffset;
    });

    this.historyChart?.update('none');
  }
}
