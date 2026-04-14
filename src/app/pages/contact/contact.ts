import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonComponent } from '../../ui/button/button';
import { CardComponent } from '../../ui/card/card';
import { InputComponent } from '../../ui/input/input';
import { SectionHeaderComponent } from '../../ui/section-header/section-header';
import { SelectComponent, SelectOption } from '../../ui/select/select';
import { TextareaComponent } from '../../ui/textarea/textarea';
import { requiredTrimmed } from '../../shared/validation/custom-validators';
import {
  controlInvalid,
  getControlErrorMessage,
  markFormGroupTouched,
  trimFormValues,
} from '../../shared/validation/form-utils';
import { NotificationService } from '../../shared/notifications/notification.service';
import { VALIDATION_LIMITS } from '../../shared/validation/validation.constants';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    ButtonComponent,
    SectionHeaderComponent,
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private readonly fb = inject(FormBuilder);

  readonly supportOptions: SelectOption[] = [
    { label: 'Soporte técnico', value: 'soporte' },
    { label: 'Solicitud comercial', value: 'comercial' },
    { label: 'Onboarding e implementación', value: 'onboarding' },
  ];

  readonly supportForm = this.fb.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        requiredTrimmed,
        Validators.minLength(VALIDATION_LIMITS.text.short),
        Validators.maxLength(VALIDATION_LIMITS.text.long),
      ],
    ],
    email: ['', [Validators.required, Validators.email, requiredTrimmed]],
    company: ['', [Validators.maxLength(VALIDATION_LIMITS.text.long)]],
    requestType: ['', [Validators.required]],
    message: [
      '',
      [
        Validators.required,
        requiredTrimmed,
        Validators.minLength(VALIDATION_LIMITS.text.medium),
        Validators.maxLength(VALIDATION_LIMITS.text.message),
      ],
    ],
  });

  submitted = false;
  sending = false;
  successMessage = '';

  constructor(private readonly notificationService: NotificationService) {}

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    trimFormValues(this.supportForm);

    if (this.supportForm.invalid) {
      markFormGroupTouched(this.supportForm);
      return;
    }

    if (this.sending) {
      return;
    }

    this.sending = true;

    setTimeout(() => {
      this.sending = false;
      this.successMessage = 'Solicitud enviada. Nuestro equipo se pondrá en contacto contigo.';
      this.notificationService.success(
        'Solicitud registrada',
        'Recibimos tu solicitud y será atendida por nuestro equipo técnico.',
      );

      this.supportForm.reset({
        name: '',
        email: '',
        company: '',
        requestType: '',
        message: '',
      });
      this.submitted = false;
    }, 800);
  }

  isInvalid(controlName: 'name' | 'email' | 'company' | 'requestType' | 'message'): boolean {
    return controlInvalid(this.supportForm.get(controlName), this.submitted);
  }

  getError(
    controlName: 'name' | 'email' | 'company' | 'requestType' | 'message',
    label: string,
  ): string | null {
    return getControlErrorMessage(this.supportForm.get(controlName), label);
  }
}
