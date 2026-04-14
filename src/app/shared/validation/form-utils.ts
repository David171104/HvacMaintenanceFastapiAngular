import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

import { VALIDATION_MESSAGES } from './validation.constants';

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

export const markFormGroupTouched = (control: AbstractControl): void => {
  control.markAsTouched();

  if (control instanceof FormGroup || control instanceof FormArray) {
    Object.values(control.controls).forEach((childControl) => markFormGroupTouched(childControl));
  }
};

export const trimFormValues = (control: AbstractControl): void => {
  if (control instanceof FormGroup || control instanceof FormArray) {
    Object.values(control.controls).forEach((childControl) => trimFormValues(childControl));
    return;
  }

  if (typeof control.value === 'string') {
    const trimmedValue = control.value.trim();

    if (trimmedValue !== control.value) {
      control.setValue(trimmedValue);
    }
  }
};

export const controlInvalid = (control: AbstractControl | null, submitted = false): boolean => {
  if (!control) {
    return false;
  }

  return control.invalid && (control.touched || control.dirty || submitted);
};

export const getControlErrorMessage = (
  control: AbstractControl | null,
  label: string,
): string | null => {
  if (!control?.errors) {
    return null;
  }

  const errors = control.errors;

  if (hasOwn(errors, 'required')) {
    return `${label}: ${VALIDATION_MESSAGES.required}`;
  }

  if (hasOwn(errors, 'trimmedRequired')) {
    return `${label}: ${VALIDATION_MESSAGES.trimmedRequired}`;
  }

  if (hasOwn(errors, 'email')) {
    return `${label}: ${VALIDATION_MESSAGES.email}`;
  }

  if (hasOwn(errors, 'minlength')) {
    const requiredLength = errors['minlength'].requiredLength as number;
    return `${label}: minimo ${requiredLength} caracteres.`;
  }

  if (hasOwn(errors, 'maxlength')) {
    const requiredLength = errors['maxlength'].requiredLength as number;
    return `${label}: maximo ${requiredLength} caracteres.`;
  }

  if (hasOwn(errors, 'pattern')) {
    return `${label}: formato invalido.`;
  }

  if (hasOwn(errors, 'phone')) {
    return `${label}: ${VALIDATION_MESSAGES.invalidPhone}`;
  }

  if (hasOwn(errors, 'passwordStrength')) {
    return `${label}: ${VALIDATION_MESSAGES.passwordStrength}`;
  }

  if (hasOwn(errors, 'personName')) {
    return `${label}: ${VALIDATION_MESSAGES.invalidPersonName}`;
  }

  if (hasOwn(errors, 'fieldMismatch')) {
    return `${label}: ${VALIDATION_MESSAGES.passwordMismatch}`;
  }

  if (hasOwn(errors, 'invalidNumber')) {
    return `${label}: ${VALIDATION_MESSAGES.invalidNumber}`;
  }

  if (hasOwn(errors, 'numberRange')) {
    const range = errors['numberRange'] as { min: number; max: number };
    return `${label}: debe estar entre ${range.min} y ${range.max}.`;
  }

  if (hasOwn(errors, 'dateNotFuture')) {
    return `${label}: ${VALIDATION_MESSAGES.futureDate}`;
  }

  if (hasOwn(errors, 'dateNotPast')) {
    return `${label}: ${VALIDATION_MESSAGES.pastDate}`;
  }

  if (hasOwn(errors, 'invalidDate')) {
    return `${label}: ingresa una fecha valida.`;
  }

  if (hasOwn(errors, 'invalidTimeRange')) {
    return `${label}: ${VALIDATION_MESSAGES.invalidTimeRange}`;
  }

  if (hasOwn(errors, 'min')) {
    return `${label}: el valor minimo es ${errors['min'].min}.`;
  }

  if (hasOwn(errors, 'max')) {
    return `${label}: el valor maximo es ${errors['max'].max}.`;
  }

  return `${label}: revisa el valor ingresado.`;
};
