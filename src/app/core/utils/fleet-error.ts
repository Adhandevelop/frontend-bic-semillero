export function fleetError(err:{status?:number;error?:unknown;name?:string},action:string):string {
  const status=err.status,body=err.error;
  if(err.name==='TimeoutError')return 'No se pudo confirmar la operación a tiempo. Actualiza la lista para comprobar si se realizó antes de reintentar.';
  if(status===0)return 'No se pudo conectar al servidor ni confirmar la operación. Actualiza la lista antes de reintentar.';
  const prefix=status===0?'No se pudo conectar al servidor.':status===401?'Tu sesión venció.':status===403?'No tienes permiso para esta operación.':'No se pudo '+action+(status?' (HTTP '+status+')':'')+'.';
  // Render API messages as text, never server HTML or a complete response dump.
  if(body&&typeof body==='object'){
    const allowed=['name','device_id','model','state','status','detail','message','non_field_errors','protected_objects','bus','driver','route','origin','destination','distance_km','fare_amount_cents','date_time_start','date_time_end','trip_state','capacity','bus_type'];
    const messages=Object.entries(body).filter(([key])=>allowed.includes(key)).flatMap(([,value])=>typeof value==='string'?[value]:Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[]).filter(value=>!/<\/?(?:html|script|body)\b/i.test(value)).map(value=>value.slice(0,600));
    if(messages.length)return prefix+' '+messages.slice(0,5).join(' ');
  }
  return prefix+(status&&status>=500?' El servidor no devolvió un motivo utilizable; requiere revisar los logs del backend.':'');
}
