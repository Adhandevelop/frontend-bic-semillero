import { Routes } from '@angular/router';
import { LayoutComponent } from './shared/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { BusListComponent } from './pages/buses/bus-list.component';
import { BusFormComponent } from './pages/buses/bus-form.component';
import { ConductorListComponent } from './pages/conductores/conductor-list.component';
import { ConductorFormComponent } from './pages/conductores/conductor-form.component';
import { RutaListComponent } from './pages/rutas/ruta-list.component';
import { RutaFormComponent } from './pages/rutas/ruta-form.component';
import { ViajeListComponent } from './pages/viajes/viaje-list.component';
import { ViajeFormComponent } from './pages/viajes/viaje-form.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
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
  { path: '**', redirectTo: 'dashboard' }
];
