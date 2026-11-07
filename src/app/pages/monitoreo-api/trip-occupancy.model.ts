import type { AdminSeat, AdminSeatReading } from '../../core/services/admin-seats.service';
export const SENSOR_DISPLAY_MAX_AGE_MS=120000;
export interface SensorSnapshot {seat:AdminSeat;state:'occupied'|'free'|'unknown';last:AdminSeatReading|null;reason:'fresh'|'missing'|'stale'|'conflict';}
export function sensorSnapshots(seats:AdminSeat[],readings:AdminSeatReading[],trip:number,at:string):SensorSnapshot[]{
  const cutoff=Date.parse(at),ids=new Set(seats.map(seat=>seat.id));const latest=new Map<number,{reading:AdminSeatReading;time:number;conflict:boolean}>();
  for(const reading of readings){const time=Date.parse(reading.time_stamp);if(reading.trip!==trip||!ids.has(reading.seat)||typeof reading.occupied!=='boolean'||!Number.isFinite(time)||time>cutoff)continue;const previous=latest.get(reading.seat);if(!previous||time>previous.time)latest.set(reading.seat,{reading,time,conflict:false});else if(time===previous.time&&reading.occupied!==previous.reading.occupied)previous.conflict=true;}
  return seats.map(seat=>{const value=latest.get(seat.id);if(!value||!Number.isFinite(cutoff))return {seat,state:'unknown',last:null,reason:'missing'};if(value.conflict)return {seat,state:'unknown',last:value.reading,reason:'conflict'};if(cutoff-value.time>SENSOR_DISPLAY_MAX_AGE_MS)return {seat,state:'unknown',last:value.reading,reason:'stale'};return {seat,state:value.reading.occupied?'occupied':'free',last:value.reading,reason:'fresh'};});
}
