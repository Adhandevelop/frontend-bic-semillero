import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { forkJoin, map, switchMap, timeout } from 'rxjs';
import { SaleTicket, VentaService } from './venta.service';
import { AuthService } from './auth.service';
import { PdfTicket, VerifiedTicket, ticketVerificationUrl } from './ticket-pdf';
import { publicVerificationUrl } from '../utils/verification-link';
export function administrativePdfTicket(ticket:SaleTicket,verified:VerifiedTicket,origin:string,sessionToken:string|null):PdfTicket {
  if(!['issued','used','cancelled'].includes(ticket.status)||verified.status!==ticket.status||verified.valid!==(ticket.status==='issued')||verified.ticket_code!==ticket.ticket_code||verified.trip?.id!==ticket.trip||verified.seat?.id!==ticket.seat)throw new Error('El estado o los datos de una boleta cambiaron. Actualiza la venta antes de descargar.');
  const name=ticket.passenger_name?.trim(),document=ticket.passenger_identification?.trim();
  if(!name||!document||document.includes('*'))throw new Error('El detalle autenticado no incluye el nombre y documento completos de cada pasajero. No se generó un PDF parcial.');
  if(!verified.trip.origin||!verified.trip.destination||!Number.isFinite(Date.parse(verified.trip.date_time_start))||!verified.seat.seat_number)throw new Error('Faltan datos del viaje o silla necesarios para imprimir las boletas.');
  return {ticket:{...verified,passenger:{name,identification_number:document}},verificationUrl:publicVerificationUrl(ticket.verification_url!,origin,sessionToken),issuedAt:ticket.issued_at};
}
@Injectable({providedIn:'root'})
export class AdminSaleDeliveryService {
  private publicHttp:HttpClient;
  constructor(private api:VentaService,backend:HttpBackend,private auth:AuthService){this.publicHttp=new HttpClient(backend);}
  prepare(id:number){return this.api.consultar(id).pipe(timeout(20000),switchMap(sale=>{
    if(sale.id!==id||sale.status!=='paid'||!sale.tickets?.length)throw new Error('La venta no está pagada o no contiene boletas para entregar.');
    const origin=window.location.origin,sessionToken=this.auth.getToken();
    return forkJoin(sale.tickets.map(ticket=>{
      const url=ticketVerificationUrl(ticket.verification_url,origin,sessionToken);
      return this.publicHttp.get<VerifiedTicket>(url.pathname,{params:{token:url.searchParams.get('token')!},headers:{Accept:'application/json'}}).pipe(timeout(15000),map(verified=>administrativePdfTicket(ticket,verified,origin,sessionToken)));
    })).pipe(map(entries=>({sale,entries})));
  }));}
}
