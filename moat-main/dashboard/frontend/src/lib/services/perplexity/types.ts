export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PerplexityRequest {
  model?: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface IntelligenceResponse {
  technology_summary?: string;
  technology_trends?: string[];
  relevant_companies?: string[];
  research_sources?: string[];
  external_prior_art?: string[];
  risk_indicators?: string[];
  analysis?: string;
  confidence?: "High" | "Medium" | "Low";
}
