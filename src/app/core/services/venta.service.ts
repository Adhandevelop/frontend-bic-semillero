import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
export interface SaleTrip {id:number;bus:number;route:number;date_time_start:string;trip_state:string;}
export interface SaleSeat {id:number;bus:number;seat_number:string;row:string;col:string;}
export interface SaleFare {trip:number;amount_cents:number;}
export interface SaleTicket {id:number;trip:number;seat:number;status:string;ticket_code:string;}
export interface AdminSalePayload {trip:number;seat:number;identification_number:string;name:string;email:string;telephone:string;payment_method:'cash'|'card'|'transfer';}
export interface FactusInvoice {status:string;number:string;cufe:string;public_url?:string;qr_url?:string;error_message?:string;raw_response?:{data?:{errors?:Record<string,string>}};}
export interface SaleResult {factus_invoice?:FactusInvoice|null;id:number;status:string;amount_cents:number;tickets:SaleTicket[];}
@Injectable({providedIn:'root'})
export class VentaService {
  constructor(private http:HttpClient){}
  private logFailure(operation:string,endpoint:string,err:{status?:number},saleId?:number):void{
    const status=err.status??null;
    const reason=status===0?'No se recibió respuesta de la API.':status===401?'Sesión no válida o vencida.':status===403?'Permisos insuficientes.':status===404?'Recurso o endpoint no encontrado.':status===409?'Conflicto con el estado de los registros.':status===400||status===422?'La API rechazó los datos. Revisa la respuesta de validación.':status!==null&&status>=500?'Error interno del backend; consultar sus logs para conocer la causa.':'No se pudo completar la operación.';
    console.error('[Ventas] Fallo de API',{operation,endpoint,httpStatus:status,saleId,reason});
  }
  private logInvoice(sale:SaleResult):void{
    const invoice=sale.factus_invoice;
    if(!invoice){console.warn('[Factus] La venta no incluye resultado de facturación',{saleId:sale.id,saleStatus:sale.status,invoiceStatus:'not_returned',nextStep:'Consultar el estado de factura; no registrar otra venta.'});return;}
    if(invoice.status==='error')console.error('[Factus] El backend informa un error de facturación',{saleId:sale.id,invoiceStatus:invoice.status,hasErrorMessage:!!invoice.error_message,nextStep:'Revisar el mensaje mostrado en la vista y los logs del backend.'});
    else if(invoice.status!=='issued')console.warn('[Factus] Facturación pendiente',{saleId:sale.id,invoiceStatus:invoice.status,nextStep:'Consultar nuevamente el estado de factura.'});
  }
  catalogos(){return forkJoin({trips:allApiPages<SaleTrip>(this.http,API_BASE_URL+'/trips/trips/'),seats:allApiPages<SaleSeat>(this.http,API_BASE_URL+'/fleet/seats/'),fares:allApiPages<SaleFare>(this.http,API_BASE_URL+'/trips/fares/'),tickets:this.tiquetes()});}
  tiquetes():Observable<SaleTicket[]>{return allApiPages<SaleTicket>(this.http,API_BASE_URL+'/sales/tickets/');}
  consultar(id:number):Observable<SaleResult>{return this.http.get<SaleResult>(API_BASE_URL+'/sales/sales/'+id+'/').pipe(tap({next:sale=>this.logInvoice(sale),error:err=>this.logFailure('Consultar venta/factura','GET /api/sales/sales/:id/',err,id)}));}
  crear(payload:AdminSalePayload):Observable<SaleResult>{return this.http.post<SaleResult>(API_BASE_URL+'/sales/admin-sales/',payload).pipe(tap({next:sale=>this.logInvoice(sale),error:err=>this.logFailure('Registrar venta','POST /api/sales/admin-sales/',err)}));}
}


