export type IntelligenceModuleType =
  | "IP"
  | "COMPETITIVE"
  | "TECHNOLOGY"
  | "MARKET"
  | "INNOVATION"
  | "REGULATORY"
  | "PORTFOLIO"
  | "WHITE_SPACE";

export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

export interface IntelligenceEvidence {
  source: string;
  source_url?: string;
  published_date: string;
  relevant_data: string;
  supporting_evidence: string[];
  reasoning_summary: string;
  confidence: number; // 0 - 100
}

export interface RelatedEntity {
  name: string;
  relevance?: string;
  id?: string;
  ref?: string;
  title?: string;
  maturity?: string;
  alignment?: string;
  assignee?: string;
  patent_number?: string;
}

export interface IntelligenceSignal {
  id: string;
  type: IntelligenceModuleType;
  category: string;
  title: string;
  summary: string;
  source: string;
  source_url?: string;
  published_at: string;
  detected_at: string;

  impact_level: ImpactLevel;
  confidence: number; // percentage (0 - 100)
  relevance_score: number; // percentage (0 - 100)

  // 7 Executive Decision Questions
  what_changed: string;
  where_changed: string;
  why_it_matters: string;
  what_it_affects: string;
  risk: string;
  opportunity: string;
  recommended_action: string;

  // Grounded Connected Entities
  related_competitors: Array<{ name: string; relevance: string; patent_count?: number }>;
  related_patents: Array<{ patent_number: string; title: string; assignee?: string }>;
  related_inventions: Array<{ id: string; ref: string; title: string }>;
  related_technologies: Array<{ name: string; maturity: string }>;
  related_portfolio_assets: Array<{ ref: string; title: string; alignment: string }>;
  related_opportunities: Array<{ id: string; title: string }>;

  evidence: IntelligenceEvidence;
  status: "ACTIVE" | "WATCHLIST" | "REVIEWED" | "ACTIONED";
  created_at: string;
  updated_at: string;
}

export interface ModuleHealthNode {
  status: "Stable" | "Attention" | "Emerging" | "Strong" | "Monitor" | "Positive" | "Opportunity" | "Critical";
  detail: string;
  score: number; // 0 - 100
  signal_count: number;
}

export interface StrategicIntelligenceHealth {
  ip: ModuleHealthNode;
  competition: ModuleHealthNode;
  technology: ModuleHealthNode;
  market: ModuleHealthNode;
  innovation: ModuleHealthNode;
  regulatory: ModuleHealthNode;
  portfolio: ModuleHealthNode;
  white_space: ModuleHealthNode;
}

export interface CrossIntelligenceCorrelation {
  id: string;
  title: string;
  chain: Array<{ module: IntelligenceModuleType; step: string; detail: string }>;
  risk_level: ImpactLevel;
  opportunity_potential: string;
  recommended_action: string;
}

export interface StrategicIntelligenceOverview {
  metrics: {
    critical_signals_count: number;
    new_ip_signals_count: number;
    competitor_signals_count: number;
    technology_signals_count: number;
    market_signals_count: number;
    regulatory_changes_count: number;
    portfolio_risks_count: number;
    white_space_opportunities_count: number;
  };
  health: StrategicIntelligenceHealth;
  top_risks: IntelligenceSignal[];
  top_opportunities: IntelligenceSignal[];
  cross_correlations: CrossIntelligenceCorrelation[];
  last_updated: string;
}

export interface IntelligenceModuleResponse {
  module: IntelligenceModuleType;
  title: string;
  description: string;
  signals: IntelligenceSignal[];
  key_findings: string[];
  module_stats: Record<string, string | number>;
  top_risk: string;
  top_opportunity: string;
  recommended_action: string;
}
