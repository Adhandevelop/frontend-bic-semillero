import type { Point } from 'geojson';
export interface ApiGpsReading {id:number;trip:number;time_stamp:string;created_at?:string|null;speed:number|string;reading_point:Point;}
export function validatedReadings(rows:ApiGpsReading[],trip:number):ApiGpsReading[]{
  const ids=new Set<number>();return rows.filter(row=>{if(!row||typeof row!=='object')return false;const point=row.reading_point;if(row.trip!==trip||!Number.isSafeInteger(row.id)||row.id<1||ids.has(row.id)||point?.type!=='Point'||!Array.isArray(point.coordinates)||!Number.isFinite(Date.parse(row.time_stamp)))return false;const[lon,lat]=point.coordinates;if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)return false;ids.add(row.id);return true;}).sort((a,b)=>Date.parse(a.time_stamp)-Date.parse(b.time_stamp)||a.id-b.id);
}
