import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { BUS_LOCATIONS_MOCK } from '../../core/data/bus-locations.mock';
import { BusLocationCollection } from '../../core/models/bus-location.model';

@Component({
  selector: 'app-ubicacion', standalone: true, imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './ubicacion.component.html', styleUrl: './ubicacion.component.css'
})
export class UbicacionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) private mapContainer!: ElementRef<HTMLDivElement>;
  readonly locations: BusLocationCollection = BUS_LOCATIONS_MOCK;
  selectedBus = this.locations.features[0];
  message = '';
  tileError = false;
  passengerName = '';
  travelCode = '';
  submitted = false;
  trackingMessage = '';
  private map?: L.Map;
  private busLayer?: L.GeoJSON;
  private resizeObserver?: ResizeObserver;

  get coordinates(): string {
    const [longitude, latitude] = this.selectedBus.geometry.coordinates;
    return latitude.toFixed(4) + ', ' + longitude.toFixed(4);
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.mapContainer.nativeElement, { scrollWheelZoom: false });
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    tiles.on('tileerror', () => { this.tileError = true; });
    tiles.addTo(this.map);
    this.busLayer = L.geoJSON(this.locations, {
      pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
        radius: 11, color: '#ffffff', weight: 3, fillColor: '#0059bb', fillOpacity: 1
      }),
      onEachFeature: (feature, layer) => {
        const label = document.createElement('span');
        label.textContent = 'Bus #' + feature.properties.unit + ' - ' + feature.properties.plate;
        layer.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -10] });
        layer.on('click', () => this.selectBus(feature.properties.id));
      }
    }).addTo(this.map);
    this.showAllBuses();
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.mapContainer.nativeElement);
  }

  selectBus(id: number): void {
    const bus = this.locations.features.find(feature => feature.properties.id === id);
    if (!bus) return;
    this.selectedBus = bus;
    const [longitude, latitude] = bus.geometry.coordinates;
    this.map?.setView([latitude, longitude], 14);
  }

  viewTracking(): void {
    this.submitted = true;
    if (!this.passengerName.trim() || !/^[0-9]{6}$/.test(this.travelCode)) return;
    this.trackingMessage = 'Mostrando posiciones de ejemplo. El código ingresado no se ha validado.';
    this.showAllBuses();
    this.mapContainer.nativeElement.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center'
    });
  }

  showAllBuses(): void {
    if (this.map && this.busLayer) {
      this.map.fitBounds(this.busLayer.getBounds(), { padding: [60, 60], maxZoom: 13 });
    }
  }

  contact(): void {
    this.message = 'El contacto del operador estará disponible al conectar los datos reales del viaje.';
  }

  async share(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.message = 'Enlace de la vista de demostración copiado.';
    } catch {
      this.message = 'Copia la dirección del navegador para compartir esta vista.';
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }
}
