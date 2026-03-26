import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../../components/sidebar/sidebar';

interface User {
  id: number;
  name: string;
  last_name: string;
  email: string;
  role_id: number;
  document_number?: string;
  age?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './users.html',
  styleUrls: ['./users.css'],
  
})
export class Users implements OnInit {

  usuarios: User[] = [];
  loading = true;
  error = '';

  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.getUsers();
  }

  getUsers() {

    this.loading = true;

    this.http.get<any>('http://localhost:8000/users/get_users/')
      .subscribe({
        next: (response) => {

          console.log('Respuesta API:', response);

          // 🔥 nueva referencia (IMPORTANTE)
          this.usuarios = [...(response.resultado ?? [])];

          this.loading = false;

          // 🔥 fuerza render estable
          this.cd.detectChanges();
        },

        error: (error) => {
          console.error('Error obteniendo usuarios:', error);

          this.error = 'Error cargando usuarios';
          this.usuarios = [];
          this.loading = false;

          this.cd.detectChanges();
        }
      });
  }

  getRole(roleId: number): string {
    switch (roleId) {
      case 1: return 'Admin';
      case 2: return 'Tecnico';
      case 3: return 'Cliente';
      default: return 'Desconocido';
    }
  }

  getRoleClass(roleId: number): string {
    switch (roleId) {
      case 2: return 'users-role users-role-tech';
      case 3: return 'users-role users-role-client';
      default: return 'users-role';
    }
  }

  trackById(index: number, user: User) {
    return user.id;
  }
}
