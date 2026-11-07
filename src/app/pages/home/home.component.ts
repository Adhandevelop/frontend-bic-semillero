import { tripCanSell, tripSalesMessage, tripSalesMetadataPresent, TRIP_SALES_CONTRACT_MESSAGE } from '../../core/utils/trip-sales';
import { HomeMapComponent } from './home-map.component';
import { PublicCatalogService, PublicRoute, PublicTrip } from '../../core/services/public-catalog.service';
import { passengerError } from '../../core/services/passenger.service';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil, timeout } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({selector: 'app-home', standalone: true, imports: [CommonModule, FormsModule, RouterLink, HomeMapComponent], templateUrl: './home.component.html', styleUrls: ['./home.component.css', './home-content.component.css', './home-hero-map.component.css']})
export class HomeComponent implements OnInit,OnDestroy {
  private destroyed=new Subject<void>();private searchCancelled=new Subject<void>();
  searching=false;searchError='';alternativeDates:string[]=[];
  readonly images = ["https://lh3.googleusercontent.com/aida-public/AB6AXuD3tgQT79djQy4BGinia3MFo9csgUOaPGobX_Se3qfcTw8mu2kP6paYh_kgYlwfaY78aR4ZSXV_Q7PHAOIRUXEFn_I-tEmEKHgXcJjD63jCek115IdMOEuiEJda2aK9srM3oORFZntoZqJx9x5UfPmnM_4TXuvhLpgJtVfeLHjhOpV93Es96n2OMlxKZSrsHJjEdE9EQt4AE2O6M8qdfxOiLKQ7MMiFnpqCxk1Uj0FRRW7GEbLl822H","https://lh3.googleusercontent.com/aida-public/AB6AXuD8HjaTYSqeiMW0-AA272PEqDpOXkD4sfVcHvBaSCtlv493mmU2Fpe4w8Qwzpw2CSVtSy9Fba_0y1hARPnrGOpgyq7gEJYhlhcfQRhXV8F7lH4tdGJLITK1qRDuAIL9WJTFd8tLCzS5CMOA74sJ3oxPT0kLUvKypiVo09Cdrsq567RU_hP4sZYt9e6xAm4DWM93TcLf3vtmlN3pyLgxXXJqJw1Gy1nHSbV-EaWarKqEhbJl9T_ZMU3T","https://lh3.googleusercontent.com/aida-public/AB6AXuBzecAHdmI0-Q0y699nemycYwTzCiHDuXVQ7wogFdncau4HsPn489r_K_B-ut-ABCUf4YNdkPCJeINlW_tDsJuqPuxYom52QGK7MT3thPwjIM-1K2Fce7XM9_iorypfdumVYbBB_4e26GBIsHdkug1dZFKfu0ZmuxDtuTobE594M0K47Sd-KJ0ye0UKwoNem2YIPWsbE7RGhEycHWRLGDeJgjSXggG0DVGVQVqz1NduzoIFOoDPGG-w"];
  routes:PublicRoute[]=[];trips:PublicTrip[]=[];results:PublicTrip[]=[];catalogLoading=false;catalogError='';searched=false;
  get cities(){return [...new Map(this.routes.flatMap(r=>[r.origin,r.destination]).map(p=>[p.id,{code:String(p.id),name:p.name}])).values()];}
  get popularRoutes(){return this.routes.slice(0,6).map(r=>({origin:r.origin.name,destination:String(r.id),name:r.destination.name,duration:r.distance_km?r.distance_km+' km':'Ruta intermunicipal',price:'Consultar horarios',service:r.origin.name+' → '+r.destination.name}));}
  ngOnInit():void{this.loadCatalog();}
  loadCatalog():void{if(this.catalogLoading)return;this.catalogLoading=true;this.catalogError='';this.publicApi.catalog().pipe(timeout(20000),takeUntil(this.destroyed)).subscribe({next:data=>{this.routes=data.routes;this.trips=data.trips;this.catalogLoading=false;if(data.trips.some(t=>!tripSalesMetadataPresent(t)))this.catalogError=TRIP_SALES_CONTRACT_MESSAGE;},error:err=>{this.catalogLoading=false;this.catalogError=passengerError(err);}});}
  routeFor(t:PublicTrip):PublicRoute|undefined{return typeof t.route==='number'?this.routes.find(r=>r.id===t.route):t.route;}
  searchMode = 'Número de viaje';
  searchValue = '';
  searchMessage = '';
  origin = '';
  destination = '';
  departureDate = '';
  returnDate = '';
  passengers = 1;
  routeMessage = '';
  newsletterEmail = '';
  newsletterMessage = '';
  notice = '';
  readonly today = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  constructor(private router: Router,private publicApi:PublicCatalogService) {}

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
    this.searchCancelled.next();this.searching=false;this.results=[];this.searched=false;this.searchError='';this.alternativeDates=[];
    this.routeMessage = '';
    if (!this.cities.some(city => city.code === this.origin) || !this.cities.some(city => city.code === this.destination)) {
      this.routeMessage = 'Selecciona un origen y un destino válidos.'; return;
    }
    if (this.origin === this.destination) { this.routeMessage = 'El origen y el destino deben ser diferentes.'; return; }
    if (!this.validDate(this.departureDate) || this.departureDate < this.today) {
      this.routeMessage = 'Selecciona una fecha de ida válida, desde hoy en adelante.'; return;
    }
    if (this.returnDate && (!this.validDate(this.returnDate) || this.returnDate < this.departureDate)) { this.routeMessage = 'El regreso no puede ser anterior a la ida.'; return; }
    if(!Number.isSafeInteger(this.passengers)||this.passengers<1){this.routeMessage='Ingresa un número entero de pasajeros mayor que cero.';return;}
    if(this.returnDate){this.routeMessage='Consulta y compra cada trayecto por separado.';return;}
    if(this.catalogLoading||this.catalogError){this.routeMessage='Espera a que cargue el catálogo o reintenta la consulta.';return;}
    this.queryTrips(this.departureDate);
  }
  choosePopular(id:string):void{const route=this.routes.find(r=>r.id===Number(id));if(!route)return;this.origin=String(route.origin.id);this.destination=String(route.destination.id);this.departureDate='';this.returnDate='';this.queryTrips();}
  private tripDay(trip:PublicTrip):string{const date=new Date(trip.date_time_start);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(date):'';}
  private queryTrips(date=''):void{
    this.searchCancelled.next();this.results=[];this.searched=true;this.searching=true;this.searchError='';this.alternativeDates=[];this.routeMessage='';const origin=this.origin,destination=this.destination;
    this.publicApi.trips({origin,destination}).pipe(timeout(20000),takeUntil(this.searchCancelled),takeUntil(this.destroyed)).subscribe({next:trips=>{
      this.searching=false;if(trips.some(t=>!tripSalesMetadataPresent(t))){this.searchError=TRIP_SALES_CONTRACT_MESSAGE;return;}const available=trips.filter(t=>{const r=this.routeFor(t);return Number(r?.origin.id)===Number(origin)&&Number(r?.destination.id)===Number(destination)&&tripCanSell(t);}).sort((a,b)=>Date.parse(a.date_time_start)-Date.parse(b.date_time_start));
      this.results=date?available.filter(t=>this.tripDay(t)===date):available;
      if(!this.results.length&&date)this.alternativeDates=[...new Set(available.map(t=>this.tripDay(t)).filter(Boolean))];
      this.routeMessage=this.results.length?'Selecciona un horario para elegir tus sillas. La disponibilidad se confirma al comprar.':date?'No hay salidas futuras para esta ruta en la fecha seleccionada.':'Esta ruta está publicada, pero aún no tiene salidas futuras programadas.';
    },error:err=>{this.searching=false;this.searchError=passengerError(err);}});
  }
  useDate(date:string):void{this.departureDate=date;this.buscarRutas();}
  ngOnDestroy():void{this.searchCancelled.next();this.searchCancelled.complete();this.destroyed.next();this.destroyed.complete();}
  subscribeNewsletter(): void {
    this.newsletterMessage = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newsletterEmail.trim())
      ? 'El boletín estará disponible próximamente. Tu correo no se ha enviado ni guardado.'
      : 'Ingresa un correo electrónico válido.';
  }
  pending(feature: string): void { this.notice = feature + ': disponible próximamente.'; }
}
