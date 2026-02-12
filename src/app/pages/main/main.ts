import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';


@Component({
  selector: 'app-main',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {}
