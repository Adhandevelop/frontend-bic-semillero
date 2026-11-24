import { TripSalesMetadata } from '../utils/trip-sales';
export interface Viaje extends TripSalesMetadata {
  id?: number;
  bus: number;
  conductor: number;
  driver_name?: string;
  bus_plate?: string;
  origin?: string;
  destination?: string;
  fare_amount_cents?: number | null;
  ruta: number;
  fecha_hora_inicio: string;
  fecha_hora_fin?: string | null;
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado';
  bus_detalle?: any;
  conductor_detalle?: any;
  ruta_detalle?: any;
  manual_operator_detail?: {id:number;username?:string;name?:string;role?:string;role_label?:string;signature?:string}|null;
  manual_action_at?: string|null;
  state_attribution_message?: string|null;
}
