import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  styleUrls: ['./sidebar.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  isCollapsed = false;

  userRole = '';
  userName = '';
  userLastName = '';

  navItems: NavItem[] = [];

  allNavItems: NavItem[] = [
    {
      route: '/home',
      label: 'Inicio',
      icon: '🏠',
      roles: ['administrador']
    },
    {
      route: '/tecnic-home',
      label: 'Inicio',
      icon: '🏠',
      roles: ['tecnico']
    },
    {
      route: '/client-home',
      label: 'Inicio',
      icon: '🏠',
      roles: ['cliente']
    },
    {
      route: '/users',
      label: 'Usuarios',
      icon: '👥',
      roles: ['administrador']
    },
    {
      route: '/services',
      label: 'Servicios',
      icon: '🛠️',
      roles: ['administrador']
    },
    {
      route: '/techniccian-services',
      label: 'Servicios',
      icon: '🛠️',
      roles: ['tecnico']
    },
    {
      route: '/client-services',
      label: 'Mis Servicios',
      icon: '📋',
      roles: ['cliente']
    },
    {
      route: '/reports',
      label: 'Reportes',
      icon: '📊',
      roles: ['administrador']
    },
    {
      route: '/lecturas',
      label: 'Lecturas IoT',
      icon: '📡',
      roles: ['administrador', 'tecnico']
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.filterNavByRole();

    if (this.isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('sidebar-collapsed');
  }

  loadUserInfo(): void {
    this.userRole = localStorage.getItem('userRole') || '';
    this.userName = localStorage.getItem('userName') || '';
    this.userLastName = localStorage.getItem('userLastName') || '';
  }

  filterNavByRole(): void {
    this.navItems = this.allNavItems.filter(item =>
      item.roles.includes(this.userRole)
    );
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;

    if (this.isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userLastName');

    document.body.classList.remove('sidebar-collapsed');
    this.router.navigate(['/login']);
  }

  getUserInitials(): string {
    const first = this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
    const last = this.userLastName ? this.userLastName.charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  }
}