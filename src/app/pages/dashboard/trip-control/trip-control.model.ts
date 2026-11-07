import { TripSalesMetadata } from '../../../core/utils/trip-sales';
import { seatPlanIssues } from '../../../core/utils/seat-plan';
﻿import { AdminAvailability } from '../../../core/services/admin-seats.service';
export interface DashboardTrip extends TripSalesMetadata {id:number;bus:number;driver:number;route:number;date_time_start:string;trip_state:string;}
export interface AvailabilitySummary {available:number;reserved:number;sold:number;total:number;serverTime:string;}
export function summarizeAvailability(data:AdminAvailability,trip:number,capacity?:number):AvailabilitySummary {
  if(!data||data.trip!==trip||!Array.isArray(data.seats)||!Number.isFinite(Date.parse(data.server_time)))throw new Error('La disponibilidad no corresponde al viaje.');
  if(capacity!==undefined&&data.seats.length>capacity)throw new Error('La API devuelve '+data.seats.length+' sillas para un bus de '+capacity+' plazas.');
  if(data.seats.some(seat=>seat.seat_number!==undefined||seat.row!==undefined||seat.col!==undefined)){const issues=seatPlanIssues(data.seats.map(seat=>({...seat,row:seat.row??'',col:seat.col??''})));if(issues.length)throw new Error(issues[0]);}
  const ids=new Set<number>();let available=0,reserved=0,sold=0;
  for(const seat of data.seats){if(!Number.isSafeInteger(seat.id)||seat.id<1||ids.has(seat.id)||!['available','reserved','sold'].includes(seat.status))throw new Error('La disponibilidad está incompleta.');ids.add(seat.id);if(seat.status==='available')available++;else if(seat.status==='reserved')reserved++;else sold++;}
  return {available,reserved,sold,total:data.seats.length,serverTime:data.server_time};
}
export function colombianDay(value:string):string {const time=Date.parse(value);return Number.isFinite(time)?new Date(time-5*3600000).toISOString().slice(0,10):'';}
