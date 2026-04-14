import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';
import { ServicesStateService } from '../../shared/services-state/services-state.service';

interface NavItem {
  route: string;
  label: string;
  icon: string;
  roles: string[];
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

  // ── Notificaciones ────────────────────────────────────────────────────────
  notifications: MaintenanceNotification[] = [];
  showNotifications = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

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
    if (this.userRole === 'tecnico') return 'Panel técnico';
    return 'Centro operativo';
  }

  get environmentLabel(): string {
    if (this.userRole === 'cliente') return 'Panel de usuario';
    if (this.userRole === 'tecnico') return 'Panel de técnico';
    return 'Entorno administrativo';
  }

  private readonly allNavItems: NavItem[] = [
    { route: '/home',                label: 'Resumen',          icon: 'RS', roles: ['administrador'] },
    { route: '/users',               label: 'Usuarios',         icon: 'US', roles: ['administrador'] },
    { route: '/services',            label: 'Servicios',        icon: 'SV', roles: ['administrador'] },
    { route: '/reports',             label: 'Reportes',         icon: 'RP', roles: ['administrador'] },
    { route: '/analitica',           label: 'Analítica avanzada', icon: 'BI', roles: ['administrador'] },
    { route: '/lecturas',            label: 'Lecturas IoT',     icon: 'IO', roles: ['administrador', 'tecnico'] },
    { route: '/maintenance-control', label: 'Control Mantenimiento', icon: 'CM', roles: ['administrador'] },
    { route: '/tecnic-home',         label: 'Resumen',          icon: 'RS', roles: ['tecnico'] },
    { route: '/techniccian-services',label: 'Servicios',        icon: 'SV', roles: ['tecnico'] },
    { route: '/client-home',         label: 'Resumen',          icon: 'RS', roles: ['cliente'] },
    { route: '/client-services',     label: 'Mis servicios',    icon: 'MS', roles: ['cliente'] },
    { route: '/profile',             label: 'Mi Perfil',        icon: 'PR', roles: ['cliente'] },
  ];

  constructor(
    
    private readonly router: Router,
    private readonly http: HttpClient,
  
    private readonly servicesState: ServicesStateService,
  ) {}

  ngOnInit(): void {
    this.userRole     = localStorage.getItem('userRole')     || '';
    this.userName     = localStorage.getItem('userName')     || 'Usuario';
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

    this.navItems   = this.allNavItems.filter(item => item.roles.includes(this.userRole));
    this.brandRoute =
      this.userRole === 'cliente' ? '/client-home' :
      this.userRole === 'tecnico' ? '/tecnic-home' : '/home';

    this.loadNotifications();
    // Refresca cada 2 minutos (sincronizado con el scheduler)
    this.pollInterval = setInterval(() => this.loadNotifications(), 120_000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  loadNotifications(): void {
    // console.log("userId:", this.userId, "userRole:", this.userRole);
    const url = this.userRole === 'administrador'
      ? 'http://localhost:8000/notifications/maintenance/admin/all'
      : `http://localhost:8000/notifications/maintenance/${this.userId}`;

    this.http.get<MaintenanceNotification[]>(url).subscribe({
      next: data => (this.notifications = data),
      error: err  => console.error('[Notificaciones] Error:', err),
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
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  getNotificationMessage(n: MaintenanceNotification): string {
    if (this.userRole === 'tecnico') {
      return `El cliente ${n.client_name} requiere mantenimiento en su equipo.`;
    }
    if (this.userRole === 'cliente') {
      return `Tu equipo requiere mantenimiento. Técnico asignado: ${n.tech_name}.`;
    }
    // admin
    return `${n.client_name} requiere mantenimiento. Técnico: ${n.tech_name}.`;
  }

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsedChange.emit(this.isCollapsed);
  }

  handleNavigate(): void {
    if (window.innerWidth <= 960) this.closeRequested.emit();
  }

  logout(): void {
    // a) Limpiar todas las claves de sesión del localStorage
    localStorage.clear();

    // b) Resetear el estado reactivo para evitar fuga de datos entre sesiones
    this.servicesState.clearState();

    // c) Cerrar el sidebar móvil si está abierto y redirigir al login
    this.closeRequested.emit();
    this.router.navigate(['/login']);
  }

  confirmarLogout(): void {
    void Swal.fire({
      title: '¿Cerrar Sesión?',
      text: 'Tendrás que volver a ingresar tus credenciales.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#334155',
      background: '#0f172a',
      color: '#f8fafc',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'ds-glass',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userLastName');
        this.servicesState.clearState();
        this.closeRequested.emit();
        this.router.navigate(['/login']);
      }
    });
  }

  getUserInitials(): string {
    const first = this.userName     ? this.userName.charAt(0).toUpperCase()     : 'U';
    const last  = this.userLastName ? this.userLastName.charAt(0).toUpperCase() : '';
    return `${first}${last}`;
  }
}