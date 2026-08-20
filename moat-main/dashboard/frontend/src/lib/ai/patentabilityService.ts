import { mockPatentability, type PatentabilityAssessment } from "@/lib/analysis/patentability";
import type { ClaimMappingResult } from "./claimMappingService";

export class PatentabilityService {
  evaluate(invention: string, concepts: string[] = [], mappings: ClaimMappingResult[] = []): PatentabilityAssessment {
    const assessment = mockPatentability(invention, concepts);
    const highOverlap = mappings.filter((mapping) => mapping.status === "high overlap").length;
    if (!highOverlap) return assessment;

    const risk_score = Math.min(95, assessment.risk_score + highOverlap * 6);
    const patentability_score = Math.max(5, assessment.patentability_score - highOverlap * 4);
    return {
      ...assessment,
      patentability_score,
      risk_score,
      recommendation: {
        ...assessment.recommendation,
        action: patentability_score < 58 ? "Conduct More Research" : assessment.recommendation.action,
        next_steps: ["Review high-overlap claim mappings", ...assessment.recommendation.next_steps],
      },
    };
  }
}

export const patentabilityService = new PatentabilityService();
