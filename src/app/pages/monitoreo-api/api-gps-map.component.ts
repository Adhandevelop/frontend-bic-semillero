import type { Feature, LineString } from 'geojson';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { ApiGpsReading } from './api-gps.model';
@Component({selector:'app-api-gps-map',standalone:true,imports:[CommonModule],template:`<div #canvas class="api-gps-map" aria-label="Mapa de las lecturas GPS consultadas en la API"></div><p *ngIf="tileError" role="alert">No se pudo cargar el mapa base. Las lecturas siguen disponibles en la tabla. <button type="button" (click)="retry()">Reintentar mapa</button></p>`,styles:[`.api-gps-map{height:420px;border-radius:12px;background:#edf3fa}p{font-size:12px;color:#95601e;line-height:1.7}button{min-height:44px;padding:10px;border:1px solid #cfdbec;border-radius:8px;background:white}@media(max-width:600px){.api-gps-map{height:310px}}`]})
export class ApiGpsMapComponent implements AfterViewInit,OnChanges,OnDestroy {
  @Input() readings:ApiGpsReading[]=[];@ViewChild('canvas',{static:true}) canvas!:ElementRef<HTMLDivElement>;
  tileError=false;private map?:L.Map;private layers?:L.LayerGroup;private tiles?:L.TileLayer;private observer?:ResizeObserver;
  ngAfterViewInit():void{this.map=L.map(this.canvas.nativeElement,{scrollWheelZoom:false});this.tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(this.map);this.tiles.on('tileerror',()=>this.tileError=true);this.layers=L.layerGroup().addTo(this.map);this.observer=new ResizeObserver(()=>this.map?.invalidateSize());this.observer.observe(this.canvas.nativeElement);this.draw();}
  ngOnChanges():void{this.draw();}
  private draw():void{if(!this.map||!this.layers)return;this.layers.clearLayers();const points=this.readings.map(row=>L.latLng(row.reading_point.coordinates[1],row.reading_point.coordinates[0]));if(!points.length)return;if(points.length>1)L.geoJSON({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:this.readings.map(row=>row.reading_point.coordinates)}} as Feature<LineString>,{style:{color:'#1769cc',weight:5}}).addTo(this.layers);this.readings.forEach((row,index)=>{const text=document.createElement('span');text.textContent='Lectura #'+row.id+' · '+new Date(row.time_stamp).toLocaleString('es-CO',{timeZone:'America/Bogota'});L.circleMarker(points[index],{radius:index===points.length-1?9:4,color:'#fff',weight:2,fillColor:index===points.length-1?'#0758b8':'#73a8e6',fillOpacity:1}).bindTooltip(text).addTo(this.layers!);});this.map.fitBounds(L.latLngBounds(points),{padding:[30,30],maxZoom:14});}
  retry():void{this.tileError=false;this.tiles?.redraw();}
  ngOnDestroy():void{this.observer?.disconnect();this.map?.remove();}
}
