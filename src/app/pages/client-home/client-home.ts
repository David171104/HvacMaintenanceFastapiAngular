import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-client-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-home.html',
  styleUrls: ['./client-home.css'],
})
export class ClientHome implements OnInit {
  userName = '';
  userLastName = '';
  userRole = '';

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') || '';
    this.userLastName = localStorage.getItem('userLastName') || '';
    this.userRole = localStorage.getItem('userRole') || '';
  }
}
