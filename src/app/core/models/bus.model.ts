import type { BusType } from '../services/bus-type.service';
export interface Bus {
  id?: number;
  bus_type?:number|null;
  bus_type_detail?:BusType|null;
  gps_device_detail?:{id:number;name:string;device_id:string;model:string;state:string;last_ping_at:string|null}|null;
  plate: string;
  capacity: number;
  model?: string;
  state: 'Active' | 'Inactive' | 'Maintenance';
}


// Compatibility for older responses; administrative requests use the API value.
export function normalizeBus(bus:Bus):Bus{const device=bus.gps_device_detail;return {...bus,state:(bus.state as string)==='mantenimiento'?'Maintenance':bus.state,...(device?{gps_device_detail:{id:device.id,name:device.name,device_id:device.device_id,model:device.model,state:device.state,last_ping_at:device.last_ping_at}}:{})};}
