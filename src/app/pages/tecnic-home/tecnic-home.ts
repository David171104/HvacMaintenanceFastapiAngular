import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tecnic-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  templateUrl: './tecnic-home.html',
  styleUrls: ['./tecnic-home.css'],
})
export class TecnicHome implements OnInit {

  userName = '';
  userLastName = '';
  userRole = '';

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') || '';
    this.userLastName = localStorage.getItem('userLastName') || '';
    this.userRole = localStorage.getItem('userRole') || '';
  }
}