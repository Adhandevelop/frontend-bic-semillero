import { passengerGuard } from './core/guards/passenger.guard';
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';
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
  { path: 'cambiar-contrasena', canActivate:[authGuard], loadComponent: () => import('./pages/staff-password/staff-password.component').then(m => m.StaffPasswordComponent) },
  { path:'verificar/boleta',data:{kind:'ticket'},loadComponent:()=>import('./pages/public-verification/public-verification.component').then(m=>m.PublicVerificationComponent) },
  { path:'verificar/carne',data:{kind:'card'},loadComponent:()=>import('./pages/public-verification/public-verification.component').then(m=>m.PublicVerificationComponent) },
  { path:'clientes/recuperar-contrasena',data:{action:'reset-request'},loadComponent:()=>import('./pages/client-security/client-security.component').then(m=>m.ClientSecurityComponent) },
  { path:'clientes/restablecer-contrasena',data:{action:'reset-confirm'},loadComponent:()=>import('./pages/client-security/client-security.component').then(m=>m.ClientSecurityComponent) },
  { path:'clientes/solicitar-activacion',data:{action:'activation-request'},loadComponent:()=>import('./pages/client-security/client-security.component').then(m=>m.ClientSecurityComponent) },
  { path:'clientes/activar-cuenta',data:{action:'activation-confirm'},loadComponent:()=>import('./pages/client-security/client-security.component').then(m=>m.ClientSecurityComponent) },
  { path:'clientes/cambiar-contrasena',data:{action:'change'},canActivate:[passengerGuard],loadComponent:()=>import('./pages/client-security/client-security.component').then(m=>m.ClientSecurityComponent) },
  { path: 'clientes/comprar', canActivate:[passengerGuard], loadComponent: () => import('./pages/booking/booking.component').then(m => m.BookingComponent) },
  { path: 'clientes/mi-cuenta', data:{account:true}, canActivate:[passengerGuard], loadComponent: () => import('./pages/client-panel/client-panel.component').then(m => m.ClientPanelComponent) },
  { path: 'clientes/panel', canActivate:[passengerGuard], loadComponent: () => import('./pages/client-panel/client-panel.component').then(m => m.ClientPanelComponent) },
  { path: 'clientes/login', loadComponent: () => import('./pages/client-login/client-login.component').then(m => m.ClientLoginComponent) },
  { path: 'registro', loadComponent: () => import('./pages/registro/registro.component').then(m => m.RegistroComponent) },
  { path: 'ubicacion', loadComponent: () => import('./pages/ubicacion/ubicacion.component').then(m => m.UbicacionComponent) },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'dispositivos', canActivate:[roleGuard(['admin','dispatcher'])], loadComponent: () => import('./pages/devices/devices.component').then(m => m.DevicesComponent) },
      { path: 'soporte', canActivate:[roleGuard(['admin','seller'])], loadComponent: () => import('./pages/admin-support/admin-support.component').then(m => m.AdminSupportComponent) },
      { path: 'validar-qr', canActivate:[roleGuard(['admin','seller','dispatcher','driver'])], loadComponent: () => import('./pages/qr-reader/qr-reader.component').then(m => m.QrReaderComponent) },
      { path: 'monitoreo/demostracion', loadComponent: () => import('./pages/monitoreo/monitoreo.component').then(m => m.MonitoreoComponent) },
      { path: 'monitoreo', loadComponent: () => import('./pages/monitoreo-api/monitoreo-api.component').then(m => m.MonitoreoApiComponent) },
      { path: 'asientos', loadComponent: () => import('./pages/asientos/asientos.component').then(m => m.AsientosComponent) },
      { path: 'ventas', canActivate:[roleGuard(['admin','seller','auditor'])], loadComponent: () => import('./pages/ventas/venta-list.component').then(m => m.VentaListComponent) },
      { path: 'ventas/nueva', canActivate:[roleGuard(['admin','seller'])], loadComponent: () => import('./pages/ventas/venta-form.component').then(m => m.VentaFormComponent) },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'clientes/nuevo', canActivate:[roleGuard(['admin','seller'])], loadComponent: () => import('./pages/clientes/client-form.component').then(m => m.ClientFormComponent) },
      { path: 'clientes', canActivate:[roleGuard(['admin','seller'])], loadComponent: () => import('./pages/clientes/client-list.component').then(m => m.ClientListComponent) },
      { path: 'perfil', data: { section: 'profile' }, loadComponent: () => import('./pages/staff/staff.component').then(m => m.StaffComponent) },
      { path: 'personal', data: { section: 'users' }, canActivate:[roleGuard(['admin'])], loadComponent: () => import('./pages/staff/staff.component').then(m => m.StaffComponent) },
      { path: 'auditoria', canActivate:[roleGuard(['admin','seller','dispatcher','auditor'])], loadComponent: () => import('./pages/audit/audit.component').then(m => m.AuditComponent) },
      { path: 'buses/tipos', canActivate:[roleGuard(['admin'])], loadComponent: () => import('./pages/buses/bus-types.component').then(m => m.BusTypesComponent) },
      { path: 'buses', canActivate:[roleGuard(['admin','dispatcher'])], component: BusListComponent },
      { path: 'buses/:id/asientos', canActivate:[roleGuard(['admin','dispatcher'])], loadComponent: () => import('./pages/bus-seats/bus-seats.component').then(m => m.BusSeatsComponent) },
      { path: 'buses/nuevo', canActivate:[roleGuard(['admin'])], component: BusFormComponent },
      { path: 'buses/editar/:id', canActivate:[roleGuard(['admin'])], component: BusFormComponent },
      { path: 'buses/:id', canActivate:[roleGuard(['admin','dispatcher'])], loadComponent: () => import('./pages/buses/bus-detail.component').then(m => m.BusDetailComponent) },
      { path: 'conductores', canActivate:[roleGuard(['admin','dispatcher'])], component: ConductorListComponent },
      { path: 'conductores/nuevo', canActivate:[roleGuard(['admin'])], component: ConductorFormComponent },
      { path: 'conductores/editar/:id', canActivate:[roleGuard(['admin'])], component: ConductorFormComponent },
      { path: 'conductores/:id', canActivate:[roleGuard(['admin','dispatcher'])], loadComponent: () => import('./pages/conductores/conductor-detail.component').then(m => m.ConductorDetailComponent) },
      { path: 'rutas', canActivate:[roleGuard(['admin','dispatcher'])], component: RutaListComponent },
      { path: 'rutas/nueva', canActivate:[roleGuard(['admin'])], component: RutaFormComponent },
      { path: 'rutas/editar/:id', canActivate:[roleGuard(['admin'])], component: RutaFormComponent },
      { path: 'viajes', component: ViajeListComponent },
      { path: 'viajes/nuevo', canActivate:[roleGuard(['admin','dispatcher'])], component: ViajeFormComponent },
      { path: 'viajes/editar/:id', canActivate:[roleGuard(['admin','dispatcher'])], component: ViajeFormComponent },
      { path: 'viajes/:id', loadComponent: () => import('./pages/viajes/viaje-detail.component').then(m => m.ViajeDetailComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
