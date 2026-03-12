import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.html',
  styleUrls: ['./statistics.css']
})
export class Statistics {

  stats = {
    temperaturaPromedio: 29.5,
    humedadPromedio: 65.2,
    consumoPromedio: 4.3,
    totalLecturas: 135
  };

}
