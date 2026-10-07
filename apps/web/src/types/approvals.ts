export type ApprovalType = "Project" | "Invention" | "Patent Filing" | "Document";

export type ApprovalStatus = "Pending Approval" | "Rework Required" | "Approved" | "Rejected";

export type ApprovalPriority = "Critical" | "High" | "Medium" | "Low";

export interface ApprovalDocumentVersion {
  version: string; // e.g. "v1", "v2", "v3", "v4"
  version_number: number;
  uploaded_by: string;
  uploaded_at: string;
  status: "Draft" | "Reworked" | "CEO Review" | "Approved" | "Superceded";
  changes_summary?: string;
  storage_path?: string;
  file_size?: string;
  content_preview?: string;
}

export interface ApprovalDocument {
  id: string;
  name: string;
  document_type: 
    | "invention_disclosure"
    | "patent_draft"
    | "claims"
    | "drawings"
    | "technical_spec"
    | "prior_art_report"
    | "patentability_report"
    | "filing_package"
    | "supporting_doc"
    | "approval_authorization";
  display_type: string;
  current_version: string;
  file_type: "pdf" | "docx" | "json" | "png" | "txt";
  uploaded_by: string;
  uploaded_at: string;
  status: "CEO Review" | "Approved" | "Rework Required" | "Draft";
  content_preview?: string;
  pages_count?: number;
  word_count?: number;
  versions: ApprovalDocumentVersion[];
}

export interface ApprovalAuditRecord {
  id: string;
  approval_id: string;
  matter_id: string;
  matter_name: string;
  action: "APPROVED" | "REWORK_REQUESTED" | "REJECTED";
  action_label: string;
  comment?: string;
  reason?: string;
  previous_status: string;
  new_status: string;
  ceo_user: string;
  document_version?: string;
  timestamp: string;
}

export interface ApprovalItem {
  id: string;
  matter_id: string;
  name: string;
  type: ApprovalType;
  owner: string;
  assigned_team: string;
  current_stage: string;
  submitted_by: string;
  submitted_date: string;
  priority: ApprovalPriority;
  deadline: string;
  status: ApprovalStatus;
  summary: string;
  recommendation: string;
  risk_level: "Low" | "Medium" | "High";
  cost_estimate?: number;
  novelty_score?: number;
  documents: ApprovalDocument[];
  audit_history: ApprovalAuditRecord[];
  docket_link?: {
    docket_id: string;
    event_type: string;
    deadline: string;
  };
  connected_docket_id?: string;
  rework_comments?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalsSummaryStats {
  pending_approvals: number;
  project_approvals: number;
  filing_approvals: number;
  rework_required: number;
  recently_approved: number;
}
