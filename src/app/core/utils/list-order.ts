export type ListOrder='desc'|'asc';
export function orderRecords<T extends {id?:number;created_at?:string}>(records:readonly T[],direction:ListOrder):T[]{
  const byDate=records.length>0&&records.every(record=>typeof record.created_at==='string'&&Number.isFinite(Date.parse(record.created_at)));
  const multiplier=direction==='asc'?1:-1;
  return [...records].sort((a,b)=>multiplier*((byDate?Date.parse(a.created_at!)-Date.parse(b.created_at!):0)||((a.id??0)-(b.id??0))));
}
