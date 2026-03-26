import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, Subscription, interval } from 'rxjs';

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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lecturas.component.html',
  styleUrls: ['./lecturas.component.css'],
})
export class LecturasComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);

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

  constructor(
    private readonly lecturasService: LecturasService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.resetManualForm();
    this.resetComparisonForm();
    this.cargarCatalogoEquipos();
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

    forkJoin({
      ultima: this.lecturasService.getUltimaLectura(),
      historial: this.lecturasService.getLecturas(20),
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ ultima, historial }) => {
          this.ultimaLectura = ultima;
          this.lecturas = historial || [];
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
}
