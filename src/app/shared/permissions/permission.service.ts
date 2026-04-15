import { Injectable } from '@angular/core';

export type PermissionAction = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

export interface SessionPermission {
  module_id?: number;
  module?: string;
  module_name?: string;
  routes?: string | Record<string, string> | null;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  readonly storageKey = 'climatech_user_permissions';

  getPermissions(): SessionPermission[] {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  setPermissions(permissions: SessionPermission[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(permissions ?? []));
  }

  clearPermissions(): void {
    localStorage.removeItem(this.storageKey);
  }

  hasPermission(moduleName: string, action: PermissionAction = 'can_view'): boolean {
    const permission = this.findPermission(moduleName);
    return permission ? Boolean(permission[action]) : false;
  }

  private findPermission(moduleName: string): SessionPermission | undefined {
    const normalizedName = this.normalize(moduleName);
    return this.getPermissions().find((permission) => {
      const currentName = permission.module_name ?? permission.module ?? '';
      return this.normalize(currentName) === normalizedName;
    });
  }

  private normalize(value: string): string {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase();
  }
}
