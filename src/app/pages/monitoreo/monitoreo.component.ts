import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { ADMIN_MONITORING_DEMO } from './monitoring-demo.data';
import { GpsSample, MonitoredTrip, gpsAt, gpsTrace, orderedGps, sampledDistanceKm, seatSnapshots } from './monitoring.model';

@Component({standalone:true,imports:[CommonModule,FormsModule,RouterLink],templateUrl:'./monitoreo.component.html',styleUrls:['./monitoring-hud.component.css','./monitoreo.component.css','./monitoring-seats.component.css','./monitoring-map.component.css']})
export class MonitoreoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer',{static:true}) private mapContainer!:ElementRef<HTMLDivElement>;
  constructor(private activatedRoute:ActivatedRoute){}
  get contextTripId():number|null{const raw=this.activatedRoute?.snapshot.queryParamMap.get('trip');const value=Number(raw);return raw&&/^[1-9]\d*$/.test(raw)&&Number.isSafeInteger(value)?value:null;}
  readonly trips=ADMIN_MONITORING_DEMO;
  selectedId=this.trips[0].id;sampleIndex=orderedGps(this.trips[0]).length-1;selectedSeat=1;showTrace=true;tileError=false;
  private map?:L.Map;private overlays?:L.LayerGroup;private tiles?:L.TileLayer;private resizeObserver?:ResizeObserver;
  get trip():MonitoredTrip{return this.trips.find(t=>t.id===this.selectedId)??this.trips[0];}
  get samples():GpsSample[]{return orderedGps(this.trip);}
  get current():GpsSample{return this.samples[this.sampleIndex]??this.samples[0];}
  get visibleSamples():GpsSample[]{return this.samples.slice(0,this.sampleIndex+1);}
  get seats(){return seatSnapshots(this.trip,this.current.properties.time_stamp);}
  get seatRows(){const seats=this.seats;return Array.from({length:Math.ceil(seats.length/4)},(_,i)=>Array.from({length:4},(_,column)=>seats[i*4+column]??null));}
  get occupied(){return this.seats.filter(s=>s.state==='occupied').length;}
  get free(){return this.seats.filter(s=>s.state==='free').length;}
  get unknown(){return this.seats.filter(s=>s.state==='unknown').length;}
  get progressPercent():number{return this.samples.length>1?this.sampleIndex/(this.samples.length-1)*100:0;}
  get progressLabel():string{return 'Muestra '+(this.sampleIndex+1)+' de '+this.samples.length;}
  get distance(){return sampledDistanceKm(this.visibleSamples);}
  get coordinateLabel(){const [longitude,latitude]=this.current.geometry.coordinates;return latitude.toFixed(5)+', '+longitude.toFixed(5);}
  get seat(){return this.seats.find(s=>s.number===this.selectedSeat)??this.seats[0];}
  get seatHistory(){return this.trip.readings.filter(r=>r.seat===this.selectedSeat&&r.trip===this.trip.id&&Date.parse(r.time_stamp)<=Date.parse(this.current.properties.time_stamp)).sort((a,b)=>Date.parse(b.time_stamp)-Date.parse(a.time_stamp));}
  stateLabel(state:string):string{return ({occupied:'Ocupado',free:'Libre',unknown:'Sin señal'} as Record<string,string>)[state]??state;}
  ngAfterViewInit():void{
    this.map=L.map(this.mapContainer.nativeElement,{scrollWheelZoom:false});this.map.zoomControl.setPosition('bottomright');
    const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
    tiles.on('loading',()=>{this.tileError=false;});tiles.on('tileerror',()=>{this.tileError=true;});tiles.addTo(this.map);this.tiles=tiles;
    this.overlays=L.layerGroup().addTo(this.map);this.redraw();this.fitRoute();
    this.resizeObserver=new ResizeObserver(()=>this.map?.invalidateSize());this.resizeObserver.observe(this.mapContainer.nativeElement);
  }
  selectTrip(id:string):void{if(!this.trips.some(t=>t.id===id))return;this.selectedId=id;this.sampleIndex=this.samples.length-1;this.selectedSeat=1;this.redraw();this.fitRoute();}
  setSample(value:number|string):void{const index=Number(value);if(!Number.isInteger(index))return;this.sampleIndex=Math.max(0,Math.min(index,this.samples.length-1));this.redraw();}
  selectSeat(number:number):void{if(number>=1&&number<=this.trip.capacity)this.selectedSeat=number;}
  traceChanged():void{this.redraw();}
  private busIcon(selected:boolean):L.DivIcon{
    const badge=document.createElement('span');badge.className='fleet-map-bus'+(selected?' is-selected':'');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
    for(const [name,attributes] of [['rect',{x:'5',y:'3',width:'14',height:'16',rx:'3'}],['path',{d:'M5 11h14M8 6h8M8 15h1m6 0h1M7 19v2m10-2v2'}]] as const){const shape=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [key,value] of Object.entries(attributes))shape.setAttribute(key,value);svg.appendChild(shape);}
    badge.appendChild(svg);return L.divIcon({html:badge,className:'fleet-map-marker',iconSize:[selected?38:30,selected?38:30],iconAnchor:[selected?19:15,selected?19:15],tooltipAnchor:[0,-20]});
  }
  private redraw():void{
    if(!this.map||!this.overlays)return;this.overlays.clearLayers();
    const trace=gpsTrace(this.visibleSamples);
    if(this.showTrace&&trace){
      L.geoJSON(trace,{style:{color:'#fff',weight:12,opacity:.9,lineCap:'round',lineJoin:'round'}}).addTo(this.overlays);
      L.geoJSON(trace,{style:{color:'#1268de',weight:7,opacity:1,lineCap:'round',lineJoin:'round'}}).addTo(this.overlays);
      L.geoJSON(trace,{style:{color:'#b5d8ff',weight:2,opacity:.9,dashArray:'7 13',lineCap:'round'}}).addTo(this.overlays);
    }
    if(this.showTrace)for(const [index,point] of this.visibleSamples.entries()){
      const caption=document.createElement('span');caption.textContent=(index===0?'Inicio del registro':'Muestra '+point.properties.id)+' · '+new Date(point.properties.time_stamp).toLocaleTimeString('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit',hour12:false});
      L.geoJSON(point,{pointToLayer:(_feature,latlng)=>L.circleMarker(latlng,{radius:index===0?7:4,color:'#fff',weight:2,fillColor:index===0?'#15a875':'#1268de',fillOpacity:1}),onEachFeature:(_feature,layer)=>layer.bindTooltip(caption,{direction:'top',className:'fleet-point-tooltip'})}).addTo(this.overlays);
    }
    // Buses are added last so the current unit stays above the route and GPS points.
    for(const trip of [...this.trips].sort((a,b)=>Number(a.id===this.trip.id)-Number(b.id===this.trip.id))){
      const selected=trip.id===this.trip.id,sample=gpsAt(trip,this.current.properties.time_stamp);if(!sample)continue;
      const label=document.createElement('span');label.textContent='Unidad demo '+trip.unit+' · '+trip.plate;
      L.geoJSON(sample,{pointToLayer:(_feature,latlng)=>L.marker(latlng,{icon:this.busIcon(selected),title:'Unidad demo '+trip.unit,alt:'Unidad demo '+trip.unit,zIndexOffset:selected?1000:0}),onEachFeature:(_feature,layer)=>{layer.bindTooltip(label,{permanent:selected,direction:'top',className:'fleet-bus-tooltip'});layer.on('click',()=>this.selectTrip(trip.id));}}).addTo(this.overlays);
    }
  }
  fitRoute():void{if(!this.map)return;const points=this.visibleSamples.map(point=>L.latLng(point.geometry.coordinates[1],point.geometry.coordinates[0]));if(points.length)this.map.fitBounds(L.latLngBounds(points),{paddingTopLeft:[45,100],paddingBottomRight:[55,105],maxZoom:14});}
  fitFleet():void{if(!this.map)return;const points=this.trips.map(trip=>gpsAt(trip,this.current.properties.time_stamp)).filter((p):p is GpsSample=>!!p).map(p=>L.latLng(p.geometry.coordinates[1],p.geometry.coordinates[0]));this.map.fitBounds(L.latLngBounds(points),{paddingTopLeft:[45,100],paddingBottomRight:[55,105],maxZoom:13});}
  retryTiles():void{this.tileError=false;this.tiles?.redraw();}
  ngOnDestroy():void{this.resizeObserver?.disconnect();this.map?.remove();}
}
