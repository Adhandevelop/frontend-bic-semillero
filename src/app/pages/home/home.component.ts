import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({selector: 'app-home', standalone: true, imports: [CommonModule, FormsModule, RouterLink], templateUrl: './home.component.html', styleUrls: ['./home.component.css', './home-content.component.css']})
export class HomeComponent {
  readonly images = ["https://lh3.googleusercontent.com/aida-public/AB6AXuD3tgQT79djQy4BGinia3MFo9csgUOaPGobX_Se3qfcTw8mu2kP6paYh_kgYlwfaY78aR4ZSXV_Q7PHAOIRUXEFn_I-tEmEKHgXcJjD63jCek115IdMOEuiEJda2aK9srM3oORFZntoZqJx9x5UfPmnM_4TXuvhLpgJtVfeLHjhOpV93Es96n2OMlxKZSrsHJjEdE9EQt4AE2O6M8qdfxOiLKQ7MMiFnpqCxk1Uj0FRRW7GEbLl822H","https://lh3.googleusercontent.com/aida-public/AB6AXuD8HjaTYSqeiMW0-AA272PEqDpOXkD4sfVcHvBaSCtlv493mmU2Fpe4w8Qwzpw2CSVtSy9Fba_0y1hARPnrGOpgyq7gEJYhlhcfQRhXV8F7lH4tdGJLITK1qRDuAIL9WJTFd8tLCzS5CMOA74sJ3oxPT0kLUvKypiVo09Cdrsq567RU_hP4sZYt9e6xAm4DWM93TcLf3vtmlN3pyLgxXXJqJw1Gy1nHSbV-EaWarKqEhbJl9T_ZMU3T","https://lh3.googleusercontent.com/aida-public/AB6AXuBzecAHdmI0-Q0y699nemycYwTzCiHDuXVQ7wogFdncau4HsPn489r_K_B-ut-ABCUf4YNdkPCJeINlW_tDsJuqPuxYom52QGK7MT3thPwjIM-1K2Fce7XM9_iorypfdumVYbBB_4e26GBIsHdkug1dZFKfu0ZmuxDtuTobE594M0K47Sd-KJ0ye0UKwoNem2YIPWsbE7RGhEycHWRLGDeJgjSXggG0DVGVQVqz1NduzoIFOoDPGG-w"];
  readonly cities = [
    {code:'BOG',name:'Bogotá (Terminal Salitre)'}, {code:'BOG-N',name:'Bogotá (Terminal Norte)'},
    {code:'MDE',name:'Medellín (Terminal del Norte)'}, {code:'CLO',name:'Cali (Terminal Central)'},
    {code:'BAQ',name:'Barranquilla'}, {code:'CTG',name:'Cartagena'}, {code:'BGA',name:'Bucaramanga'},
    {code:'PEI',name:'Pereira'}, {code:'SMR',name:'Santa Marta'}
  ];
  readonly popularRoutes = [
    {destination:'MDE',name:'Medellín',duration:'8 h 15 min',price:'$72.000',service:'Ejecutivo y Premier · Asientos reclinables'},
    {destination:'CLO',name:'Cali',duration:'10 h',price:'$85.000',service:'Servicio ejecutivo · Comodidad a bordo'},
    {destination:'BGA',name:'Bucaramanga',duration:'7 h 30 min',price:'$65.000',service:'Confort Plus · Trayectos intermunicipales'}
  ];
  searchMode = 'Número de viaje';
  searchValue = '';
  searchMessage = '';
  origin = 'BOG';
  destination = 'MDE';
  departureDate = '2026-10-24';
  returnDate = '';
  passengers = 1;
  routeMessage = '';
  newsletterEmail = '';
  newsletterMessage = '';
  notice = '';
  readonly today = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  constructor(private router: Router) {}

  seleccionarBusqueda(mode: string): void { this.searchMode = mode; this.searchValue = ''; this.searchMessage = ''; }
  buscarTrayecto(): void {
    this.searchMessage = this.searchValue.trim()
      ? 'La consulta por ' + this.searchMode.toLowerCase() + ' estará disponible al conectar los datos de viajes. Puedes ver el mapa de buses de ejemplo.'
      : 'Ingresa un código para consultar tu trayecto.';
  }
  private validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  buscarRutas(): void {
    this.routeMessage = '';
    if (!this.cities.some(city => city.code === this.origin) || !this.cities.some(city => city.code === this.destination)) {
      this.routeMessage = 'Selecciona un origen y un destino válidos.'; return;
    }
    if (this.origin === this.destination) { this.routeMessage = 'El origen y el destino deben ser diferentes.'; return; }
    if (!this.validDate(this.departureDate) || this.departureDate < this.today) {
      this.routeMessage = 'Selecciona una fecha de ida válida, desde hoy en adelante.'; return;
    }
    if (this.returnDate && (!this.validDate(this.returnDate) || this.returnDate < this.departureDate)) { this.routeMessage = 'El regreso no puede ser anterior a la ida.'; return; }
    if (this.origin !== 'BOG' || this.destination !== 'MDE' || this.departureDate !== '2026-10-24' || this.returnDate || this.passengers !== 1) {
      this.routeMessage = 'El catálogo real está pendiente. La simulación disponible es Bogotá (Salitre) a Medellín, el 24 de octubre de 2026, solo ida para 1 adulto.'; return;
    }
    this.router.navigateByUrl('/clientes/comprar');
  }
  choosePopular(destination: string): void {
    this.origin = 'BOG'; this.destination = destination; this.departureDate = '2026-10-24'; this.returnDate = ''; this.passengers = 1;
    this.buscarRutas();
  }
  subscribeNewsletter(): void {
    this.newsletterMessage = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newsletterEmail.trim())
      ? 'El boletín estará disponible próximamente. Tu correo no se ha enviado ni guardado.'
      : 'Ingresa un correo electrónico válido.';
  }
  pending(feature: string): void { this.notice = feature + ': disponible próximamente.'; }
}
