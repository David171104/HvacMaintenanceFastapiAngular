import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

interface User {
  id?: number;
  name: string;
  last_name: string;
  email: string;
  role_id: number;
  document_number?: string;
  age?: string;
  password?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
})
export class Users implements OnInit {
  usuarios: User[] = [];
  loading = true;
  error = '';

  showModal = false;
  isCreating = false;
  fieldErrors: Partial<Record<keyof User, string>> = {};

  roles = [
    { id: 1, name: 'Administrador' },
    { id: 2, name: 'Tecnico' },
    { id: 3, name: 'Cliente' },
  ];

  selectedUser: User = this.emptyUser();
  api = 'http://localhost:8000/users';

  constructor(
    private readonly http: HttpClient,
    private readonly cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.getUsers();
  }

  emptyUser(): User {
    return {
      name: '',
      last_name: '',
      email: '',
      role_id: 3,
      document_number: '',
      age: '',
      password: '',
    };
  }

  openCreateModal(): void {
    this.isCreating = true;
    this.selectedUser = this.emptyUser();
    this.fieldErrors = {};
    this.showModal = true;
  }

  openEditModal(user: User): void {
    this.isCreating = false;
    this.selectedUser = { ...user };
    this.fieldErrors = {};
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.fieldErrors = {};
  }

  async saveChanges(): Promise<void> {
    if (!this.validateUserForm()) {
      Swal.fire('Campos requeridos', 'Corrige los campos marcados antes de continuar.', 'warning');
      return;
    }

    const payload = this.buildPayload();

    if (this.isCreating) {
      const result = await Swal.fire({
        title: '¿Crear cuenta?',
        text: `Se creará la cuenta para ${payload.name} ${payload.last_name}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, crear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#0ef0d1',
        background: '#0f172a',
        color: '#f8fafc',
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    const request = this.isCreating
      ? this.http.post(`${this.api}/admin-create_user`, payload)
      : this.http.put(`${this.api}/update_user/${this.selectedUser.id}`, payload);

    Swal.fire({
      title: 'Guardando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    request.subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: this.isCreating ? 'Usuario creado' : 'Usuario actualizado',
          timer: 1500,
          showConfirmButton: false,
        });

        this.closeModal();
        this.getUsers();
      },
      error: (err) => {
        console.error('Error completo:', err);

        let mensaje = 'No se pudo guardar el usuario';

        if (err.error?.detail) {
          if (Array.isArray(err.error.detail)) {
            mensaje = err.error.detail.map((e: any) => e.msg || e).join('\n');
          } else {
            mensaje = err.error.detail;
          }
        } else if (err.status === 422) {
          const errors = err.error?.errors;
          if (errors && Array.isArray(errors)) {
            mensaje = errors.map((e: any) => e.msg).join('\n');
          }
        } else if (err.status === 500) {
          mensaje = err.error?.detail || 'Error interno del servidor';
        }

        void Swal.fire({
          icon: 'error',
          title: `Error ${err.status}`,
          text: mensaje,
          background: '#0f172a',
          color: '#f8fafc',
          confirmButtonColor: '#ef4444',
        });
      }
    });
  }

  deleteUser(user: User): void {
    Swal.fire({
      title: '¿Eliminar usuario?',
      text: `¿Seguro que deseas eliminar a ${user.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      confirmButtonColor: '#ef4444',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`${this.api}/delete/${user.id}`).subscribe(() => {
          Swal.fire('Eliminado', 'Usuario eliminado', 'success');
          this.getUsers();
        });
      }
    });
  }

  getUsers(): void {
    this.loading = true;

    this.http.get<any>(`${this.api}/get_users/`).subscribe({
      next: (response) => {
        this.usuarios = [...(response.resultado ?? [])];
        this.loading = false;
        this.cd.detectChanges();
      },
      error: () => {
        this.error = 'Error cargando usuarios';
        this.loading = false;
      },
    });
  }

  getRole(roleId: number): string {
    return this.roles.find((r) => r.id === roleId)?.name ?? 'Desconocido';
  }

  getRoleClass(roleId: number): string {
    if (roleId === 1) return 'users-role users-role-admin';
    if (roleId === 2) return 'users-role users-role-tech';
    return 'users-role users-role-client';
  }

  validateField(field: keyof User): void {
    const errors = this.computeFieldErrors();
    this.fieldErrors[field] = errors[field];
  }

  private validateUserForm(): boolean {
    this.fieldErrors = this.computeFieldErrors();
    return Object.values(this.fieldErrors).every((value) => !value);
  }

  private computeFieldErrors(): Partial<Record<keyof User, string>> {
    const errors: Partial<Record<keyof User, string>> = {};
    const name = this.selectedUser.name?.trim() || '';
    const lastName = this.selectedUser.last_name?.trim() || '';
    const email = this.selectedUser.email?.trim() || '';
    const documentNumber = this.selectedUser.document_number?.trim() || '';
    const age = String(this.selectedUser.age ?? '').trim();
    const password = this.selectedUser.password?.trim() || '';

    if (!name) {
      errors.name = 'El nombre es obligatorio.';
    } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*$/.test(name)) {
      errors.name = 'El nombre solo debe contener letras y espacios.';
    }

    if (!lastName) {
      errors.last_name = 'El apellido es obligatorio.';
    } else if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+)*$/.test(lastName)) {
      errors.last_name = 'El apellido solo debe contener letras y espacios.';
    }

    if (!email) {
      errors.email = 'El correo es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Ingresa un correo valido.';
    }

    if (!documentNumber) {
      errors.document_number = 'El documento es obligatorio.';
    } else if (!/^\d+$/.test(documentNumber)) {
      errors.document_number = 'El documento solo debe contener digitos.';
    }

    if (!age) {
      errors.age = 'La edad es obligatoria.';
    } else {
      const ageNumber = Number(age);
      if (!Number.isInteger(ageNumber) || ageNumber < 18 || ageNumber > 100) {
        errors.age = 'La edad debe estar entre 18 y 100 anos.';
      }
    }

    if (!this.selectedUser.role_id) {
      errors.role_id = 'Debes asignar un rol al usuario.';
    }

    if (this.isCreating) {
      if (!password) {
        errors.password = 'La contrasena es obligatoria.';
      } else if (password.length < 8) {
        errors.password = 'La contrasena debe tener al menos 8 caracteres.';
      } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[ !"#$%&'()*+,./:;<=>?@[\\\]^_`{|}~-]/.test(password)) {
        errors.password = 'Debe incluir mayuscula, minuscula, numero y caracter especial.';
      }
    }

    return errors;
  }

  private buildPayload(): User {
    const payload: User = {
      ...this.selectedUser,
      name: this.selectedUser.name.trim(),
      last_name: this.selectedUser.last_name.trim(),
      email: this.selectedUser.email.trim(),
      document_number: this.selectedUser.document_number?.trim() || '',
      age: String(this.selectedUser.age ?? '').trim(),
    };

    if (this.isCreating) {
      payload.password = this.selectedUser.password?.trim() || '';
    } else {
      delete payload.password;
    }

    return payload;
  }
}
