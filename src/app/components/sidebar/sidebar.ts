import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  route: string;
  label: string;
  icon: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit {
  @Input() isCollapsed = false;
  @Input() mobileOpen = false;
  @Output() readonly collapsedChange = new EventEmitter<boolean>();
  @Output() readonly closeRequested = new EventEmitter<void>();

  userRole = '';
  userName = '';
  userLastName = '';
  navItems: NavItem[] = [];

  private readonly allNavItems: NavItem[] = [
    { route: '/home', label: 'Resumen', icon: 'RS', roles: ['administrador'] },
    { route: '/users', label: 'Usuarios', icon: 'US', roles: ['administrador'] },
    { route: '/services', label: 'Servicios', icon: 'SV', roles: ['administrador'] },
    { route: '/reports', label: 'Reportes', icon: 'RP', roles: ['administrador'] },
    { route: '/analitica', label: 'Analítica avanzada', icon: 'BI', roles: ['administrador'] },
    { route: '/lecturas', label: 'Lecturas IoT', icon: 'IO', roles: ['administrador', 'tecnico'] },
    { route: '/tecnic-home', label: 'Resumen', icon: 'RS', roles: ['tecnico'] },
    { route: '/techniccian-services', label: 'Servicios', icon: 'SV', roles: ['tecnico'] },
    { route: '/client-home', label: 'Resumen', icon: 'RS', roles: ['cliente'] },
    { route: '/client-services', label: 'Mis servicios', icon: 'MS', roles: ['cliente'] },
  ];

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.userRole = localStorage.getItem('userRole') || '';
    this.userName = localStorage.getItem('userName') || 'Administrador';
    this.userLastName = localStorage.getItem('userLastName') || '';
    this.navItems = this.allNavItems.filter((item) => item.roles.includes(this.userRole));
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  handleNavigate(): void {
    if (window.innerWidth <= 960) {
      this.closeRequested.emit();
    }
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userLastName');
    this.closeRequested.emit();
    this.router.navigate(['/login']);
  }

  getUserInitials(): string {
    const first = this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
    const last = this.userLastName ? this.userLastName.charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  }
}
