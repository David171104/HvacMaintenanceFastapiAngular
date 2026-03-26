import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit {

  userName = '';
  userLastName = '';
  userRole = '';

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') || '';
    this.userLastName = localStorage.getItem('userLastName') || '';
    this.userRole = localStorage.getItem('userRole') || '';
  }
}