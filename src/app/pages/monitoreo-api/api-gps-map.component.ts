import type { Feature, LineString } from 'geojson';
import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { ApiGpsReading } from './api-gps.model';
@Component({selector:'app-api-gps-map',standalone:true,imports:[CommonModule],styleUrls:['../monitoreo/monitoring-map.component.css'],template:`<div #canvas class="api-gps-map" aria-label="Mapa de referencia y lecturas GPS consultadas en la API"></div><p *ngIf="tileError" role="alert">No se pudo cargar el mapa base. Las lecturas siguen disponibles en la tabla. <button type="button" (click)="retry()">Reintentar mapa</button></p>`,styles:[`.api-gps-map{height:535px;background:#edf2f8;z-index:0}p{font-size:12px;color:#95601e;line-height:1.7;padding:12px}button{min-height:44px;padding:10px;border:1px solid #cfdbec;border-radius:8px;background:white}@media(max-width:850px){.api-gps-map{height:470px}}@media(max-width:600px){.api-gps-map{height:360px}}`]})
export class ApiGpsMapComponent implements AfterViewInit,OnChanges,OnDestroy {
  @Input() readings:ApiGpsReading[]=[];@Input() selectedId:number|null=null;@Input() showTrace=true;@Input() boundsReadings:ApiGpsReading[]|null=null;@Input() unitLabel='Unidad seleccionada';@ViewChild('canvas',{static:true}) canvas!:ElementRef<HTMLDivElement>;
  tileError=false;private map?:L.Map;private layers?:L.LayerGroup;private tiles?:L.TileLayer;private observer?:ResizeObserver;
  ngAfterViewInit():void{this.map=L.map(this.canvas.nativeElement,{scrollWheelZoom:false}).setView([4.57,-74.3],5);this.map.zoomControl.setPosition('bottomright');this.tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(this.map);this.tiles.on('tileerror',()=>this.tileError=true);this.layers=L.layerGroup().addTo(this.map);this.observer=new ResizeObserver(()=>this.map?.invalidateSize());this.observer.observe(this.canvas.nativeElement);this.draw();this.recenter();}
  ngOnChanges(changes:SimpleChanges):void{this.draw();if(changes['boundsReadings'])this.fit(this.boundsReadings??this.readings);else if(changes['readings']&&!this.boundsReadings)this.recenter();}
  private draw():void{
    if(!this.map||!this.layers)return;this.layers.clearLayers();const points=this.readings.map(row=>L.latLng(row.reading_point.coordinates[1],row.reading_point.coordinates[0]));if(!points.length){this.map.setView([4.57,-74.3],5);return;}
    const trace={type:'Feature',properties:{},geometry:{type:'LineString',coordinates:this.readings.map(row=>row.reading_point.coordinates)}} as Feature<LineString>;
    if(this.showTrace&&points.length>1){
      L.geoJSON(trace,{style:{color:'#fff',weight:12,opacity:.9,lineCap:'round',lineJoin:'round'}}).addTo(this.layers);
      L.geoJSON(trace,{style:{color:'#1268de',weight:7,opacity:1,lineCap:'round',lineJoin:'round'}}).addTo(this.layers);
      L.geoJSON(trace,{style:{color:'#b5d8ff',weight:2,opacity:.9,dashArray:'7 13',lineCap:'round'}}).addTo(this.layers);
    }
    if(this.showTrace)this.readings.forEach((row,index)=>{const text=document.createElement('span');text.textContent=(index===0?'Inicio del registro':'Lectura #'+row.id)+' · '+new Date(row.time_stamp).toLocaleTimeString('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit',hour12:false});L.circleMarker(points[index],{radius:index===0?7:4,color:'#fff',weight:2,fillColor:index===0?'#15a875':'#1268de',fillOpacity:1}).bindTooltip(text,{direction:'top',className:'fleet-point-tooltip'}).addTo(this.layers!);});
    const selected=this.readings.find(row=>row.id===this.selectedId)??this.readings.at(-1);if(!selected)return;
    const label=document.createElement('span');label.textContent=this.unitLabel;
    const icon=L.divIcon({className:'fleet-map-marker',iconSize:[38,38],iconAnchor:[19,19],tooltipAnchor:[0,-20],html:'<span class="fleet-map-bus is-selected"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 6h8M8 15h1m6 0h1M7 19v2m10-2v2"/></svg></span>'});
    L.marker([selected.reading_point.coordinates[1],selected.reading_point.coordinates[0]],{icon,title:this.unitLabel,alt:this.unitLabel,zIndexOffset:1000}).bindTooltip(label,{permanent:true,direction:'top',className:'fleet-bus-tooltip'}).addTo(this.layers);
  }
  private fit(readings:ApiGpsReading[]):void{if(!this.map)return;const points=readings.map(row=>L.latLng(row.reading_point.coordinates[1],row.reading_point.coordinates[0]));if(points.length)this.map.fitBounds(L.latLngBounds(points),{paddingTopLeft:[45,100],paddingBottomRight:[55,105],maxZoom:14});}
  recenter():void{this.fit(this.readings);}
  centerUnit():void{const row=this.readings.find(reading=>reading.id===this.selectedId)??this.readings.at(-1);if(row)this.map?.setView([row.reading_point.coordinates[1],row.reading_point.coordinates[0]],14);}
  retry():void{this.tileError=false;this.tiles?.redraw();}
  ngOnDestroy():void{this.observer?.disconnect();this.map?.remove();}
}
