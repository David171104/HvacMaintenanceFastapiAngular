import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LecturasComponent } from '../lecturas/lecturas.component';
import { Statistics } from '../statistics/statistics';
import { UserList } from '../user-list/user-list';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    LecturasComponent,
    Statistics,
    UserList,
    FormsModule
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class Reports {}





