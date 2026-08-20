import { api } from "./api";

interface SummarizationResponse {
  patent_id: string;
  patent_number: string;
  title: string;
  summary: string;
  key_innovations: string[];
  technical_domain: string;
}

interface SimilarityResult {
  patent_id: string;
  patent_number: string;
  title: string;
  similarity_score: number;
  semantic_overlap: string;
}

interface SimilarityResponse {
  source_patent_id: string;
  source_patent_number: string;
  results: SimilarityResult[];
}

interface ExtractedFeature {
  feature: string;
  category: string;
  relevance: number;
  description: string;
}

interface FeatureExtractionResponse {
  patent_id: string;
  patent_number: string;
  title: string;
  features: ExtractedFeature[];
  technology_domain: string;
  innovation_level: string;
}

interface SemanticSearchResult {
  patent_id: string;
  patent_number: string;
  title: string;
  abstract: string;
  score: number;
  explanation?: string;
}

interface SemanticSearchResponse {
  query: string;
  results: SemanticSearchResult[];
  total: number;
}

interface PriorArtResponse {
  source_patent_id: string;
  source_patent_number: string;
  source_title: string;
  results: PriorArtResult[];
  total_found: number;
}

interface PriorArtResult {
  patent_id: string;
  patent_number: string;
  title: string;
  abstract: string;
  filing_date: string;
  similarity_score: number;
  relevance_reason: string;
  key_overlaps: string[];
}

export const aiService = {
  async summarize(patentId: string, maxLength?: number): Promise<SummarizationResponse> {
    const response = await api.post<SummarizationResponse>("/ai/summarize", {
      patent_id: patentId,
      max_length: maxLength ?? 500,
    });
    return response.data;
  },

  async findSimilar(patentId: string, limit?: number): Promise<SimilarityResponse> {
    const response = await api.post<SimilarityResponse>("/ai/similarity", {
      patent_id: patentId,
      limit: limit ?? 10,
      min_score: 0.0,
    });
    return response.data;
  },

  async extractFeatures(patentId: string): Promise<FeatureExtractionResponse> {
    const response = await api.post<FeatureExtractionResponse>("/ai/features", {
      patent_id: patentId,
    });
    return response.data;
  },

  async semanticSearch(query: string, limit?: number): Promise<SemanticSearchResponse> {
    const response = await api.post<SemanticSearchResponse>("/ai/semantic-search", {
      query,
      limit: limit ?? 20,
    });
    return response.data;
  },

  async findPriorArt(patentId: string, limit?: number): Promise<PriorArtResponse> {
    const response = await api.post<PriorArtResponse>("/ai/prior-art", {
      patent_id: patentId,
      limit: limit ?? 20,
    });
    return response.data;
  },
};

export type {
  SummarizationResponse,
  SimilarityResult,
  SimilarityResponse,
  ExtractedFeature,
  FeatureExtractionResponse,
  SemanticSearchResult,
  SemanticSearchResponse,
  PriorArtResult,
  PriorArtResponse,
};
