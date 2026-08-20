export type AIServiceSource = "live" | "vector" | "hybrid" | "fallback";

export interface ServiceResult<T> {
  data: T;
  source: AIServiceSource;
  warnings: string[];
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  model: string;
  dimensions: number;
  source: "openai" | "deterministic";
}

export interface VectorDocumentInput {
  userId: string;
  sourceType: string;
  sourceId?: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface VectorSearchOptions {
  userId?: string;
  limit?: number;
  metadata?: Record<string, unknown>;
  lexicalWeight?: number;
  vectorWeight?: number;
}

export interface VectorHit {
  id: string;
  documentId: string;
  sourceType: string;
  sourceId?: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  vectorScore: number;
  lexicalScore: number;
  hybridScore: number;
}

export interface RankingCandidate {
  id: string;
  title: string;
  abstract?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  vectorScore?: number;
  lexicalScore?: number;
  citationScore?: number;
  recencyScore?: number;
}

export interface RankedCandidate extends RankingCandidate {
  finalScore: number;
  rank: number;
  rankReason: string;
}

export interface AgentWorkflowInput {
  userId?: string;
  query: string;
  invention?: string;
  claims?: string[];
  documents?: Array<{ title: string; content: string; sourceType?: string; metadata?: Record<string, unknown> }>;
  includeImages?: boolean;
}

export interface AgentWorkflowOutput {
  query: string;
  stages: Array<{ name: string; status: "completed" | "skipped" | "fallback"; summary: string }>;
  retrieval: VectorHit[];
  rankedPriorArt: RankedCandidate[];
  novelty?: unknown;
  claimMapping?: unknown;
  patentability?: unknown;
  recommendation?: unknown;
}
