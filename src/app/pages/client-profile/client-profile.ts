import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-profile.html',
  styleUrls: ['./client-profile.css']
})
export class ClientProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  perfilForm!: FormGroup;
  isSaving = false;
  userId: number = 0;

  ngOnInit(): void {
    this.perfilForm = this.fb.group({
      name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      phone: [''],
      address: ['']
    });

    this.cargarDatosUsuario();
  }

  cargarDatosUsuario(): void {
    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const userObj = JSON.parse(userRaw);
        this.userId = userObj.id || 0;
        
        this.perfilForm.patchValue({
          name: userObj.name || '',
          last_name: userObj.last_name || '',
          email: userObj.email || '',
          phone: userObj.phone || '', // Assuming phone exists or will be added
          address: userObj.address || '' // Assuming address exists
        });
      } catch (e) {
        console.error('Error parseando user de localStorage', e);
      }
    }
  }

  guardarCambios(): void {
    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    if (this.isSaving) return;

    this.isSaving = true;
    const formData = this.perfilForm.getRawValue(); // gets disabled fields too if needed, but payload builder is below

    const payload = {
      name: formData.name,
      last_name: formData.last_name,
      phone: formData.phone,
      address: formData.address
    };

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    // Simulando request al endpoint de actualización
    const updateUrl = `http://localhost:8000/users/${this.userId}`; // Adjust per standard REST

    this.http.patch(updateUrl, payload, { headers }).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        
        // Actualizar localStorage
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const userObj = JSON.parse(userRaw);
          const updatedUser = { ...userObj, ...payload };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          localStorage.setItem('userName', updatedUser.name);
          localStorage.setItem('userLastName', updatedUser.last_name);
        }

        Swal.fire({
          icon: 'success',
          title: 'Perfil actualizado',
          text: 'Tu información personal ha sido modificada con éxito.',
          background: '#0a0f1c',
          color: '#e2e8f0',
          confirmButtonColor: '#0ef0d1'
        });
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error actualizando perfil', err);
        Swal.fire({
          icon: 'error',
          title: 'Error de actualización',
          text: err.error?.detail || 'No se pudo actualizar tu información. Intenta de nuevo.',
          background: '#0a0f1c',
          color: '#e2e8f0',
          confirmButtonColor: '#ef4444'
        });
      }
    });
  }
}
