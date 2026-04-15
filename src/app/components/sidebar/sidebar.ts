import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import Swal from 'sweetalert2';

import { PermissionService } from '../../shared/permissions/permission.service';
import { ServicesStateService } from '../../shared/services-state/services-state.service';

interface NavItem {
  route: string;
  label: string;
  icon: string;
  roles: string[];
  module?: string;
}

export interface MaintenanceNotification {
  id: number;
  service_report_id: number;
  client_id: number;
  client_email: string;
  client_name: string;
  technician_id: number;
  technician_email: string;
  tech_name: string;
  sent_at: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, DragDropModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isCollapsed = false;
  @Input() mobileOpen = false;
  @Output() readonly collapsedChange = new EventEmitter<boolean>();
  @Output() readonly closeRequested = new EventEmitter<void>();

  userRole = '';
  userName = '';
  userLastName = '';
  userId = 0;
  navItems: NavItem[] = [];
  brandRoute = '/home';

  notifications: MaintenanceNotification[] = [];
  showNotifications = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  private readonly allNavItems: NavItem[] = [
    { route: '/home', label: 'Resumen', icon: 'RS', roles: ['administrador'] },
    { route: '/users', label: 'Usuarios', icon: 'US', roles: ['administrador'], module: 'Usuarios' },
    { route: '/services', label: 'Servicios', icon: 'SV', roles: ['administrador'], module: 'Servicios' },
    { route: '/reports', label: 'Reportes', icon: 'RP', roles: ['administrador'], module: 'Reportes' },
    { route: '/analitica', label: 'Analitica avanzada', icon: 'BI', roles: ['administrador'], module: 'Analitica avanzada' },
    { route: '/lecturas', label: 'Lecturas IoT', icon: 'IO', roles: ['administrador', 'tecnico'], module: 'Lecturas IoT' },
    { route: '/maintenance-control', label: 'Control Mantenimiento', icon: 'CM', roles: ['administrador'], module: 'Control Mantenimiento' },
    { route: '/roles', label: 'Roles y Permisos', icon: 'RB', roles: ['administrador'], module: 'Roles y Permisos' },
    { route: '/tecnic-home', label: 'Resumen', icon: 'RS', roles: ['tecnico'] },
    { route: '/techniccian-services', label: 'Servicios', icon: 'SV', roles: ['tecnico'], module: 'Servicios' },
    { route: '/technician-reports', label: 'Reportes', icon: 'RP', roles: ['tecnico'], module: 'Reportes' },
    { route: '/profile', label: 'Mi Perfil', icon: 'PR', roles: ['tecnico'] },
    { route: '/client-home', label: 'Resumen', icon: 'RS', roles: ['cliente'] },
    { route: '/client-services', label: 'Mis servicios', icon: 'MS', roles: ['cliente'], module: 'Servicios' },
    { route: '/profile', label: 'Mi Perfil', icon: 'PR', roles: ['cliente'] },
    { route: '/client-reports', label: 'Reportes', icon: 'RP', roles: ['cliente'], module: 'Reportes' },
  ];

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    private readonly permissionService: PermissionService,
    private readonly servicesState: ServicesStateService,
  ) {}

  get unreadCount(): number {
    return this.notifications.length;
  }

  get brandLabel(): string {
    if (this.userRole === 'cliente') return 'Portal Cliente';
    if (this.userRole === 'tecnico') return 'ClimaTech';
    return 'ClimaTech Admin';
  }

  get brandSubLabel(): string {
    if (this.userRole === 'cliente') return 'Servicios';
    if (this.userRole === 'tecnico') return 'Panel tecnico';
    return 'Centro operativo';
  }

  get environmentLabel(): string {
    if (this.userRole === 'cliente') return 'Panel de Usuario';
    if (this.userRole === 'tecnico') return 'Panel de Tecnico';
    return 'Entorno Administrativo';
  }

  ngOnInit(): void {
    this.userRole = localStorage.getItem('userRole') || '';
    this.userName = localStorage.getItem('userName') || 'Usuario';
    this.userLastName = localStorage.getItem('userLastName') || '';

    const userRaw = localStorage.getItem('user');
    if (userRaw) {
      try {
        const userObj = JSON.parse(userRaw);
        this.userId = userObj.id || 0;
      } catch {
        this.userId = 0;
      }
    }

    this.navItems = this.allNavItems.filter((item) => item.roles.includes(this.userRole));
    this.brandRoute =
      this.userRole === 'cliente' ? '/client-home' :
      this.userRole === 'tecnico' ? '/tecnic-home' :
      '/home';

    this.loadNotifications();
    this.pollInterval = setInterval(() => this.loadNotifications(), 120_000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  hasPermission(
    moduleName: string,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete' = 'can_view',
  ): boolean {
    return this.permissionService.hasPermission(moduleName, action);
  }

  canRenderItem(item: NavItem): boolean {
    return item.module ? this.hasPermission(item.module, 'can_view') : true;
  }

  loadNotifications(): void {
    const url =
      this.userRole === 'administrador'
        ? 'http://localhost:8000/notifications/maintenance/admin/all'
        : `http://localhost:8000/notifications/maintenance/${this.userId}`;

    this.http.get<MaintenanceNotification[]>(url).subscribe({
      next: (data) => (this.notifications = data),
      error: (err) => console.error('[Notificaciones] Error:', err),
    });
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getNotificationMessage(n: MaintenanceNotification): string {
    if (this.userRole === 'tecnico') {
      return `El cliente ${n.client_name} requiere mantenimiento en su equipo.`;
    }
    if (this.userRole === 'cliente') {
      return `Tu equipo requiere mantenimiento. Tecnico asignado: ${n.tech_name}.`;
    }
    return `${n.client_name} requiere mantenimiento. Tecnico: ${n.tech_name}.`;
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
    this.permissionService.clearPermissions();
    this.servicesState.clearState();
    this.closeRequested.emit();
    this.router.navigate(['/login']);
  }

  confirmarLogout(): void {
    void Swal.fire({
      title: 'Cerrar sesion?',
      text: 'Tendras que volver a ingresar tus credenciales.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonText: 'Si, salir',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'ds-glass',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.logout();
      }
    });
  }

  getUserInitials(): string {
    const first = this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
    const last = this.userLastName ? this.userLastName.charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  }
}
