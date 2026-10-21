import { Routes } from '@angular/router';
import { NavBarComponent } from './features/nav-bar/nav-bar.component';
import {DashboardComponent} from './features/dashboard/dashboard';
import {CharacterDashboardComponent} from './features/characterDashboard/characterDashboard.component';
import {DescriptionPage} from './util/description-page/description-page';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent
  },
  {
    path: 'characters',
    component: CharacterDashboardComponent
  },
  {
    path: 'spellbook',
    loadComponent: () => import('./features/spellbook/spellbook.component').then(component => component.SpellbookComponent)
  },
  {
    path: 'class/:name',
    component: DescriptionPage
  }
];
