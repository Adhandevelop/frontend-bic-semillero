import { AdminAvailability } from '../../../core/services/admin-seats.service';
export interface DashboardTrip {id:number;bus:number;driver:number;route:number;date_time_start:string;trip_state:string;}
export interface AvailabilitySummary {available:number;reserved:number;sold:number;total:number;serverTime:string;}
export function summarizeAvailability(data:AdminAvailability,trip:number):AvailabilitySummary {
  if(!data||data.trip!==trip||!Array.isArray(data.seats)||!Number.isFinite(Date.parse(data.server_time)))throw new Error('La disponibilidad no corresponde al viaje.');
  const ids=new Set<number>();let available=0,reserved=0,sold=0;
  for(const seat of data.seats){if(!Number.isSafeInteger(seat.id)||seat.id<1||ids.has(seat.id)||!['available','reserved','sold'].includes(seat.status))throw new Error('La disponibilidad está incompleta.');ids.add(seat.id);if(seat.status==='available')available++;else if(seat.status==='reserved')reserved++;else sold++;}
  return {available,reserved,sold,total:data.seats.length,serverTime:data.server_time};
}
export function colombianDay(value:string):string {const time=Date.parse(value);return Number.isFinite(time)?new Date(time-5*3600000).toISOString().slice(0,10):'';}
