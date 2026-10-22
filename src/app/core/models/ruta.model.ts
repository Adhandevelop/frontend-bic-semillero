export interface Ruta {
  id?: number;
  origen: string;
  origen_id?: number;
  destino_id?: number;
  destino: string;
  distancia_km?: number;
  estado: 'activa' | 'inactiva';
}
