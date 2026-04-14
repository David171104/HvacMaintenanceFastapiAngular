import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-badge',
  standalone: true,
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class BadgeComponent {
  @Input() tone: 'default' | 'primary' | 'success' | 'error' = 'default';
}
