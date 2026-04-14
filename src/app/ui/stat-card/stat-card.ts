import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.css',
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() meta = '';
  @Input() accent: 'primary' | 'success' | 'error' = 'primary';
}
