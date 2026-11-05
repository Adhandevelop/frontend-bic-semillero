import { PassengerSale } from '../../core/services/passenger.service';
import { VerifiedTicket } from '../../core/services/ticket-pdf';
export type ClientTicket=PassengerSale['tickets'][number];
export type TicketInfo=Record<string,VerifiedTicket>;
export function ticketLabel(ticket:ClientTicket,info:TicketInfo):string {
  const trip=info[ticket.ticket_code]?.trip;
  return trip?`${trip.origin} → ${trip.destination}`:'Información del viaje no disponible';
}
export function ticketGroup(ticket:ClientTicket,info:TicketInfo,now=Date.now()):string {
  const data=info[ticket.ticket_code],state=data?.status??ticket.status;
  if(state==='used'||state==='cancelled')return state;
  const end=data?.trip.date_time_end,start=data?.trip.date_time_start;
  const boundary=Date.parse(end||start||'');
  if(!Number.isFinite(boundary))return 'unknown';
  return boundary>now?'upcoming':'past';
}
export function filterClientSales(sales:PassengerSale[],filters:{status:string;from:string;to:string;search:string},info:TicketInfo):PassengerSale[]{
  const term=filters.search.trim().toLocaleLowerCase();
  return sales.filter(s=>{
    const parsed=Date.parse(s.created_at??'');
    const day=Number.isFinite(parsed)?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(parsed)):'';
    return (!filters.status||s.status===filters.status)&&(!filters.from||!!day&&day>=filters.from)&&(!filters.to||!!day&&day<=filters.to)&&(!term||[String(s.id),...(s.tickets??[]).map(t=>ticketLabel(t,info)+' '+(info[t.ticket_code]?.passenger.name??'')+' '+t.ticket_code)].join(' ').toLocaleLowerCase().includes(term));
  });
}
