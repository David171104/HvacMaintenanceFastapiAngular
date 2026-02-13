import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {

  user = {
    name: '',
    last_name: '',
    document_number: '',
    age: '',
    email: '',
    password: '',
    role_id: 3
  };

  constructor(private router: Router) {}

  onSubmit() {
    console.log("Usuario:", this.user);

    alert("Registro demo exitoso 🚀");

    // Después del registro, redirigir a login
    this.router.navigate(['/login']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
