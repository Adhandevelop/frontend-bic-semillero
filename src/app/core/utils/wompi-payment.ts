import type { CheckoutData } from '../services/online-booking.service';
export const REFUND_REQUIRED_MESSAGE='Tu pago fue recibido, pero la silla ya no estaba disponible. Nuestro equipo te contactará para reubicarte o devolverte el dinero.';
export function expirationSignature(data:CheckoutData):{signature:{integrity:string};expirationTime:string}{
  if(typeof data.expiration_time!=='string'||!data.expiration_time.trim()||!Number.isFinite(Date.parse(data.expiration_time))||typeof data.signature_integrity_with_expiration!=='string'||!data.signature_integrity_with_expiration.trim())throw new Error('El checkout no incluye la firma y el vencimiento de pago completos. Consulta la venta antes de reintentar.');
  return {signature:{integrity:data.signature_integrity_with_expiration},expirationTime:data.expiration_time};
}
export function reservationDeadline(expiresAt:string,serverTime:string,now=Date.now()):number {
  const expiry=Date.parse(expiresAt),server=Date.parse(serverTime);if(!Number.isFinite(expiry)||!Number.isFinite(server))throw new Error('El servidor no devolvió una vigencia de reserva válida.');
  return now+Math.max(0,expiry-server);
}
