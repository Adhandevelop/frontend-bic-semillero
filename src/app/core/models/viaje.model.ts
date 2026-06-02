export interface Viaje {
  id?: number;
  bus: number;
  conductor: number;
  ruta: number;
  fecha_hora_inicio: string;
  fecha_hora_fin?: string | null;
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado';
  bus_detalle?: any;
  conductor_detalle?: any;
  ruta_detalle?: any;
}
