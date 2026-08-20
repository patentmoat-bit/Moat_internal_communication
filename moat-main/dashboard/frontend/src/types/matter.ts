export type MatterStatus = "intake" | "active" | "searching" | "analysis" | "review" | "blocked" | "completed" | "archived";
export type MatterPriority = "low" | "medium" | "high" | "critical";
export type MatterMemberRole = "owner" | "manager" | "contributor" | "viewer";
export type MatterDocumentType = "patent" | "prior_art" | "technical" | "legal" | "evidence" | "other";

export interface MatterMember {
  id: string;
  matter_id: string;
  user_id: string;
  role: MatterMemberRole;
  joined_at: string;
  user_name?: string | null;
  user_email?: string | null;
}

export interface MatterDocument {
  id: string;
  matter_id: string;
  uploaded_by_id?: string | null;
  uploaded_by_name?: string | null;
  filename: string;
  document_type: MatterDocumentType;
  content_type?: string | null;
  size_bytes: number;
  storage_url?: string | null;
  description?: string | null;
  created_at: string;
}

export interface MatterActivity {
  id: string;
  matter_id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  message: string;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface MatterStatusHistory {
  id: string;
  matter_id: string;
  from_status?: MatterStatus | null;
  to_status: MatterStatus;
  changed_by_id?: string | null;
  changed_by_name?: string | null;
  note?: string | null;
  created_at: string;
}

export interface Matter {
  id: string;
  workspace_id?: string | null;
  owner_id: string;
  owner_name?: string | null;
  matter_number: string;
  title: string;
  description?: string | null;
  client_name?: string | null;
  technology_area?: string | null;
  notes?: string | null;
  status: MatterStatus;
  priority: MatterPriority;
  due_date?: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  role: MatterMemberRole;
  member_count: number;
  document_count: number;
  activity_count: number;
  members?: MatterMember[];
  documents?: MatterDocument[];
  activity?: MatterActivity[];
  status_history?: MatterStatusHistory[];
}

export type MatterCreateInput = Pick<Matter, "title" | "description" | "workspace_id" | "client_name" | "technology_area" | "notes" | "status" | "priority" | "due_date" | "tags"> & {
  matter_number?: string;
};

export type MatterUpdateInput = Partial<MatterCreateInput>;
