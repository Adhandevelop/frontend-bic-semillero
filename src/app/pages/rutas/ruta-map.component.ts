import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import type * as Leaflet from 'leaflet';
import type { Feature, LineString, Point } from 'geojson';
import { Ruta } from '../../core/models/ruta.model';

export function validRoutePoint(point:Point|undefined):point is Point {
  return point?.type==='Point'&&Array.isArray(point.coordinates)&&point.coordinates.length>=2&&Number.isFinite(point.coordinates[0])&&Number.isFinite(point.coordinates[1])&&Math.abs(point.coordinates[0])<=180&&Math.abs(point.coordinates[1])<=90;
}
@Component({selector:'app-ruta-map',standalone:true,template:'<div #mapContainer class="route-map" aria-label="Mapa de terminales de la ruta seleccionada"></div><p class="map-note" role="status">{{ message }}</p>',styles:[':host{display:block}.route-map{height:240px;border-radius:10px;background:#eff4ff;position:relative;isolation:isolate}.map-note{font-size:10px;color:#717786;line-height:1.7;margin:10px 0 0}']})
export class RutaMapComponent implements AfterViewInit,OnChanges,OnDestroy {
  @Input() route:Ruta|null=null;
  @ViewChild('mapContainer',{static:true}) private container!:ElementRef<HTMLDivElement>;
  message='Cargando mapa...';
  private api?:typeof Leaflet;private map?:Leaflet.Map;private layers?:Leaflet.LayerGroup;private observer?:ResizeObserver;private destroyed=false;
  async ngAfterViewInit():Promise<void>{
    try{
      const api=await import('leaflet');if(this.destroyed)return;this.api=api;
      this.map=api.map(this.container.nativeElement,{scrollWheelZoom:false}).setView([4.7,-74.1],5);
      const tiles=api.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
      tiles.on('tileerror',()=>{this.message='No se pudo cargar el mapa base. Revisa tu conexión a internet.';});tiles.addTo(this.map);this.layers=api.layerGroup().addTo(this.map);
      this.observer=new ResizeObserver(()=>this.map?.invalidateSize());this.observer.observe(this.container.nativeElement);this.render();
    }catch{if(!this.destroyed)this.message='No se pudo iniciar el mapa.';}
  }
  ngOnChanges():void{this.render();}
  private render():void{
    const api=this.api,map=this.map;if(!api||!map||!this.layers)return;this.layers.clearLayers();
    const origin=this.route?.origen_punto,destination=this.route?.destino_punto;
    const points:Array<{point:Point;label:string}>=[];
    if(validRoutePoint(origin))points.push({point:origin,label:'Origen: '+this.route!.origen});
    if(validRoutePoint(destination))points.push({point:destination,label:'Destino: '+this.route!.destino});
    for(const item of points){const label=document.createElement('span');label.textContent=item.label;api.geoJSON({type:'Feature',geometry:item.point,properties:{}} as Feature<Point>,{pointToLayer:(_f,latlng)=>api.circleMarker(latlng,{radius:7,color:'#fff',weight:2,fillColor:'#0059bb',fillOpacity:1})}).bindTooltip(label).addTo(this.layers);}
    if(points.length===2){api.geoJSON({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:points.map(item=>item.point.coordinates)}} as Feature<LineString>,{style:{color:'#0059bb',weight:3,dashArray:'5 6'}}).addTo(this.layers);this.message='Conexión entre terminales; no representa el trazado de la carretera ni GPS en vivo.';}
    else this.message=points.length?'Solo una terminal tiene coordenadas válidas.':'Sin coordenadas de terminales para esta ruta.';
    if(points.length)map.fitBounds(api.latLngBounds(points.map(item=>api.latLng(item.point.coordinates[1],item.point.coordinates[0]))),{padding:[30,30],maxZoom:12});else map.setView([4.7,-74.1],5);
  }
  ngOnDestroy():void{this.destroyed=true;this.observer?.disconnect();this.map?.remove();}
}
