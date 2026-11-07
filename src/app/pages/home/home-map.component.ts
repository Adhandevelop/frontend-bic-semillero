import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { Feature, LineString } from 'geojson';

// Composition for the home preview only: fixed simulated positions, never API telemetry.
const HOME_BUS_POINTS:[number,number][]=[[-74.17,4.708],[-74.02,4.72],[-74.015,4.69]];
const HOME_TRACE:Feature<LineString>={type:'Feature',properties:{source:'demonstration'},geometry:{type:'LineString',coordinates:[[-74.185,4.688],[-74.18,4.693],[-74.18,4.702],[-74.17,4.702],HOME_BUS_POINTS[0]]}};

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
    L.geoJSON(HOME_TRACE,{interactive:false,style:{color:'#fff',weight:11,opacity:.95,lineCap:'round',lineJoin:'round'}}).addTo(this.map);
    L.geoJSON(HOME_TRACE,{interactive:false,style:{color:'#1268de',weight:6,opacity:1,lineCap:'round',lineJoin:'round'}}).addTo(this.map);
    L.geoJSON(HOME_TRACE,{interactive:false,style:{color:'#b5d8ff',weight:2,opacity:.9,dashArray:'7 13',lineCap:'round'}}).addTo(this.map);
    for(const [longitude,latitude] of HOME_BUS_POINTS){
      const icon=L.divIcon({className:'fleet-map-marker',iconSize:[38,38],iconAnchor:[19,19],html:'<span class="fleet-map-bus is-selected"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 6h8M8 15h1m6 0h1M7 19v2m10-2v2"/></svg></span>'});
      L.marker([latitude,longitude],{icon,interactive:false,keyboard:false,alt:'Bus de demostración'}).addTo(this.map);
    }
    this.fit();this.observer=new ResizeObserver(()=>{this.map?.invalidateSize();this.fit();});this.observer.observe(this.canvas.nativeElement);
  }
  private fit():void{const points=[...HOME_BUS_POINTS,...HOME_TRACE.geometry.coordinates].map(p=>L.latLng(p[1],p[0]));const {clientWidth:width,clientHeight:height}=this.canvas.nativeElement;this.map?.fitBounds(L.latLngBounds(points),{paddingTopLeft:width>850?[45,45]:[30,25],paddingBottomRight:width>850?[45,45]:[30,Math.max(30,height-190)],maxZoom:13});}
  ngOnDestroy():void{this.observer?.disconnect();this.map?.remove();}
}
