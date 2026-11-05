export interface SeatPosition {row:string;col:string;}
export interface SeatPlanRow<T extends SeatPosition> {label:string;slots:Array<T|null>;}
export function buildSeatRows<T extends SeatPosition>(seats:T[]):SeatPlanRow<T>[]{
  const groups=new Map<string,T[]>();
  for(const seat of seats){const row=String(seat.row??'').trim()||'Sin fila';groups.set(row,[...(groups.get(row)??[]),seat]);}
  const columns=[...new Set(seats.map(s=>String(s.col??'').trim().toUpperCase()))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const zeroBased=columns.includes('0');
  const position=(seat:T):number=>{const col=String(seat.col??'').trim().toUpperCase();if(/^[A-D]$/.test(col))return col.charCodeAt(0)-65;if(/^\d+$/.test(col)){const value=Number(col)-(zeroBased?0:1);if(value>=0&&value<4)return value;}return columns.indexOf(col);};
  const result:SeatPlanRow<T>[]=[];
  for(const [label,group] of [...groups].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}))){
    let slots:Array<T|null>=[null,null,null,null],part=1;
    for(const seat of group.sort((a,b)=>String(a.col).localeCompare(String(b.col),undefined,{numeric:true}))){
      if(slots.every(Boolean)){result.push({label:part===1?label:label+' · '+part,slots});slots=[null,null,null,null];part++;}
      const preferred=position(seat),slot=preferred>=0&&preferred<4&&!slots[preferred]?preferred:slots.findIndex(s=>s===null);slots[slot]=seat;
    }
    result.push({label:part===1?label:label+' · '+part,slots});
  }
  return result;
}
