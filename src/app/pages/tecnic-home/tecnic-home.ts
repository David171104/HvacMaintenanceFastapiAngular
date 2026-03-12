import { Component } from '@angular/core';
import { Router, RouterModule  } from '@angular/router';

@Component({
  selector: 'app-tecnic-home',
  imports: [],
  templateUrl: './tecnic-home.html',
  styleUrl: './tecnic-home.css',
})
export class TecnicHome {
  constructor(private router: Router) {}

  logout() {
    localStorage.removeItem('isAdmin');
    this.router.navigate(['/login']);
  }
}
