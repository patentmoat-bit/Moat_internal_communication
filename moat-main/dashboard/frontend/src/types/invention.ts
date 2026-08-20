export type InventionStatus = "draft" | "ready" | "analyzing" | "analyzed" | "failed" | "archived";
export type InventionDocumentType = "pdf" | "patent" | "technical_document" | "image" | "sketch" | "diagram" | "other";

export interface InventionDocument {
  id: string;
  invention_id: string;
  file_name: string;
  file_type: InventionDocumentType;
  content_type?: string | null;
  storage_url?: string | null;
  created_at: string;
}

export interface InventionAnalysis {
  id: string;
  invention_id: string;
  technical_summary?: string | null;
  innovation_summary?: string | null;
  key_components: Array<Record<string, any>>;
  technical_domains: Array<Record<string, any>>;
  differentiators: Array<Record<string, any>>;
  workflows: Array<Record<string, any>>;
  technical_architecture?: Record<string, any> | null;
  innovation_highlights: Array<Record<string, any>>;
  confidence_score: number;
  model_name?: string | null;
  created_at: string;
}

export interface Invention {
  id: string;
  workspace_id?: string | null;
  matter_id?: string | null;
  title: string;
  description?: string | null;
  status: InventionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  documents: InventionDocument[];
  latest_analysis?: InventionAnalysis | null;
}

export interface InventionCreateInput {
  workspace_id?: string | null;
  matter_id?: string | null;
  title: string;
  description?: string | null;
  status?: InventionStatus;
}
