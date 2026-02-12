import { Routes } from '@angular/router';
import { Main } from './pages/main/main';
import { Contact } from './pages/contact/contact';
import { Notfound } from './pages/notfound/notfound';

export const routes: Routes = [
    {path:'', component:Main},
    {path:'contact', component:Contact},
    {path:'**', component:Notfound}


];
