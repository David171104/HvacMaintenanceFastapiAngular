import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PermissionItem {
  module_id: number;
  module_name: string;
  routes: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface RoleItem {
  id: number;
  name: string;
  status: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private readonly base = 'http://localhost:8000/roles';

  constructor(private readonly http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getRoles(): Observable<{ roles: RoleItem[] }> {
    return this.http.get<{ roles: RoleItem[] }>(this.base, {
      headers: this.headers,
    });
  }

  getRolePermissions(
    roleId: number
  ): Observable<{ role_id: number; permissions: PermissionItem[] }> {
    return this.http.get<{
      role_id: number;
      permissions: PermissionItem[];
    }>(`${this.base}/${roleId}/permissions`, { headers: this.headers });
  }

  updateRolePermissions(
    roleId: number,
    permissions: PermissionItem[]
  ): Observable<{ message: string }> {
    const payload = {
      permissions: permissions.map((p) => ({
        module_id: p.module_id,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
      })),
    };
    return this.http.put<{ message: string }>(
      `${this.base}/${roleId}/permissions`,
      payload,
      { headers: this.headers }
    );
  }

  createRole(
    name: string,
    status: number
  ): Observable<{ message: string; role: RoleItem }> {
    return this.http.post<{ message: string; role: RoleItem }>(
      this.base,
      { name, status },
      { headers: this.headers }
    );
  }

  updateRole(
    roleId: number,
    name: string,
    status: number
  ): Observable<{ message: string; role: RoleItem }> {
    return this.http.put<{ message: string; role: RoleItem }>(
      `${this.base}/${roleId}`,
      { name, status },
      { headers: this.headers }
    );
  }

  deleteRole(roleId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${roleId}`, {
      headers: this.headers,
    });
  }
}
