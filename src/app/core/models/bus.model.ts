import type { BusType } from '../services/bus-type.service';
export interface Bus {
  id?: number;
  bus_type?:number|null;
  bus_type_detail?:BusType|null;
  plate: string;
  capacity: number;
  model?: string;
  state: 'Active' | 'Inactive' | 'Maintenance';
}


// Compatibility for older responses; administrative requests use the API value.
export function normalizeBus(bus:Bus):Bus{return {...bus,state:(bus.state as string)==='mantenimiento'?'Maintenance':bus.state};}