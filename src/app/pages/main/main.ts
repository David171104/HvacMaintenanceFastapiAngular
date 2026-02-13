import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [Navbar, Footer, FormsModule, RouterModule],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {

  constructor(private router: Router) {}
  goToRegister() {
    this.router.navigate(['/register']);
  }
}
