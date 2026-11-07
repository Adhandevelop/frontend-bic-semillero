export interface Conductor {
  id?: number;
  full_name: string;
  license_number: string;
  address: string;
  phone_number: string;
  is_active?: boolean;
}
