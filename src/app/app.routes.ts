import { Routes } from '@angular/router';
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
      children: [
        { path: 'home', component: HomeComponent },
        { path: 'users', component: Users },
        { path: 'services', component: Services },
        { path: 'reports', component: Reports },
        { path: 'analitica', component: AnaliticaComponent },
        { path: 'lecturas', component: LecturasComponent },
        { path: 'tecnic-home', component: TecnicHome },
        { path: 'techniccian-services', component: TechniccianServices },
        { path: 'technician-reports', component: TechnicianReports },
        { path: 'profile', component: ClientProfileComponent },
        { path: 'maintenance-control', component: MaintenanceControlComponent },
      ],
    },

    // ── Rutas de Cliente ─────────────────────────────
    {
      path: '',
      component: ClientLayoutComponent,
      children: [
        { path: 'client-home', component: ClientHome },
        { path: 'client-services', component: ClientServices },
        { path: 'client-reports', component: ClientReports },
        { path: 'profile', component: ClientProfileComponent },
      ],
    },

    // ── Fallback ─────────────────────────────────────
    { path: '**', component: Notfound },
];
