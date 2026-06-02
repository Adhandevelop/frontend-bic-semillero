export interface Bus {
  id?: number;
  placa: string;
  capacidad: number;
  modelo?: string;
  estado: 'activo' | 'inactivo' | 'mantenimiento';
}
