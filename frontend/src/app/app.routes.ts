import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in | DevFlow AI',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((component) => component.LoginComponent)
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Create account | DevFlow AI',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (component) => component.RegisterComponent
      )
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then(
        (component) => component.AppShellComponent
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Operations overview | DevFlow AI',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (component) => component.DashboardComponent
          )
      },
      {
        path: 'incidents',
        title: 'Incidents | DevFlow AI',
        loadComponent: () =>
          import('./features/incidents/incidents.component').then(
            (component) => component.IncidentsComponent
          )
      }
    ]
  },
  {
    path: '**',
    title: 'Page not found | DevFlow AI',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (component) => component.NotFoundComponent
      )
  }
];
