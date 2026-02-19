import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {

  loginData = {
    email: '',
    password: ''
  };

  constructor(private router: Router) {}

  onSubmit() {
    const fixedEmail = 'admin@demo.com';
    const fixedPassword = '123456';

    if (
      this.loginData.email === fixedEmail &&
      this.loginData.password === fixedPassword
    ) {
      alert('Login exitoso 🚀');
      this.router.navigate(['/home']); // o la ruta que tengas
    } else {
      alert('Correo o contraseña incorrectos ❌');
    }
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
