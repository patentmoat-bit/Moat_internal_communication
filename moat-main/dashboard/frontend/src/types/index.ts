// ─────────────────────────────────────────────────────────────────────────────
// MOAT Patent Intelligence Platform — Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

/** All supported enterprise roles. Must mirror the `role` column in public.users */
export type AppRole =
  | "Admin"
  | "CEO"
  | "Chief IP Officer"
  | "Patent Analyst"
  | "Trademark Analyst"
  | "Inventor"
  | "Business Development"
  | "Design Team"
  | "Super Admin"
  | "System Admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  department?: string;
  company?: string;
  permissions?: string[];
  avatar?: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

// Legacy role union kept for backward compatibility with existing code
export type LegacyRole =
  | "ceo"
  | "cto"
  | "cio"
  | "patent_counsel"
  | "research_lead"
  | "product_manager"
  | "analyst"
  | "admin"
  | "researcher"
  | "viewer";

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  password: string;
  token: string;
}

export interface Patent {
  id: string;
  patent_number: string;
  title: string;
  abstract: string;
  claims: string[];
  inventors: string[];
  assignee: string;
  filing_date: string;
  publication_date: string;
  status: string;
  cpc_classifications: string[];
  ipc_classifications: string[];
  citations: string[];
  similarity_score?: number;
  semantic_score?: number;
  citation_score?: number;
  novelty_score?: number;
  relevance_score?: number;
  hybrid_score?: number;
  matched_modes?: string[];
  metadata: Record<string, unknown>;
  description?: string;
  priority_date?: string;
  legal_events?: LegalEvent[];
  patent_family?: PatentFamilyMember[];
  cited_by?: string[];
  images?: PatentImage[];
}

export interface LegalEvent {
  date: string;
  type: string;
  description: string;
}

export interface PatentFamilyMember {
  patent_number: string;
  country: string;
  kind: string;
  publication_date: string;
  title: string;
}

export interface PatentImage {
  url: string;
  caption: string;
  figure_number?: string;
}

export interface PatentDetail {
  id: string;
  patentNumber: string;
  title: string;
  abstract: string;
  assignee: string;
  inventors: string[];
  filingDate: string;
  publicationDate: string;
  priorityDate?: string;
  status: string;
  cpcClassifications: string[];
  ipcClassifications: string[];
  claims: string[];
  citedPatents: { number: string; title: string }[];
  citedBy?: { number: string; title: string }[];
  description?: string;
  legalEvents?: LegalEvent[];
  patentFamily?: PatentFamilyMember[];
  images?: PatentImage[];
}

export interface PatentSearchResult {
  patents: Patent[];
  total: number;
  page: number;
  page_size: number;
  took_ms: number;
  query_expansion?: { expandedQuery?: string; expandedTerms?: string[]; synonyms?: Record<string, string[]> };
  search_modes?: string[];
  suggestions?: string[];
  ranking?: Array<{ patent_number: string; scores: Record<string, number> }>;
  search_stats?: Record<string, unknown>;
}

export interface SearchFilters {
  query: string;
  assignee?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  cpc_class?: string;
  inventor?: string;
}

export interface AdvancedSearchFilters {
  query?: string;
  assignee?: string;
  inventor?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  pub_date_from?: string;
  pub_date_to?: string;
  cpc_class?: string;
  ipc_class?: string;
  patent_number?: string;
  source?: string;
  patent_family?: string;
  citation?: string;
  country?: string;
  technology?: string;
  claim_query?: string;
  document_query?: string;
  image_query?: string;
  drawing_query?: string;
  language?: string;
  search_modes?: string[];
  expand_query?: boolean;
  include_synonyms?: boolean;
  include_semantic?: boolean;
  include_vectors?: boolean;
  include_citations?: boolean;
  include_family?: boolean;
  sort?: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  patent_count: number;
  created_at: string;
  updated_at: string;
  patents?: Patent[];
}

export interface DashboardStats {
  total_searches: number;
  saved_patents: number;
  collections: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: "search" | "save" | "collection" | "note";
  description: string;
  timestamp: string;
}

export interface SearchHistory {
  id: string;
  query: string;
  filters: SearchFilters;
  result_count: number;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  query?: string;
  filters?: Record<string, unknown>;
  notify_on_new: boolean;
  schedule?: string;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchAnalytics {
  total_searches: number;
  unique_queries: number;
  avg_results: number;
  top_queries: Array<{ query: string; count: number }>;
  searches_by_day: Array<{ date: string; count: number }>;
  status_distribution: Array<{ status: string; count: number }>;
  source_distribution: Array<{ source: string; count: number }>;
  cpc_class_distribution: Array<{ class: string; count: number }>;
  mode_distribution?: Array<{ mode: string; count: number }>;
  avg_latency_ms?: number;
  zero_result_rate?: number;
  saved_search_count?: number;
}

export interface IngestionJob {
  id: string;
  patent_id?: string;
  patent_number?: string;
  source: string;
  status: string;
  pipeline_time_ms?: number;
  error_message?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  detail: string;
  code?: string;
  status_code?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CompareRequest {
  patent_ids: string[];
}

export interface SideBySidePatent {
  id: string;
  patent_number: string;
  title: string;
  abstract: string;
  assignee: string;
  inventors: string[];
  filing_date: string;
  publication_date: string;
  status: string;
  cpc_classifications: string[];
  ipc_classifications: string[];
}

export interface ClaimPair {
  source_index: number;
  source_claim: string;
  target_index: number;
  target_claim: string;
  overlap_score: number;
  overlap_type: string;
}

export interface ClaimComparison {
  source_patent_id: string;
  target_patent_id: string;
  total_source_claims: number;
  total_target_claims: number;
  overlapping_claims: number;
  claim_pairs: ClaimPair[];
}

export interface FeatureMatrixRow {
  feature: string;
  category: string;
  source_present: boolean;
  source_relevance: number | null;
  target_present: boolean;
  target_relevance: number | null;
  overlap: number;
}

export interface FeatureMatrix {
  source_patent_id: string;
  target_patent_id: string;
  rows: FeatureMatrixRow[];
  total_features: number;
  overlapping_features: number;
}

export interface OverlapScore {
  category: string;
  score: number;
  description: string;
}

export interface CompareResponse {
  patents: SideBySidePatent[];
  claim_comparison: ClaimComparison[];
  feature_matrix: FeatureMatrix[];
  overlap_scores: OverlapScore[];
  overall_similarity: number;
}

export interface HighlightGroup {
  keywords: string[];
  color: string;
  proximity?: "sentence" | "paragraph";
}

export interface HighlightScheme {
  id: string;
  name: string;
  groups: HighlightGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  alertName: string;
  type: string;
  newMatches: number;
  topMatches: Array<{ title: string; publicationNumber: string; summary: string }>;
  createdAt: string;
  read: boolean;
}
