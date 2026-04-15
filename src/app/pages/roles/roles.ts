import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import {
  RolesService,
  RoleItem,
  PermissionItem,
} from '../../services/roles/roles.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.html',
  styleUrls: ['./roles.css'],
})
export class RolesComponent implements OnInit {
  // ── State ──────────────────────────────────────────────────────────
  roles: RoleItem[] = [];
  selectedRole: RoleItem | null = null;
  permissions: PermissionItem[] = [];

  loading = true;
  loadingPermissions = false;
  saving = false;
  error = '';

  // ── Create / Edit modal ────────────────────────────────────────────
  showModal = false;
  isCreating = false;
  modalName = '';
  modalStatus = 1;

  constructor(
    private readonly rolesSvc: RolesService,
    private readonly cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  // ── Data Loading ───────────────────────────────────────────────────
  loadRoles(): void {
    this.loading = true;
    this.error = '';

    this.rolesSvc.getRoles().subscribe({
      next: (res) => {
        this.roles = res.roles ?? [];
        this.loading = false;
        // Re-select if a role was already selected (refresh)
        if (this.selectedRole) {
          const updated = this.roles.find((r) => r.id === this.selectedRole!.id);
          if (updated) this.selectedRole = updated;
        }
        this.cd.detectChanges();
      },
      error: () => {
        this.error = 'No se pudo cargar la lista de roles.';
        this.loading = false;
        this.cd.detectChanges();
      },
    });
  }

  // ── Role Selection (Tuerca) ───────────────────────────────────────
  seleccionarRol(rol: RoleItem): void {
    if (rol.id === 1) return; // Superadmin inmutable – no se pueden ver ni editar sus permisos
    if (this.selectedRole?.id === rol.id) return; // already selected
    this.selectedRole = rol;
    this.permissions = [];
    this.loadingPermissions = true;

    this.rolesSvc.getRolePermissions(rol.id).subscribe({
      next: (res) => {
        this.permissions = res.permissions ?? [];
        this.loadingPermissions = false;
        this.cd.detectChanges();
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los permisos del rol.',
          background: '#0f172a',
          color: '#f8fafc',
          confirmButtonColor: '#ef4444',
        });
        this.loadingPermissions = false;
        this.cd.detectChanges();
      },
    });
  }

  // ── Toggle Permission Checkbox ─────────────────────────────────────
  togglePermiso(
    moduleId: number,
    campo: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
  ): void {
    if (this.selectedRole?.id === 1) return; // Superadmin inmutable
    const perm = this.permissions.find((p) => p.module_id === moduleId);
    if (perm) {
      perm[campo] = !perm[campo];
    }
  }

  // ── Save Permissions ───────────────────────────────────────────────
  guardarPermisos(): void {
    if (!this.selectedRole) return;
    if (this.selectedRole.id === 1) {
      void Swal.fire({
        icon: 'error',
        title: 'Acción bloqueada',
        text: 'Los permisos del Superadmin son inmutables y no pueden modificarse.',
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonColor: '#ef4444',
      });
      return;
    }
    this.saving = true;

    this.rolesSvc
      .updateRolePermissions(this.selectedRole.id, this.permissions)
      .subscribe({
        next: () => {
          this.saving = false;
          void Swal.fire({
            icon: 'success',
            title: 'Permisos actualizados',
            text: `Los permisos de "${this.selectedRole!.name}" fueron guardados correctamente.`,
            background: '#0f172a',
            color: '#f8fafc',
            confirmButtonColor: '#53ddfc',
            timer: 2000,
            showConfirmButton: false,
          });
          this.cd.detectChanges();
        },
        error: (err) => {
          this.saving = false;
          void Swal.fire({
            icon: 'error',
            title: `Error ${err.status ?? ''}`,
            text: err.error?.detail || 'No se pudieron guardar los permisos.',
            background: '#0f172a',
            color: '#f8fafc',
            confirmButtonColor: '#ef4444',
          });
          this.cd.detectChanges();
        },
      });
  }

  // ── Create / Edit Role Modal ───────────────────────────────────────
  openCreateModal(): void {
    this.isCreating = true;
    this.modalName = '';
    this.modalStatus = 1;
    this.showModal = true;
  }

  openEditModal(rol: RoleItem, event: Event): void {
    event.stopPropagation();
    if (rol.id === 1) return; // Superadmin inmutable
    this.isCreating = false;
    this.modalName = rol.name;
    this.modalStatus = rol.status;
    this.selectedRole = rol;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveRole(): void {
    if (!this.modalName.trim()) {
      void Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre del rol es obligatorio.',
        background: '#0f172a',
        color: '#f8fafc',
      });
      return;
    }

    const request$ = this.isCreating
      ? this.rolesSvc.createRole(this.modalName.trim(), this.modalStatus)
      : this.rolesSvc.updateRole(
          this.selectedRole!.id,
          this.modalName.trim(),
          this.modalStatus
        );

    void Swal.fire({
      title: 'Guardando...',
      allowOutsideClick: false,
      background: '#0f172a',
      color: '#f8fafc',
      didOpen: () => Swal.showLoading(),
    });

    request$.subscribe({
      next: () => {
        void Swal.fire({
          icon: 'success',
          title: this.isCreating ? 'Rol creado' : 'Rol actualizado',
          timer: 1500,
          showConfirmButton: false,
          background: '#0f172a',
          color: '#f8fafc',
        });
        this.closeModal();
        this.loadRoles();
      },
      error: (err) => {
        void Swal.fire({
          icon: 'error',
          title: `Error ${err.status ?? ''}`,
          text: err.error?.detail || 'No se pudo guardar el rol.',
          background: '#0f172a',
          color: '#f8fafc',
          confirmButtonColor: '#ef4444',
        });
      },
    });
  }

  // ── Delete Role ────────────────────────────────────────────────────
  deleteRole(rol: RoleItem, event: Event): void {
    event.stopPropagation();
    if (rol.id === 1 || rol.id === 2) {
      void Swal.fire({
        icon: 'error',
        title: 'Acción bloqueada',
        text: 'Este rol del sistema no puede ser eliminado.',
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonColor: '#ef4444',
      });
      return;
    }
    void Swal.fire({
      title: '¿Eliminar rol?',
      text: `¿Estás seguro de eliminar el rol "${rol.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#1d253b',
      background: '#0f172a',
      color: '#f8fafc',
    }).then((result) => {
      if (result.isConfirmed) {
        this.rolesSvc.deleteRole(rol.id).subscribe({
          next: () => {
            if (this.selectedRole?.id === rol.id) {
              this.selectedRole = null;
              this.permissions = [];
            }
            void Swal.fire({
              icon: 'success',
              title: 'Rol eliminado',
              timer: 1400,
              showConfirmButton: false,
              background: '#0f172a',
              color: '#f8fafc',
            });
            this.loadRoles();
          },
          error: (err) => {
            void Swal.fire({
              icon: 'error',
              title: 'Error',
              text: err.error?.detail || 'No se pudo eliminar el rol.',
              background: '#0f172a',
              color: '#f8fafc',
              confirmButtonColor: '#ef4444',
            });
          },
        });
      }
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────
  trackByModuleId(_: number, p: PermissionItem): number {
    return p.module_id;
  }

  trackByRoleId(_: number, r: RoleItem): number {
    return r.id;
  }

  get activePermissionsCount(): number {
    return this.permissions.filter(
      (p) => p.can_view || p.can_create || p.can_edit || p.can_delete
    ).length;
  }
}
