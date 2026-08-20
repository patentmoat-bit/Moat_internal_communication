export interface Feedback {
  id: string;
  title: string;
  body: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Approval {
  id: string;
  item_type: string;
  item_id: string;
  approved_by: string | null;
  status: string;
  comments?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performed_by: string | null;
  details?: any;
  created_at: string;
}
