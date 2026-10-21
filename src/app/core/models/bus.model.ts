export interface Bus {
  id?: number;
  plate: string;
  capacity: number;
  model?: string;
  state: 'Active' | 'Inactive' | 'mantenimiento';
}
