export interface Alert {
  id: string;
  user_id?: string;
  name: string;
  alert_type: string;
  criteria?: any;
  frequency: string;
  is_active: boolean;
  last_checked_at?: string | null;
  match_count: number;
  description?: string | null;
  delivery_channels?: any;
  last_match_data?: any;
  created_at: string;
  updated_at: string;
}
