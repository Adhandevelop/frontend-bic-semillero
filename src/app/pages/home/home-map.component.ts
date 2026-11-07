import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { BUS_LOCATIONS_MOCK } from '../../core/data/bus-locations.mock';

@Component({
  selector:'app-home-map',standalone:true,
  template:'<div #canvas class="hero-map" aria-hidden="true"></div>',
  styleUrls:['../monitoreo/monitoring-map.component.css'],
  styles:[':host{display:block;position:absolute;inset:0;z-index:0}.hero-map{height:100%;width:100%;background:#e7eff8}:host ::ng-deep .leaflet-bottom.leaflet-right{bottom:0}:host ::ng-deep .leaflet-control-attribution{pointer-events:auto}']
})
export class HomeMapComponent implements AfterViewInit,OnDestroy {
  @ViewChild('canvas',{static:true}) canvas!:ElementRef<HTMLDivElement>;
  private map?:L.Map;private observer?:ResizeObserver;
  ngAfterViewInit():void{
    this.map=L.map(this.canvas.nativeElement,{zoomControl:false,scrollWheelZoom:false,dragging:false,touchZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(this.map);
    for(const point of BUS_LOCATIONS_MOCK.features){
      const [longitude,latitude]=point.geometry.coordinates;
      const icon=L.divIcon({className:'fleet-map-marker',iconSize:[38,38],iconAnchor:[19,19],html:'<span class="fleet-map-bus is-selected"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 6h8M8 15h1m6 0h1M7 19v2m10-2v2"/></svg></span>'});
      L.marker([latitude,longitude],{icon,interactive:false,keyboard:false,alt:'Bus de demostración'}).addTo(this.map);
    }
    this.fit();this.observer=new ResizeObserver(()=>{this.map?.invalidateSize();this.fit();});this.observer.observe(this.canvas.nativeElement);
  }
  private fit():void{const points=BUS_LOCATIONS_MOCK.features.map(p=>L.latLng(p.geometry.coordinates[1],p.geometry.coordinates[0]));const {clientWidth:width,clientHeight:height}=this.canvas.nativeElement;this.map?.fitBounds(L.latLngBounds(points),{paddingTopLeft:width>850?[width*.57,45]:[30,25],paddingBottomRight:width>850?[45,45]:[30,Math.max(30,height-190)],maxZoom:13});}
  ngOnDestroy():void{this.observer?.disconnect();this.map?.remove();}
}
