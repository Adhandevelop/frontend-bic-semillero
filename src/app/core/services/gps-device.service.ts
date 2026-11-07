import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { allApiPages } from './api-pagination';
import { Bus } from '../models/bus.model';
import { fleetError } from '../utils/fleet-error';
export type DeviceState='active'|'inactive'|'maintenance';
export interface GpsDevice {id:number;name:string;device_id:string;model:string;state:DeviceState;api_key:string;bus:number|null;bus_plate?:string|null;last_ping_at:string|null;created_at?:string;updated_at?:string;}
export interface DeviceInput {name:string;device_id:string;model:string;state:DeviceState;bus?:number|null;}
export interface DeviceFilters {available?:boolean;state?:DeviceState;search?:string;}
// Whitelist metadata: raw_api_key and unknown fields never enter a catalog or bus model.
export function deviceMetadata(value:GpsDevice):GpsDevice{return {id:value.id,name:value.name,device_id:value.device_id,model:value.model,state:value.state,api_key:value.api_key?.startsWith('esp_live_')?value.api_key.slice(0,13)+'…':'No informado',bus:value.bus??null,bus_plate:value.bus_plate,last_ping_at:value.last_ping_at??null,created_at:value.created_at,updated_at:value.updated_at};}
function secret(value:unknown):string|null{return typeof value==='string'&&value.startsWith('esp_live_')&&value.length>16&&!/[.\s…]/.test(value)?value:null;}
export function deviceFailure(err:{status?:number;error?:unknown;name?:string},action:string):string{return fleetError(err,action).replace(/esp_live_[A-Za-z0-9_-]+(?:\.{3}|…)?/g,'[clave oculta]');}
@Injectable({providedIn:'root'})
export class GpsDeviceService {
  private url=API_BASE_URL+'/fleet/devices/';
  constructor(private http:HttpClient){}
  list(filters:DeviceFilters={}){const query=new URLSearchParams();for(const[key,value]of Object.entries(filters))if(value!==undefined&&String(value).trim())query.set(key,String(value).trim());return allApiPages<GpsDevice>(this.http,this.url+(query.size?'?'+query.toString():'')).pipe(map(rows=>rows.map(deviceMetadata)));}
  create(input:DeviceInput){return this.http.post<GpsDevice&{raw_api_key?:string}>(this.url,input).pipe(map(value=>({device:deviceMetadata(value),secret:secret(value.raw_api_key)})));}
  update(id:number,input:Omit<DeviceInput,'bus'>){return this.http.patch<GpsDevice>(this.url+id+'/',input).pipe(map(deviceMetadata));}
  regenerate(id:number){return this.http.post<{device:GpsDevice&{raw_api_key?:string};api_key?:string}>(this.url+id+'/regenerate-key/',{}).pipe(map(value=>({device:deviceMetadata(value.device),secret:secret(value.device?.raw_api_key)??secret(value.api_key)})));}
  assign(id:number,bus:number){return this.http.post<{device:GpsDevice}>(this.url+id+'/assign/',{bus}).pipe(map(value=>deviceMetadata(value.device)));}
  unassign(id:number){return this.http.post<{device:GpsDevice}>(this.url+id+'/unassign/',{}).pipe(map(value=>deviceMetadata(value.device)));}
  assignToBus(bus:number,device:number){return this.http.post<{bus:Bus}>(API_BASE_URL+'/fleet/buses/'+bus+'/assign-device/',{device_id:device}).pipe(map(value=>value.bus));}
  removeFromBus(bus:number){return this.http.post<{bus:Bus}>(API_BASE_URL+'/fleet/buses/'+bus+'/remove-device/',{}).pipe(map(value=>value.bus));}
}
