export interface PortfolioPatent {
  id: string;
  patent_number: string;
  title: string;
  abstract: string | null;
  assignee: string | null;
  filing_date: string | null;
  publication_date?: string | null;
  status: string | null;
  estimated_value?: number;
  region?: string | null;
  created_at: string;
  updated_at: string;
}
