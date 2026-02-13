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
    console.log("Login:", this.loginData);
    alert("Login demo 🚀");
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
