import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { BusListComponent } from './pages/buses/bus-list.component';
import { BusFormComponent } from './pages/buses/bus-form.component';
import { ConductorListComponent } from './pages/conductores/conductor-list.component';
import { ConductorFormComponent } from './pages/conductores/conductor-form.component';
import { RutaListComponent } from './pages/rutas/ruta-list.component';
import { RutaFormComponent } from './pages/rutas/ruta-form.component';
import { ViajeListComponent } from './pages/viajes/viaje-list.component';
import { ViajeFormComponent } from './pages/viajes/viaje-form.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'clientes/comprar', loadComponent: () => import('./pages/booking/booking.component').then(m => m.BookingComponent) },
  { path: 'clientes/panel', loadComponent: () => import('./pages/client-panel/client-panel.component').then(m => m.ClientPanelComponent) },
  { path: 'clientes/login', loadComponent: () => import('./pages/client-login/client-login.component').then(m => m.ClientLoginComponent) },
  { path: 'registro', loadComponent: () => import('./pages/registro/registro.component').then(m => m.RegistroComponent) },
  { path: 'ubicacion', loadComponent: () => import('./pages/ubicacion/ubicacion.component').then(m => m.UbicacionComponent) },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'clientes', loadComponent: () => import('./pages/clientes/client-list.component').then(m => m.ClientListComponent) },
      { path: 'buses', component: BusListComponent },
      { path: 'buses/nuevo', component: BusFormComponent },
      { path: 'buses/editar/:id', component: BusFormComponent },
      { path: 'conductores', component: ConductorListComponent },
      { path: 'conductores/nuevo', component: ConductorFormComponent },
      { path: 'conductores/editar/:id', component: ConductorFormComponent },
      { path: 'rutas', component: RutaListComponent },
      { path: 'rutas/nueva', component: RutaFormComponent },
      { path: 'rutas/editar/:id', component: RutaFormComponent },
      { path: 'viajes', component: ViajeListComponent },
      { path: 'viajes/nuevo', component: ViajeFormComponent },
      { path: 'viajes/editar/:id', component: ViajeFormComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
