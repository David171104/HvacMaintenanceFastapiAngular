import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.css']
})
export class UserList {

  usuarios: User[] = [
    { id: 1, nombre: 'David', email: 'david@email.com', rol: 'Admin' },
    { id: 2, nombre: 'Bryan', email: 'bryan@email.com', rol: 'Técnico' },
    { id: 3, nombre: 'Jonathan', email: 'jon@email.com', rol: 'Supervisor' }
  ];

}
