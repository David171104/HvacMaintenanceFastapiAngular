import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-section-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './section-header.html',
  styleUrl: './section-header.css',
})
export class SectionHeaderComponent {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
}
