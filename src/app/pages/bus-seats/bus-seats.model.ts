import { buildSeatRows } from '../../core/utils/seat-plan';
﻿import { AdminSeat, AdminSeatReading } from '../../core/services/admin-seats.service';
export function buildAdminSeatRows(seats:AdminSeat[]):Array<{label:string;slots:Array<AdminSeat|null>}>{return buildSeatRows(seats);}

export function latestSeatReading(readings:AdminSeatReading[],trip:number,seat:number):AdminSeatReading|null {
  return readings.filter(r=>r.trip===trip&&r.seat===seat&&typeof r.occupied==='boolean'&&Number.isFinite(Date.parse(r.time_stamp))).sort((a,b)=>Date.parse(b.time_stamp)-Date.parse(a.time_stamp))[0]??null;
}
export function adminSeatError(err:{status?:number;error?:unknown}):string {
  const code=err.status??0;
  return code===0?'No se recibió respuesta del servidor.':code===401?'La sesión administrativa venció.':code===403?'No tienes permisos para consultar esta información.':code===404?'El recurso solicitado no existe (HTTP 404).':'No se pudo consultar la información (HTTP '+code+').';
}
