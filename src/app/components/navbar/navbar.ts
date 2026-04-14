import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { ButtonComponent } from '../../ui/button/button';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, ButtonComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  constructor(private readonly router: Router) {}

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
