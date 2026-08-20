export interface Notification {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  receiver: string;
  is_read: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
}
