import type { Feature, LineString, Point } from 'geojson';

export interface GpsSampleProperties { id:number;trip:string;time_stamp:string;speed:number; }
export type GpsSample=Feature<Point,GpsSampleProperties>;
export interface SeatReading {id:number;trip:string;seat:number;time_stamp:string;occupied:boolean;}
export interface MonitoredTrip {id:string;unit:string;plate:string;origin:string;destination:string;capacity:number;device:string;gps:GpsSample[];readings:SeatReading[];}
export type SensorState='occupied'|'free'|'unknown';
export interface SeatSnapshot {number:number;label:string;state:SensorState;lastReading:SeatReading|null;}
export const SENSOR_MAX_AGE_MS=2*60*1000;

export function orderedGps(trip:MonitoredTrip):GpsSample[]{
  return trip.gps.filter(point=>{
    if(point?.geometry?.type!=='Point'||!Array.isArray(point.geometry.coordinates)||point.properties?.trip!==trip.id)return false;
    const [lon,lat]=point.geometry.coordinates;
    return point.geometry.type==='Point'&&Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=90&&Number.isFinite(Date.parse(point.properties.time_stamp));
  }).sort((a,b)=>Date.parse(a.properties.time_stamp)-Date.parse(b.properties.time_stamp));
}
export function gpsAt(trip:MonitoredTrip,at:string):GpsSample|undefined{return orderedGps(trip).filter(point=>Date.parse(point.properties.time_stamp)<=Date.parse(at)).at(-1);}
export function gpsTrace(samples:GpsSample[]):Feature<LineString>|null {
  if(samples.length<2)return null;
  return {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:samples.map(sample=>[...sample.geometry.coordinates])}};
}
export function seatSnapshots(trip:MonitoredTrip,at:string):SeatSnapshot[]{
  const time=Date.parse(at);
  return Array.from({length:trip.capacity},(_,index)=>{
    const number=index+1;
    const lastReading=trip.readings.filter(r=>r.trip===trip.id&&r.seat===number&&typeof r.occupied==='boolean'&&Date.parse(r.time_stamp)<=time).sort((a,b)=>Date.parse(b.time_stamp)-Date.parse(a.time_stamp))[0]??null;
    const fresh=!!lastReading&&time-Date.parse(lastReading.time_stamp)<=SENSOR_MAX_AGE_MS;
    return {number,label:String(number).padStart(2,'0'),state:fresh?(lastReading.occupied?'occupied':'free'):'unknown',lastReading};
  });
}
export function sampledDistanceKm(samples:GpsSample[]):number {
  let distance=0;const radians=(value:number)=>value*Math.PI/180;
  for(let i=1;i<samples.length;i++){
    const [lon1,lat1]=samples[i-1].geometry.coordinates,[lon2,lat2]=samples[i].geometry.coordinates;
    const a=Math.sin(radians(lat2-lat1)/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(radians(lon2-lon1)/2)**2;
    distance+=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
  }return distance;
}
