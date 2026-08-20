import { fetchApi } from "@/lib/apiClient";

export interface ClaimOverlap {
  element: string;
  found_in_prior_art: boolean;
  confidence_score: number;
  prior_art_reference?: string;
  snippet?: string;
}

export interface NoveltyResponse {
  invention_id: string;
  novelty_score: number;
  similarity_score: number;
  risk_level: "Low" | "Medium" | "High";
  white_space_opportunities: string[];
  claim_overlaps: ClaimOverlap[];
  closest_prior_art_ids: string[];
}

export interface PatentabilityResponse {
  invention_id: string;
  patentability_score: number;
  novelty_assessment: string;
  utility_assessment: string;
  non_obviousness_assessment: string;
  defensibility_score: number;
  commercial_value_score: number;
  filing_recommendation: string;
  overall_risk: "Low" | "Medium" | "High";
}

export const intelligenceService = {
  async assessNovelty(inventionId: string, description?: string, targetClaims?: string[]): Promise<NoveltyResponse> {
    return fetchApi<NoveltyResponse>("/intelligence/novelty", {
      method: "POST",
      body: JSON.stringify({
        invention_id: inventionId,
        description,
        target_claims: targetClaims
      })
    });
  },

  async assessPatentability(inventionId: string, includeCommercialValue: boolean = true): Promise<PatentabilityResponse> {
    return fetchApi<PatentabilityResponse>("/intelligence/patentability", {
      method: "POST",
      body: JSON.stringify({
        invention_id: inventionId,
        include_commercial_value: includeCommercialValue
      })
    });
  }
};
