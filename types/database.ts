export type UserType = 'client' | 'mechanic' | 'admin';
export type ServiceStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface Profile {
  id: string;
  user_type: UserType;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  address: string;
  photo_url?: string;
  id_card_number?: string;
  specialties?: string[];
  is_available: boolean;
  rating_average: number;
  rating_count: number;
  missions_completed?: number;
  mechanic_record_id?: string;
  latitude?: number;
  longitude?: number;
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  client_id: string;
  mechanic_id?: string;
  service_type: string;
  status: ServiceStatus;
  location_lat: number;
  location_lng: number;
  location_address: string;
  description: string;
  estimated_time?: number;
  distance_km?: number;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  service_id: string;
  client_id: string;
  mechanic_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  service_id?: string;
  reason: string[];
  description: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  service_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const MECHANIC_SPECIALTIES = [
  'Mécanique générale',
  'Électricité automobile',
  'Pneumatique',
  'Carrosserie',
  'Climatisation',
  'Diagnostic électronique',
  'Freinage',
  'Vitrage',
] as const;
