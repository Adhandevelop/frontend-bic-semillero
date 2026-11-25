export type DriverOperationalStatus = 'DISPONIBLE' | 'ACTIVO' | 'CAPACITACION';
export type DriverLicenseCategory = 'C1' | 'C2' | 'C3';
export type DriverBloodGroup = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';

export interface Conductor {
  id?: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  document_type?: 'CC' | 'DNI' | 'PASSPORT' | 'CE';
  document_number?: string;
  birth_date?: string | null;
  email?: string;
  license_number: string;
  license_category?: DriverLicenseCategory;
  license_expiry?: string | null;
  experience_years?: number;
  blood_group?: DriverBloodGroup | '';
  operational_status?: DriverOperationalStatus;
  address: string;
  phone_number: string;
  is_active?: boolean;
  photo_url?: string | null;
  has_medical_exam?: boolean;
  has_psychosensometric_test?: boolean;
  has_clean_driving_record?: boolean;
  has_first_aid_training?: boolean;
  user?: number;
  username?: string;
  user_email?: string;
  password?: string;
}

