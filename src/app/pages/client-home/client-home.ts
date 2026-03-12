import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-client-home',
  imports: [RouterModule],
  templateUrl: './client-home.html',
  styleUrls: ['./client-home.css'],
})
export class ClientHome {

  constructor(private router: Router) {}

  logout() {
    localStorage.removeItem('isAdmin');
    this.router.navigate(['/login']);
  }

}