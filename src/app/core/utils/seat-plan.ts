export interface SeatPosition {row:string;col:string;seat_number?:string;id?:number;}
export interface SeatPlanRow<T extends SeatPosition> {label:string;slots:Array<T|null>;}
const normalized=(value:unknown):string=>{const text=String(value??'').trim().toUpperCase();return /^\d+$/.test(text)?text.replace(/^0+(?=\d)/,''):text;};
function columnIndex(value:unknown,zeroBased:boolean):number {const text=String(value??'').trim().toUpperCase();if(/^[A-D]$/.test(text))return text.charCodeAt(0)-65;if(/^\d+$/.test(text)){const position=Number(text)-(zeroBased?0:1);if(position>=0&&position<4)return position;}return -1;}
export function seatPlanIssues<T extends SeatPosition>(seats:readonly T[],capacity?:number):string[]{
  const issues:string[]=[],numbers=new Map<string,T>(),positions=new Map<string,T>(),ids=new Set<number>();const zeroBased=seats.some(seat=>String(seat.col).trim()==='0');
  if(capacity!==undefined&&seats.length>capacity)issues.push('La API devuelve '+seats.length+' sillas para un bus de '+capacity+' plazas.');
  for(const seat of seats){
    if(seat.id!==undefined){if(ids.has(seat.id))issues.push('El ID de silla '+seat.id+' está repetido.');ids.add(seat.id);}
    if(seat.seat_number!==undefined){const number=normalized(seat.seat_number),previous=numbers.get(number);if(!number)issues.push('Hay una silla sin número.');else if(previous)issues.push('Numeración duplicada: '+previous.seat_number+' (ID '+(previous.id??'—')+') y '+seat.seat_number+' (ID '+(seat.id??'—')+').');else numbers.set(number,seat);}
    const row=normalized(seat.row),column=columnIndex(seat.col,zeroBased);if(!row||column<0){issues.push('La silla '+(seat.seat_number??seat.id??'—')+' no tiene una fila/columna válida para 2 + pasillo + 2.');continue;}
    const key=row+':'+column,previous=positions.get(key);if(previous)issues.push('Posición repetida en fila '+row+', columna '+(column+1)+': sillas '+(previous.seat_number??previous.id)+' y '+(seat.seat_number??seat.id)+'.');else positions.set(key,seat);
  }
  return [...new Set(issues)];
}
export function buildSeatRows<T extends SeatPosition>(seats:T[]):SeatPlanRow<T>[]{
  if(seatPlanIssues(seats).length)return [];
  const groups=new Map<string,SeatPlanRow<T>>(),zeroBased=seats.some(seat=>String(seat.col).trim()==='0');
  for(const seat of seats){const label=normalized(seat.row);if(!groups.has(label))groups.set(label,{label,slots:[null,null,null,null]});groups.get(label)!.slots[columnIndex(seat.col,zeroBased)]=seat;}
  return [...groups.values()].sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}));
}
