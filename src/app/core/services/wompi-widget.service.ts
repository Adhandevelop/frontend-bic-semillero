import { Injectable } from '@angular/core';
import { CheckoutData } from './online-booking.service';
interface WidgetResult {transaction?:{id?:string};}
interface WidgetInstance {open(callback:(result:WidgetResult)=>void):void;}
type WidgetConstructor=new (options:{currency:string;amountInCents:number;reference:string;publicKey:string;signature:{integrity:string};redirectUrl:string})=>WidgetInstance;
declare global {interface Window {WidgetCheckout?:WidgetConstructor;}}
@Injectable({providedIn:'root'})
export class WompiWidgetService {
  private loading?:Promise<void>;
  load():Promise<void>{
    if(window.WidgetCheckout)return Promise.resolve();
    if(this.loading)return this.loading;
    this.loading=new Promise<void>((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://checkout.wompi.co/widget.js';script.async=true;
      const timer=setTimeout(()=>{script.remove();reject(new Error('Wompi no respondió a tiempo.'));},15000);
      script.onload=()=>{clearTimeout(timer);if(window.WidgetCheckout)resolve();else{script.remove();reject(new Error('No se pudo iniciar Wompi.'));}};
      script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('No se pudo cargar Wompi.'));};document.head.appendChild(script);
    }).catch(err=>{this.loading=undefined;throw err;});return this.loading;
  }
  open(data:CheckoutData,redirectUrl:string,callback:(transactionId:string|null)=>void):void{
    if(!window.WidgetCheckout)throw new Error('Wompi no está disponible.');
    new window.WidgetCheckout({currency:data.currency,amountInCents:data.amount_in_cents,reference:data.reference,publicKey:data.public_key,signature:{integrity:data.signature_integrity},redirectUrl}).open(result=>callback(result.transaction?.id??null));
  }
}
