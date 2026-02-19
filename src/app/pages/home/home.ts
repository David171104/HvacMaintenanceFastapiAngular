import { Component } from '@angular/core';
import { Router, RouterModule  } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrl: './home.css',
  imports: [RouterModule]
})
export class HomeComponent {

  constructor(private router: Router) {}

  logout() {
    localStorage.removeItem('isAdmin');
    this.router.navigate(['/login']);
  }
}
