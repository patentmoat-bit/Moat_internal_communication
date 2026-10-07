export type IPNewsCategory =
  | "All"
  | "Patents"
  | "Trademarks"
  | "Copyright"
  | "Competitor IP"
  | "Technology"
  | "Regulatory"
  | "Market";

export interface IPNewsArticle {
  id: string;
  external_id: string;
  title: string;
  source_name: "WIPO" | "EPO" | "USPTO" | "UK IPO" | "IPWatchdog" | "Patently-O" | string;
  source_url: string;
  article_url: string;
  published_at: string; // ISO 8601 UTC
  fetched_at: string;
  updated_at?: string | null;
  category: 
    | "Patents"
    | "Trademarks"
    | "Copyright"
    | "Competitor IP"
    | "Technology"
    | "Regulatory"
    | "Market"
    | string;
  summary: string;
  content_excerpt?: string;
  image_url?: string | null;
  author?: string | null;
  tags?: string[];
  jurisdiction?: string;
  language?: string;
  content_hash?: string;
  
  // CEO Executive Intelligence
  relevance_level: "HIGH" | "MEDIUM" | "LOW";
  relevance_score: number; // 0 - 100
  relevance_reason: string;
  impact_level: "HIGH" | "MEDIUM" | "LOW";
  impact_factors?: {
    regulatory?: "HIGH" | "MEDIUM" | "LOW";
    competitor?: "HIGH" | "MEDIUM" | "LOW";
    technology?: "HIGH" | "MEDIUM" | "LOW";
    portfolio?: "HIGH" | "MEDIUM" | "LOW";
    market?: "HIGH" | "MEDIUM" | "LOW";
  };
  executive_summary_qa?: {
    what_happened: string;
    why_it_matters: string;
    who_is_affected: string;
    what_could_change: string;
    what_should_moat_watch: string;
  };
  moat_impact_breakdown?: {
    portfolio: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
    competitor: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
    technology: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
    regulatory: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
    market: { rating: "HIGH" | "MEDIUM" | "LOW"; explanation: string };
  };
  related_intelligence?: {
    competitors?: { name: string; relevance: string }[];
    technologies?: { name: string; relevance: string }[];
    portfolio_matters?: { ref: string; title: string }[];
    opportunities_count?: number;
  };
  competitor_activity?: {
    competitor: string;
    event: string;
    patent_app?: string;
    technology: string;
    jurisdiction: string;
    date: string;
    potential_impact: string;
    source: string;
  };
  potential_opportunity?: string;
  potential_risk?: string;
  recommended_action?: string;

  executive_summary?: string;
  key_points?: string[];
  why_it_matters?: {
    filing_strategy?: string;
    technology_development?: string;
    portfolio_management?: string;
    regulatory_awareness?: string;
    executive_takeaway?: string;
  };
  is_saved?: boolean;
  is_watched?: boolean;
  is_competitor_related?: boolean;
  is_portfolio_related?: boolean;
  is_market_relevant?: boolean;
  is_active: boolean;
  created_at?: string;

  // Upcoming IP Events & Calendar Milestones
  event_date?: string | null;
  is_upcoming_event?: boolean;
  event_type?: "HEARING" | "DEADLINE" | "CONFERENCE" | "REGULATORY_EFFECTIVE" | "ORAL_ARGUMENT" | string;
}

export interface IPNewsResponse {
  articles: IPNewsArticle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  last_updated: string;
  sources: { name: string; count: number }[];
  categories: { name: string; count: number }[];
  upcoming_events?: IPNewsArticle[];
  stats?: {
    high_impact_count: number;
    new_developments_count: number;
    competitor_events_count: number;
    regulatory_changes_count: number;
    upcoming_events_count?: number;
  };
}

export interface IPNewsFilterParams {
  page?: number;
  limit?: number;
  source?: string;
  category?: string;
  impact?: "All" | "HIGH" | "MEDIUM" | "LOW";
  jurisdiction?: string;
  sort?: "latest" | "oldest";
  search?: string;
  date_from?: string;
  date_to?: string;
  quick_date?: string;
}

