export interface TripSalesMetadata {
  state_source?:'automatic'|'manual';automatic_completion_at?:string|null;
  sales_close_at?:string|null;can_sell?:boolean;sales_block_reason?:string|null;server_time?:string;
}
const clocks=new WeakMap<object,{server:number;received:number}>();
export const TRIP_SALES_CONTRACT_MESSAGE='La API de viajes no devolvió los datos de cierre de ventas (can_sell, sales_close_at y server_time). Actualiza el servicio de viajes y vuelve a consultar.';
export function tripSalesMetadataPresent(trip:TripSalesMetadata):boolean{return typeof trip.can_sell==='boolean'&&Number.isFinite(Date.parse(trip.server_time??''))&&Number.isFinite(Date.parse(trip.sales_close_at??''));}
export function tripServerNow(trip:TripSalesMetadata):number{
  let clock=clocks.get(trip);if(!clock){clock={server:Date.parse(trip.server_time??''),received:performance.now()};clocks.set(trip,clock);}
  return clock.server+Math.max(0,performance.now()-clock.received);
}
export function tripCanSell(trip:TripSalesMetadata & {trip_state?:string;estado?:string}):boolean{
  const state=trip.trip_state??trip.estado;
  return trip.can_sell===true&&['scheduled','in_progress','programado','en_curso'].includes(state??'')&&Number.isFinite(tripServerNow(trip))&&tripServerNow(trip)<Date.parse(trip.sales_close_at??'');
}
export function tripSalesMessage(trip:TripSalesMetadata):string{
  if(!tripSalesMetadataPresent(trip))return TRIP_SALES_CONTRACT_MESSAGE;
  const reasons:Record<string,string>={sales_closed:'La venta cerró diez minutos después de la salida.',trip_cancelled:'El viaje está cancelado.',trip_completed:'El viaje finalizó.',fare_missing:'El viaje no tiene tarifa disponible.',sold_out:'No hay sillas disponibles.'};
  return (trip.can_sell===true&&Number.isFinite(tripServerNow(trip))&&tripServerNow(trip)>=Date.parse(trip.sales_close_at??'')?reasons['sales_closed']:reasons[trip.sales_block_reason??''])??'Actualiza el viaje para confirmar la disponibilidad de venta.';
}
