import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Contact } from './pages/contact/contact';
import { Notfound } from './pages/notfound/notfound';
import { RegisterComponent } from './pages/register/register';
import { Users } from './pages/users/users';
import { Services } from './pages/services/services';
import { LoginComponent } from './pages/login/login';
import { ReportsComponent } from './pages/reports/reports';
import { HomeComponent } from './pages/home/home';


export const routes: Routes = [
    { path: '', component:Main},
    { path: 'contact', component:Contact},
    { path: 'register', component: RegisterComponent },
    { path: 'login', component: LoginComponent },
    { path: 'users', component: Users },
    { path: 'services', component: Services },
    { path: 'home', component: HomeComponent },
    { path: 'reports', component: ReportsComponent },
    { path: '**', component:Notfound}


];
