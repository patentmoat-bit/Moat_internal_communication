export interface PatentProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  filing_region?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatentStatus {
  id: string;
  project_id: string;
  status: string;
  notes: string | null;
  updated_at: string;
}

export interface PatentPortfolio {
  id: string;
  patent_number: string;
  title: string;
  abstract: string | null;
  assignee: string | null;
  filing_date: string | null;
  status: string | null;
  estimated_value?: number;
  created_at: string;
  updated_at: string;
}

export interface PatentDocument {
  id: string;
  project_id: string | null;
  name: string;
  url: string;
  file_type: string | null;
  size: number | null;
  created_at: string;
}

export interface PatentVersion {
  id: string;
  document_id: string;
  version_number: number;
  url: string;
  commit_message: string | null;
  created_at: string;
}
