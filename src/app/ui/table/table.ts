import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface TableColumn {
  key: string;
  label: string;
}

@Component({
  selector: 'ui-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class TableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() rows: Record<string, string | number | null | undefined>[] = [];
  @Input() emptyMessage = 'No hay datos disponibles.';
}
