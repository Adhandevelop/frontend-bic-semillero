import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MonitoreoComponent } from '../monitoreo/monitoreo.component';

@Component({
  selector:'app-ubicacion',standalone:true,imports:[RouterLink,MonitoreoComponent],
  templateUrl:'./ubicacion.component.html',styleUrl:'./ubicacion.component.css'
})
export class UbicacionComponent {}
