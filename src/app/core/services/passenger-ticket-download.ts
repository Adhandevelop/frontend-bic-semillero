import { firstValueFrom, timeout } from 'rxjs';
import { PassengerService } from './passenger.service';
import { PdfTicket, ticketVerificationUrl } from './ticket-pdf';
import { publicVerificationUrl } from '../utils/verification-link';

// Re-read the authenticated sale and validate every issued ticket before building a PDF.
export async function preparePassengerTickets(api:PassengerService,id:number,origin:string){
      const sale=await firstValueFrom(api.sale(id).pipe(timeout(20000)));
      if(sale.id!==id)throw new Error('La compra recibida no coincide con la solicitada. Actualiza el detalle.');
      if(sale.status!=='paid')throw new Error('La compra todavía no está pagada.');
      const tickets=sale.tickets?.filter(t=>t.status==='issued')??[];
      if(!tickets.length)throw new Error('Esta compra ya no tiene boletas emitidas.');
      const entries:PdfTicket[]=await Promise.all(tickets.map(async ticket=>{
        const url=ticketVerificationUrl(ticket.verification_url,origin,api.token());
        const verified=await firstValueFrom(api.verifyTicket(url.href).pipe(timeout(15000)));
        if(!verified.valid||verified.status!=='issued'||verified.ticket_code!==ticket.ticket_code||verified.trip?.id!==ticket.trip||verified.seat?.id!==ticket.seat)throw new Error('Una boleta ya no está emitida o su verificación no coincide. Actualiza la compra.');
        const passengerName=typeof ticket.passenger_name==='string'?ticket.passenger_name.trim():'';
        const passengerIdentification=typeof ticket.passenger_identification==='string'?ticket.passenger_identification.trim():'';
        if(!passengerName||!passengerIdentification||passengerIdentification.includes('*'))throw new Error('El tiquete autenticado no incluye el nombre y documento completos del pasajero. Actualiza la compra antes de descargar.');
        if(!verified.trip.origin||!verified.trip.destination||!verified.trip.date_time_start||!verified.seat.seat_number)throw new Error('El servidor devolvió datos incompletos del viaje o asiento para imprimir una boleta.');
        // The public verification intentionally masks identity; print only the authenticated ticket data.
        return {ticket:{...verified,passenger:{name:passengerName,identification_number:passengerIdentification}},verificationUrl:publicVerificationUrl(ticket.verification_url!,origin,api.token()),issuedAt:ticket.issued_at};
      }));

  return {sale,entries};
}
