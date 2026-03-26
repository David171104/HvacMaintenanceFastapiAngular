import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar';
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
  imports: [CommonModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
  
})
export class Users implements OnInit {

  usuarios: User[] = [];
  loading = true;
  error = '';

  showModal = false;
  isCreating = false;

  roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Tecnico' },
    { id: 3, name: 'Cliente' }
  ];

  selectedUser: User = this.emptyUser();

  api = 'http://localhost:8000/users';

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef
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
      password: ''
    };
  }

  /* ================= CREATE ================= */

  openCreateModal() {
    this.isCreating = true;
    this.selectedUser = this.emptyUser();
    this.showModal = true;
  }

  /* ================= EDIT ================= */

  openEditModal(user: User) {
    this.isCreating = false;
    this.selectedUser = { ...user };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  /* ================= SAVE ================= */

  saveChanges() {

    if (!this.selectedUser.name || !this.selectedUser.email) {
      Swal.fire('Campos requeridos', 'Nombre y correo obligatorios', 'warning');
      return;
    }

    const request = this.isCreating
      ? this.http.post(`${this.api}/admin-create_user`, this.selectedUser)
      : this.http.put(`${this.api}/update_user/${this.selectedUser.id}`, this.selectedUser);

    Swal.fire({
      title: 'Guardando...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    request.subscribe({
      next: () => {

        Swal.fire({
          icon: 'success',
          title: this.isCreating ? 'Usuario creado' : 'Usuario actualizado',
          timer: 1500,
          showConfirmButton: false
        });

        this.closeModal();
        this.getUsers();
      },
      error: () => {
        Swal.fire('Error', 'No se pudo guardar', 'error');
      }
    });
  }

  /* ================= DELETE ================= */

  deleteUser(user: User) {

    Swal.fire({
      title: '¿Eliminar usuario?',
      text: `¿Seguro que deseas eliminar a ${user.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      confirmButtonColor: '#ef4444'
    }).then(result => {

      if (result.isConfirmed) {

        this.http.delete(`${this.api}/delete/${user.id}`)
          .subscribe(() => {

            Swal.fire('Eliminado', 'Usuario eliminado', 'success');
            this.getUsers();
          });
      }
    });
  }

  /* ================= GET USERS ================= */

  getUsers() {

    this.loading = true;

    this.http.get<any>(`${this.api}/get_users/`)
      .subscribe({
        next: (response) => {
          this.usuarios = [...(response.resultado ?? [])];
          this.loading = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.error = 'Error cargando usuarios';
          this.loading = false;
        }
      });
  }

  getRole(roleId: number): string {
    return this.roles.find(r => r.id === roleId)?.name ?? 'Desconocido';
  }

  getRoleClass(roleId: number): string {
    if (roleId === 1) return 'users-role users-role-admin';
    if (roleId === 2) return 'users-role users-role-tech';
    return 'users-role users-role-client';
  }
}