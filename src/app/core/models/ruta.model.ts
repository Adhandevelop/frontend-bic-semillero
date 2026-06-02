export interface Ruta {
  id?: number;
  origen: string;
  destino: string;
  distancia_km?: number;
  estado: 'activa' | 'inactiva';
}
