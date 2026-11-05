import { AdminSeat, AdminSeatReading } from '../../core/services/admin-seats.service';
export function buildAdminSeatRows(seats:AdminSeat[]):Array<{label:string;slots:Array<AdminSeat|null>}> {
  const groups=new Map<string,AdminSeat[]>();for(const seat of seats){const key=String(seat.row??'').trim()||'Sin fila';groups.set(key,[...(groups.get(key)??[]),seat]);}
  const zeroBased=seats.some(s=>String(s.col)==='0');
  const result:Array<{label:string;slots:Array<AdminSeat|null>}>=[];
  for(const [label,group] of [...groups].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}))){
    let slots:Array<AdminSeat|null>=[null,null,null,null],part=1;
    for(const seat of [...group].sort((a,b)=>String(a.col).localeCompare(String(b.col),undefined,{numeric:true}))){
      if(slots.every(Boolean)){result.push({label:part===1?label:label+' · '+part,slots});slots=[null,null,null,null];part++;}
      const col=String(seat.col??'').toUpperCase();const preferred=/^[A-D]$/.test(col)?col.charCodeAt(0)-65:/^\d+$/.test(col)?Number(col)-(zeroBased?0:1):-1;
      const index=preferred>=0&&preferred<4&&!slots[preferred]?preferred:slots.findIndex(s=>s===null);slots[index]=seat;
    }result.push({label:part===1?label:label+' · '+part,slots});
  }return result;
}
export function latestSeatReading(readings:AdminSeatReading[],trip:number,seat:number):AdminSeatReading|null {
  return readings.filter(r=>r.trip===trip&&r.seat===seat&&typeof r.occupied==='boolean'&&Number.isFinite(Date.parse(r.time_stamp))).sort((a,b)=>Date.parse(b.time_stamp)-Date.parse(a.time_stamp))[0]??null;
}
export function adminSeatError(err:{status?:number;error?:unknown}):string {
  const code=err.status??0;
  return code===0?'No se recibió respuesta del servidor.':code===401?'La sesión administrativa venció.':code===403?'No tienes permisos para consultar esta información.':code===404?'El recurso solicitado no existe (HTTP 404).':'No se pudo consultar la información (HTTP '+code+').';
}
