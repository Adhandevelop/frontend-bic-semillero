import { VerifiedTicket } from './ticket-pdf';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
export interface PassengerProfile {id:number;role:string;photo_url?:string|null;name?:string;first_name?:string;last_name?:string;email:string;telephone:string;identification_number:string;identification_document_code?:string;}
export interface PassengerRegistration {name:string;email:string;telephone:string;identification_number:string;identification_document_code:string;password:string;}
export interface PassengerSale {id:number;status:string;amount_cents:number;created_at?:string;trip?:number;seat?:number;tickets:Array<{ticket_code:string;trip:number;seat:number;status:string;verification_url?:string;verification_token?:string;issued_at?:string}>;factus_invoice?:{status:string;number:string;cufe:string;public_url?:string;error_message?:string;pdf_url?:string;xml_url?:string;qr_url?:string}|null;}
export function passengerError(err:{status?:number;error?:unknown}):string{
  if(err.status===0)return 'No se pudo conectar con el servidor.';
  if(err.status===401)return 'Credenciales incorrectas o sesión vencida. Inicia sesión nuevamente.';
  if(err.status===403){const detail=err.error&&typeof err.error==='object'&&'detail' in err.error?err.error.detail:null;return typeof detail==='string'?detail:'El servidor denegó el acceso. Revisa los permisos de la consulta de perfil.';}
  if(err.status===404)return 'El servicio solicitado no está disponible (HTTP 404).';
  if(err.status&&err.status>=500)return 'El servidor presentó un error interno (HTTP '+err.status+').';
  const labels:Record<string,string>={detail:'',name:'Nombre',email:'Correo',telephone:'Celular',photo:'Foto de perfil',password:'Contraseña',identification_number:'Documento',identification_document_code:'Tipo de documento',non_field_errors:''};
  const messages:string[]=[];
  if(err.error&&typeof err.error==='object')for(const [key,value] of Object.entries(err.error))if(key in labels){const texts=Array.isArray(value)?value:[value];for(const text of texts)if(typeof text==='string')messages.push((labels[key]?labels[key]+': ':'')+text);}
  return messages.join(' ')||'No se pudo completar la operación. Revisa los datos e intenta nuevamente.';
}
export interface DigitalCard {name:string;card_id:string;photo_url?:string;status:string;valid_until:string|null;qr:{token:string;verification_url:string};warning:string;}
export type PassengerInvoice=NonNullable<PassengerSale['factus_invoice']>;
@Injectable({providedIn:'root'})
export class PassengerService {
  private key='bic_passenger_access';private refreshKey='bic_passenger_refresh';
  constructor(private http:HttpClient){}
  token():string|null{return sessionStorage.getItem(this.key)||localStorage.getItem(this.key);}
  private options(){return {headers:new HttpHeaders({Authorization:'Bearer '+(this.token()??'')})};}
  logout():void{for(const storage of [sessionStorage,localStorage]){storage.removeItem(this.key);storage.removeItem(this.refreshKey);}}
  register(data:PassengerRegistration):Observable<unknown>{return this.http.post(API_BASE_URL+'/accounts/register/',data);}
  login(username:string,password:string,remember:boolean):Observable<PassengerProfile>{
    this.logout();
    return this.http.post<{access:string;refresh:string}>(API_BASE_URL+'/token/',{username:username.trim(),password}).pipe(switchMap(tokens=>{
      if(!tokens.access||!tokens.refresh)throw new Error('El servidor no devolvió los tokens.');
      return this.http.get<PassengerProfile>(API_BASE_URL+'/accounts/me/',{headers:{Authorization:'Bearer '+tokens.access}}).pipe(tap(profile=>{
        this.requireClient(profile);
        const storage=remember?localStorage:sessionStorage;storage.setItem(this.key,tokens.access);storage.setItem(this.refreshKey,tokens.refresh);
      }));
    }),catchError(err=>{this.logout();return throwError(()=>err);}));
  }
  private requireClient(profile:PassengerProfile):void{
    if(!profile||typeof profile.role!=='string'||!profile.role.trim()){
      console.error('[Portal cliente] No se puede verificar el rol',{endpoint:'GET /api/accounts/me/',rolePresent:false});
      throw {status:422,error:{detail:'El perfil recibido no incluye el campo role. No se pudo verificar tu acceso de cliente; revisa la respuesta de /api/accounts/me/.'}};
    }
    if(profile.role!=='client'){
      console.warn('[Portal cliente] Rol no permitido',{endpoint:'GET /api/accounts/me/',rolePresent:true});
      throw {status:403,error:{detail:'La cuenta autenticada no tiene rol client. Esta sección requiere una cuenta de cliente.'}};
    }
  }
  me():Observable<PassengerProfile>{return this.http.get<PassengerProfile>(API_BASE_URL+'/accounts/me/',this.options());}
  allowed():Observable<boolean>{if(!this.token())return of(false);return this.me().pipe(map(p=>{this.requireClient(p);return true;}),catchError(()=>of(false)),tap(ok=>{if(!ok)this.logout();}));}
  update(data:{name:string;email:string;telephone:string}):Observable<PassengerProfile>{return this.http.patch<PassengerProfile>(API_BASE_URL+'/accounts/me/',data,this.options());}
  uploadPhoto(file:File){const body=new FormData();body.append('photo',file);return this.http.post(API_BASE_URL+'/accounts/me/photo/',body,this.options());}
  deletePhoto(){return this.http.delete(API_BASE_URL+'/accounts/me/photo/',this.options());}
  card(){return this.http.get<DigitalCard>(API_BASE_URL+'/accounts/me/card/',this.options());}
  verifyTicket(url:string){return this.http.get<VerifiedTicket>(url);}
  sale(saleId:number){return this.http.get<PassengerSale>(API_BASE_URL+'/sales/sales/'+saleId+'/',this.options());}
  invoice(saleId:number){return this.http.get<PassengerInvoice>(API_BASE_URL+'/sales/sales/'+saleId+'/invoice/',this.options());}
  history():Observable<PassengerSale[]>{
    // Explicit client header on every page; never fall back to the admin session.
    const http={get:<T>(url:string,options?:{params?:Record<string,number>})=>this.http.get<T>(url,{...options,...this.options()})};
    return allApiPages<PassengerSale>(http as HttpClient,API_BASE_URL+'/sales/sales/');
  }
}



