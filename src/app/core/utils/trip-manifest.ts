import type { AdminSeatTicket } from '../services/admin-seats.service';
export interface ManifestSale {id:number;trip:number;tickets?:AdminSeatTicket[];}
export interface TripManifest {tickets:AdminSeatTicket[];warnings:string[];unavailable?:boolean;}
const id=(value:unknown):number|null=>{if(typeof value!=='number'&&!(typeof value==='string'&&/^\d+$/.test(value)))return null;const number=Number(value);return Number.isSafeInteger(number)&&number>0?number:null;};
export function mergeTripManifest(trip:number,direct:AdminSeatTicket[],sales:ManifestSale[]):TripManifest {
  const found=new Map<number,AdminSeatTicket>(),warnings:string[]=[];let invalid=0,recovered=0;
  const read=(value:AdminSeatTicket):AdminSeatTicket|null=>{
    if(!value||typeof value!=='object')return null;
    const ticketId=id(value.id),sale=id(value.sale),tripId=id(value.trip),seat=id(value.seat);
    if(!ticketId||!sale||!tripId||!seat||!['issued','used','cancelled'].includes(value.status))return null;
    return {...value,id:ticketId,sale,trip:tripId,seat};
  };
  for(const value of direct){const ticket=read(value);if(!ticket){invalid++;continue;}if(ticket.trip===trip)found.set(ticket.id,ticket);}
  for(const sale of sales){
    if(id(sale?.trip)!==trip)continue;
    if(!Array.isArray(sale.tickets)){warnings.push('La venta #'+sale.id+' no incluyó su lista de boletas.');continue;}
    for(const value of sale.tickets){
      const ticket=read(value);if(!ticket||ticket.trip!==trip||ticket.sale!==id(sale.id)){invalid++;continue;}
      const existing=found.get(ticket.id);
      if(!existing){found.set(ticket.id,ticket);recovered++;continue;}
      if(existing.sale!==ticket.sale||existing.seat!==ticket.seat||existing.ticket_code&&ticket.ticket_code&&existing.ticket_code!==ticket.ticket_code){warnings.push('La boleta #'+ticket.id+' tiene referencias distintas entre las consultas. Actualiza antes de confirmar el manifiesto.');continue;}
      if(existing.status!==ticket.status){warnings.push('El estado de la boleta #'+ticket.id+' difiere entre las consultas. Actualiza antes del abordaje.');continue;}
      // These are passenger fields from the same ticket, never the sale buyer.
      found.set(ticket.id,{...existing,seat_number:existing.seat_number||ticket.seat_number,passenger_name:existing.passenger_name||ticket.passenger_name,passenger_identification:existing.passenger_identification||ticket.passenger_identification,check_in:existing.check_in??ticket.check_in});
    }
  }
  if(recovered)warnings.push('Se muestran '+recovered+' boleta(s) confirmadas dentro de sus ventas que no llegaron en el listado de tiquetes.');
  if(invalid)warnings.push('La API devolvió '+invalid+' registro(s) de boletas con datos incompletos o relaciones inconsistentes; el manifiesto puede estar incompleto.');
  return {tickets:[...found.values()],warnings:[...new Set(warnings)]};
}
