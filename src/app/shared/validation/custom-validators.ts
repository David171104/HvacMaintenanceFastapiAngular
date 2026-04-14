import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import { VALIDATION_LIMITS, VALIDATION_PATTERNS } from './validation.constants';

const isNil = (value: unknown): value is null | undefined => value === null || value === undefined;

const coerceTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseDateOnly = (value: unknown): Date | null => {
  const normalized = coerceTrimmedString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseDateTime = (value: unknown): Date | null => {
  const normalized = coerceTrimmedString(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const toMinutes = (value: string): number | null => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
};

export const requiredTrimmed: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (isNil(control.value)) {
    return { required: true };
  }

  if (typeof control.value === 'string' && !control.value.trim()) {
    return { trimmedRequired: true };
  }

  return null;
};

export const safeNumber: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (isNil(control.value) || control.value === '') {
    return null;
  }

  return coerceNumber(control.value) === null ? { invalidNumber: true } : null;
};

export const numberRange = (min: number, max: number): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    if (isNil(control.value) || control.value === '') {
      return null;
    }

    const value = coerceNumber(control.value);

    if (value === null) {
      return { invalidNumber: true };
    }

    if (value < min || value > max) {
      return { numberRange: { min, max, actual: value } };
    }

    return null;
  };
};

export const dateNotFuture: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (isNil(control.value) || control.value === '') {
    return null;
  }

  const parsed = parseDateOnly(control.value);

  if (!parsed) {
    return { invalidDate: true };
  }

  return parsed > normalizeToday() ? { dateNotFuture: true } : null;
};

export const dateNotPast: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (isNil(control.value) || control.value === '') {
    return null;
  }

  const parsed = parseDateOnly(control.value);

  if (!parsed) {
    return { invalidDate: true };
  }

  return parsed < normalizeToday() ? { dateNotPast: true } : null;
};

export const dateTimeNotFuture: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (isNil(control.value) || control.value === '') {
    return null;
  }

  const parsed = parseDateTime(control.value);

  if (!parsed) {
    return { invalidDate: true };
  }

  return parsed > new Date() ? { dateNotFuture: true } : null;
};

export const strongPassword: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = coerceTrimmedString(control.value);

  if (!value) {
    return null;
  }

  return VALIDATION_PATTERNS.passwordStrong.test(value) ? null : { passwordStrength: true };
};

export const personName: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = coerceTrimmedString(control.value);

  if (!value) {
    return null;
  }

  return VALIDATION_PATTERNS.personName.test(value) ? null : { personName: true };
};

export const phoneNumber: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = coerceTrimmedString(control.value);

  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  const matchesPattern = VALIDATION_PATTERNS.phone.test(value);

  if (
    !matchesPattern ||
    digits.length < VALIDATION_LIMITS.phone.minDigits ||
    digits.length > VALIDATION_LIMITS.phone.maxDigits
  ) {
    return { phone: true };
  }

  return null;
};

export const fieldsMatch = (sourceKey: string, confirmKey: string): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
      return null;
    }

    const source = control.get(sourceKey);
    const confirm = control.get(confirmKey);

    if (!source || !confirm) {
      return null;
    }

    const mismatch = source.value !== confirm.value;
    const currentErrors = confirm.errors ?? {};

    if (!mismatch) {
      if ('fieldMismatch' in currentErrors) {
        const { fieldMismatch, ...remainingErrors } = currentErrors;
        void fieldMismatch;
        confirm.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
      }

      return null;
    }

    confirm.setErrors({ ...currentErrors, fieldMismatch: true });
    return { fieldMismatch: true };
  };
};

export const dateRangeOrder = (
  startKey: string,
  endKey: string,
  errorKey = 'dateRangeOrder',
): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!(control instanceof FormGroup)) {
      return null;
    }

    const start = control.get(startKey);
    const end = control.get(endKey);

    if (!start || !end || !start.value || !end.value) {
      return null;
    }

    const startDate = parseDateTime(start.value);
    const endDate = parseDateTime(end.value);

    if (!startDate || !endDate) {
      return null;
    }

    return startDate > endDate ? { [errorKey]: true } : null;
  };
};

export const timeRange = (
  min = VALIDATION_LIMITS.appointmentHour.min,
  max = VALIDATION_LIMITS.appointmentHour.max,
): ValidatorFn => {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = coerceTrimmedString(control.value);

    if (!value) {
      return null;
    }

    const minutes = toMinutes(value);
    const minMinutes = toMinutes(min);
    const maxMinutes = toMinutes(max);

    if (minutes === null || minMinutes === null || maxMinutes === null) {
      return { invalidTimeRange: true };
    }

    return minutes < minMinutes || minutes > maxMinutes
      ? { invalidTimeRange: { min, max, actual: value } }
      : null;
  };
};
