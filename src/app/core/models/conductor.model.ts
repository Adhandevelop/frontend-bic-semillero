export interface Conductor {
  id?: number;
  nombre: string;
  licencia: string;
  telefono?: string;
  estado: 'activo' | 'inactivo';
}
