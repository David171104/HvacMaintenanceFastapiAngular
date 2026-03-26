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
import { ClientHome } from './pages/client-home/client-home';
import { TecnicHome } from './pages/tecnic-home/tecnic-home';
import { ClientServices } from './pages/client-services/client-services';
import { TechniccianServices } from './pages/techniccian-services/techniccian-services';


export const routes: Routes = [
    { path: '', component:Main},
    { path: 'contact', component:Contact},
    { path: 'register', component: RegisterComponent },
    { path: 'login', component: LoginComponent },
    { path: 'users', component: Users },
    { path: 'services', component: Services },
    { path: 'home', component: HomeComponent },
    { path: 'reports', component: Reports },
    { path: 'lecturas', component: LecturasComponent },
    { path: 'client-home', component: ClientHome },
    { path: 'tecnic-home', component: TecnicHome },
    { path: 'client-services', component: ClientServices },
    { path: 'techniccian-services', component: TechniccianServices },
  
    { path: '**', component:Notfound}

];
