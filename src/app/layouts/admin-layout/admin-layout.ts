import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayoutComponent {
  isSidebarCollapsed = false;
  isMobileSidebarOpen = false;

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 960) {
      this.isMobileSidebarOpen = false;
    }
  }

  onSidebarCollapsedChange(isCollapsed: boolean): void {
    this.isSidebarCollapsed = isCollapsed;
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }
}
