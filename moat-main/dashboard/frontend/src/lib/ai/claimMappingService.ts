import { lexicalSimilarity } from "./vectorService";
import type { RankedCandidate } from "./types";

export interface ClaimMappingResult {
  claim: string;
  mappedReferences: Array<{ referenceId: string; title: string; overlapScore: number; overlappingTerms: string[]; gap: string }>;
  status: "novel" | "partially disclosed" | "high overlap";
}

export class ClaimMappingService {
  mapClaims(claims: string[], priorArt: RankedCandidate[]): ClaimMappingResult[] {
    return claims.map((claim) => {
      const mappedReferences = priorArt.slice(0, 8).map((reference) => {
        const text = `${reference.title} ${reference.abstract || ""}`;
        const overlapScore = Math.round(lexicalSimilarity(claim, text) * 100);
        return {
          referenceId: reference.id,
          title: reference.title,
          overlapScore,
          overlappingTerms: overlappingTerms(claim, text),
          gap: overlapScore > 70 ? "Narrow claim language or add technical limitations." : overlapScore > 35 ? "Preserve combination language and dependent fallback claims." : "Low direct overlap; keep as potential differentiator.",
        };
      }).sort((a, b) => b.overlapScore - a.overlapScore);

      const top = mappedReferences[0]?.overlapScore || 0;
      return {
        claim,
        mappedReferences,
        status: top > 70 ? "high overlap" : top > 35 ? "partially disclosed" : "novel",
      };
    });
  }
}

export const claimMappingService = new ClaimMappingService();

function overlappingTerms(a: string, b: string): string[] {
  const bTerms = new Set((b.toLowerCase().match(/[a-z0-9]{4,}/g) || []));
  return [...new Set(a.toLowerCase().match(/[a-z0-9]{4,}/g) || [])].filter((term) => bTerms.has(term)).slice(0, 12);
}
