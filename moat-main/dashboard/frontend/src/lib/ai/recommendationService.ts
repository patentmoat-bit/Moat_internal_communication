import type { PatentabilityAssessment } from "@/lib/analysis/patentability";
import type { NoveltyAssessment } from "@/lib/analysis/novelty";

export interface RecommendationDecision {
  action: "File Patent" | "Improve Invention" | "Conduct More Research" | "Do Not File";
  confidence: number;
  rationale: string;
  nextSteps: string[];
}

export class RecommendationService {
  recommend(input: { novelty?: NoveltyAssessment; patentability?: PatentabilityAssessment; riskSignals?: number[] }): RecommendationDecision {
    const noveltyScore = input.novelty?.novelty_score ?? 55;
    const patentabilityScore = input.patentability?.patentability_score ?? 55;
    const risk = Math.max(input.novelty?.risk_score ?? 40, input.patentability?.risk_score ?? 40, ...(input.riskSignals || [0]));
    const composite = Math.round(patentabilityScore * 0.45 + noveltyScore * 0.35 + (100 - risk) * 0.2);

    if (composite >= 76 && risk < 55) {
      return { action: "File Patent", confidence: composite, rationale: "Strong novelty, acceptable risk, and favorable patentability support filing.", nextSteps: ["Prepare attorney review package", "Draft independent and dependent claims", "Run final prior-art clearance"] };
    }
    if (composite >= 60) {
      return { action: "Improve Invention", confidence: composite, rationale: "Patent path exists, but claim scope or disclosure should be strengthened first.", nextSteps: ["Address weak criteria", "Add technical evidence", "Refine claim mappings"] };
    }
    if (composite >= 45) {
      return { action: "Conduct More Research", confidence: composite, rationale: "Evidence is insufficient for a confident filing decision.", nextSteps: ["Expand prior-art search", "Validate differentiators", "Re-score after evidence"] };
    }
    return { action: "Do Not File", confidence: composite, rationale: "Current risk and weak patentability do not justify filing spend.", nextSteps: ["Develop stronger technical contribution", "Consider trade-secret strategy", "Revisit after prototype evidence"] };
  }
}

export const recommendationService = new RecommendationService();
