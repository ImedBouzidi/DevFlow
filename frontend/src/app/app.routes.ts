import { Routes } from '@angular/router';

import { adminGuard, authGuard, dashboardRedirectGuard, guestGuard, roleGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in | DevFlow AI',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((component) => component.LoginComponent)
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
        path: 'profile',
        title: 'Profile & Security | DevFlow AI',
        loadComponent: () =>
          import('./features/profile/profile.component').then((component) => component.ProfileComponent)
      },
      {
        path: 'dashboard',
        canActivate: [dashboardRedirectGuard],
        title: 'Operations overview | DevFlow AI',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (component) => component.DashboardComponent
          )
      },
      {
        path: 'manager-dashboard',
        canActivate: [roleGuard(['ROLE_MANAGER'])],
        title: 'Manager Dashboard | DevFlow AI',
        loadComponent: () => import('./features/manager-dashboard/manager-dashboard.component')
          .then((component) => component.ManagerDashboardComponent)
      },
      {
        path: 'developer-dashboard',
        canActivate: [roleGuard(['ROLE_DEVELOPER'])],
        title: 'Developer Dashboard | DevFlow AI',
        loadComponent: () => import('./features/developer-dashboard/developer-dashboard.component')
          .then((component) => component.DeveloperDashboardComponent)
      },
      {
        path: 'support-dashboard',
        canActivate: [roleGuard(['ROLE_SUPPORT'])],
        title: 'Support Dashboard | DevFlow AI',
        loadComponent: () => import('./features/support-dashboard/support-dashboard.component')
          .then((component) => component.SupportDashboardComponent)
      },
      {
        path: 'admin-dashboard',
        canActivate: [adminGuard],
        title: 'Admin Dashboard | DevFlow AI',
        loadComponent: () =>
          import('./features/admin-dashboard/admin-dashboard.component').then(
            (component) => component.AdminDashboardComponent
          )
      },
      {
        path: 'user-management',
        canActivate: [adminGuard],
        title: 'User Management | DevFlow AI',
        loadComponent: () =>
          import('./features/user-management/user-management.component').then(
            (component) => component.UserManagementComponent
          )
      },
      { path: 'admindashboards', redirectTo: 'admin-dashboard' },
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
