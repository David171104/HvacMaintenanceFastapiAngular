import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { Main } from './pages/main/main';
import { Contact } from './pages/contact/contact';
import { Notfound } from './pages/notfound/notfound';
import { RegisterComponent } from './pages/register/register';
import { Users } from './pages/users/users';
import { Services } from './pages/services/services';
import { LoginComponent } from './pages/login/login';
import { Reports } from './pages/reports/reports';
import { HomeComponent } from './pages/home/home';
import { LecturasComponent } from './pages/lecturas/lecturas.component';
import { AnaliticaComponent } from './pages/analitica/analitica';
import { ClientHome } from './pages/client-home/client-home';
import { TecnicHome } from './pages/tecnic-home/tecnic-home';
import { ClientServices } from './pages/client-services/client-services';
import { ClientProfileComponent } from './pages/client-profile/client-profile';
import { TechniccianServices } from './pages/techniccian-services/techniccian-services';
import { TechnicianReports } from './pages/technician-reports/technician-reports';
import { ClientReports } from './pages/client-reports/client-reports';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout';
import { ClientLayoutComponent } from './layouts/client-layout/client-layout';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout';
import { MaintenanceControlComponent } from './pages/maintenance-control/maintenance-control';
import { RolesComponent } from './pages/roles/roles';
import { routePermissionGuard } from './shared/permissions/route-permission.guard';
import { sessionAuthGuard } from './shared/permissions/session-auth.guard';


export const routes: Routes = [
    // ── Rutas Públicas ────────────────────────────────
    {
      path: '',
      component: PublicLayoutComponent,
      children: [
        { path: '', component: Main, pathMatch: 'full' },
        { path: 'contact', component: Contact },
      ],
    },
    { path: 'register', component: RegisterComponent },
    { path: 'login', component: LoginComponent },

    // ── Rutas de Administrador ────────────────────────
    {
      path: '',
      component: AdminLayoutComponent,
      canActivate: [sessionAuthGuard],
      children: [
        {
          path: 'home',
          component: HomeComponent,
          canActivate: [routePermissionGuard, authGuard], 
          data: { permission: { roles: ['administrador'] } },
        },
        {
          path: 'users',
          component: Users,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Usuarios', action: 'can_view', roles: ['administrador'] } },
        },
        {
          path: 'services',
          component: Services,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Servicios', action: 'can_view', roles: ['administrador'] } },
        },
        {
          path: 'reports',
          component: Reports,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Reportes', action: 'can_view', roles: ['administrador'] } },
        },
        {
          path: 'analitica',
          component: AnaliticaComponent,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Analitica avanzada', action: 'can_view', roles: ['administrador'] } },
        },
        {
          path: 'lecturas',
          component: LecturasComponent,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Lecturas IoT', action: 'can_view', roles: ['administrador', 'tecnico'] } },
        },
        {
          path: 'tecnic-home',
          component: TecnicHome,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { roles: ['tecnico'] } },
        },
        {
          path: 'techniccian-services',
          component: TechniccianServices,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Servicios', action: 'can_view', roles: ['tecnico'] } },
        },
        {
          path: 'technician-reports',
          component: TechnicianReports,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Reportes', action: 'can_view', roles: ['tecnico'] } },
        },
        {
          path: 'profile',
          component: ClientProfileComponent,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { roles: ['tecnico'] } },
        },
        {
          path: 'maintenance-control',
          component: MaintenanceControlComponent,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Control Mantenimiento', action: 'can_view', roles: ['administrador'] } },
        },
        {
          path: 'roles',
          component: RolesComponent,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Roles y Permisos', action: 'can_view', roles: ['administrador'] } },
        },
      ],
    },

    // ── Rutas de Cliente ─────────────────────────────
    {
      path: '',
      component: ClientLayoutComponent,
      canActivate: [sessionAuthGuard],
      children: [
        {
          path: 'client-home',
          component: ClientHome,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { roles: ['cliente'] } },
        },
        {
          path: 'client-services',
          component: ClientServices,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Servicios', action: 'can_view', roles: ['cliente'] } },
        },
        {
          path: 'client-reports',
          component: ClientReports,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { module: 'Reportes', action: 'can_view', roles: ['cliente'] } },
        },
        {
          path: 'profile',
          component: ClientProfileComponent,
          canActivate: [routePermissionGuard, authGuard],
          data: { permission: { roles: ['cliente'] } },
        },
      ],
    },

    // ── Fallback ─────────────────────────────────────
    { path: '**', component: Notfound },
];
