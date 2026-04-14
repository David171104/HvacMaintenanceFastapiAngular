import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  duration: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly nextId = signal(1);
  readonly notifications = signal<AppNotification[]>([]);

  success(title: string, message: string, duration = 3200): void {
    this.push({ title, message, type: 'success', duration });
  }

  error(title: string, message: string, duration = 4200): void {
    this.push({ title, message, type: 'error', duration });
  }

  info(title: string, message: string, duration = 3000): void {
    this.push({ title, message, type: 'info', duration });
  }

  dismiss(id: number): void {
    this.notifications.update((items) => items.filter((item) => item.id !== id));
  }

  private push(input: Omit<AppNotification, 'id'>): void {
    const id = this.nextId();
    this.nextId.update((value) => value + 1);

    const notification: AppNotification = {
      id,
      ...input,
    };

    this.notifications.update((items) => [...items, notification]);

    window.setTimeout(() => {
      this.dismiss(id);
    }, notification.duration);
  }
}
