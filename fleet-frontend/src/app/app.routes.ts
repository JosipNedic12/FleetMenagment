import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth/auth.guard';
import { AppShellComponent } from './app-shell.component';

export const routes: Routes = [
  // Public
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'change-password',
    loadComponent: () =>
      import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent)
  },

  // Protected — wrapped in shell (sidebar + layout)
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      // ── User profile & settings ──
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      // ── Admin: User management ──
      {
        path: 'users',
        canActivate: [roleGuard('Admin')],
        loadComponent: () =>
          import('./features/users/list/users-list.component').then(m => m.UsersListComponent)
      },
      // ── Fleet core ──
      {
        path: 'vehicles',
        loadComponent: () =>
          import('./features/vehicles/list/vehicles-list.component').then(m => m.VehiclesListComponent)
      },
      {
        path: 'vehicles/:id',
        loadComponent: () =>
          import('./features/vehicles/detail/vehicle-detail.component').then(m => m.VehicleDetailComponent)
      },
      {
        path: 'drivers',
        loadComponent: () =>
          import('./features/drivers/list/drivers-list.component').then(m => m.DriversListComponent)
      },
      {
        path: 'drivers/:id',
        loadComponent: () =>
          import('./features/drivers/detail/driver-detail.component').then(m => m.DriverDetailComponent)
      },
      {
        path: 'assignments',
        loadComponent: () =>
          import('./features/assignments/list/assignments-list.component').then(m => m.AssignmentsListComponent)
      },
      {
        path: 'maintenance',
        loadComponent: () =>
          import('./features/maintenance/list/maintenance-list.component').then(m => m.MaintenanceListComponent)
      },
      {
        path: 'fuel',
        loadComponent: () =>
          import('./features/fuel/list/fuel-list.component').then(m => m.FuelListComponent)
      },
      {
        path: 'odometer',
        loadComponent: () =>
          import('./features/odometer/list/odometer-list.component').then(m => m.OdometerListComponent)
      },
      // ── Compliance ──
      {
        path: 'insurance',
        loadComponent: () =>
          import('./features/insurance/list/insurance-list.component').then(m => m.InsuranceListComponent)
      },
      {
        path: 'registration',
        loadComponent: () =>
          import('./features/registration/list/registration-list.component').then(m => m.RegistrationListComponent)
      },
      {
        path: 'inspections',
        loadComponent: () =>
          import('./features/inspections/list/inspections-list.component').then(m => m.InspectionsListComponent)
      },
      {
        path: 'fines',
        loadComponent: () =>
          import('./features/fines/list/fines-list.component').then(m => m.FinesListComponent)
      },
      {
        path: 'accidents',
        loadComponent: () =>
          import('./features/accidents/list/accidents-list.component').then(m => m.AccidentsListComponent)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then(m => m.ReportsComponent)
      },
    ]
  },

  // Catch-all
  { path: '**', redirectTo: 'dashboard' }
];