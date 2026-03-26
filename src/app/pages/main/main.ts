import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { Footer } from '../../components/footer/footer';
import { Navbar } from '../../components/navbar/navbar';
import { phoneNumber, requiredTrimmed } from '../../shared/validation/custom-validators';
import {
  controlInvalid,
  getControlErrorMessage,
  markFormGroupTouched,
  trimFormValues,
} from '../../shared/validation/form-utils';
import { NotificationService } from '../../shared/notifications/notification.service';
import { VALIDATION_LIMITS } from '../../shared/validation/validation.constants';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, ReactiveFormsModule, RouterModule],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  private readonly fb = inject(FormBuilder);

  readonly contactForm = this.fb.nonNullable.group({
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
    phone: ['', [Validators.required, requiredTrimmed, phoneNumber]],
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

  contactSubmitted = false;
  contactSending = false;
  contactSuccess = '';

  constructor(
    private readonly router: Router,
    private readonly notificationService: NotificationService,
  ) {}

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  submitContact(): void {
    this.contactSubmitted = true;
    this.contactSuccess = '';
    trimFormValues(this.contactForm);

    if (this.contactForm.invalid) {
      markFormGroupTouched(this.contactForm);
      return;
    }

    if (this.contactSending) {
      return;
    }

    this.contactSending = true;

    setTimeout(() => {
      this.contactSending = false;
      this.contactSuccess = 'Tu mensaje fue validado y quedo listo para enviarse.';
      this.notificationService.success(
        'Mensaje listo',
        'La informacion del formulario quedo validada y preparada para enviarse.',
      );
      this.contactForm.reset({
        name: '',
        email: '',
        phone: '',
        message: '',
      });
      this.contactSubmitted = false;
    }, 600);
  }

  isContactInvalid(controlName: 'name' | 'email' | 'phone' | 'message'): boolean {
    return controlInvalid(this.contactForm.get(controlName), this.contactSubmitted);
  }

  getContactError(controlName: 'name' | 'email' | 'phone' | 'message', label: string): string | null {
    return getControlErrorMessage(this.contactForm.get(controlName), label);
  }
}
