import type { Point } from 'geojson';

export interface Ruta {
  id?: number;
  origen: string;
  origen_id?: number;
  destino_id?: number;
  origen_punto?: Point;
  destino_punto?: Point;
  destino: string;
  distancia_km?: number;
  estado: 'activa' | 'inactiva';
}
