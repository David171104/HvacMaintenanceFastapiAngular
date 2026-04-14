import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
}

@Component({
  selector: 'ui-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
})
export class TabsComponent {
  @Input() items: TabItem[] = [];
  @Input() activeId = '';
  @Output() readonly activeIdChange = new EventEmitter<string>();
}
