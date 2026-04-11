import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  templateUrl: './client-layout.html',
  styleUrl: './client-layout.css',
})
export class ClientLayoutComponent {
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
