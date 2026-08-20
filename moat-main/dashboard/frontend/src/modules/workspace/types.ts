export interface WorkspaceDocument {
  id: string;
  name: string;
  description: string | null;
  content: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFile {
  id: string;
  document_id: string | null;
  name: string;
  url: string;
  size?: number | null;
  type?: string | null;
  created_at: string;
}

export interface Invention {
  id: string;
  user_id: string | null;
  workspace_id?: string | null;
  title: string;
  description: string | null;
  problem_statement?: string | null;
  solution_summary?: string | null;
  technical_field?: string | null;
  status: string;
  tags?: string[] | any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface InventionMemory {
  id: string;
  invention_id: string;
  content: any;
  commit_message: string | null;
  created_at: string;
}
