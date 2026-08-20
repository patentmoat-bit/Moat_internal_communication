import { mockNovelty, type NoveltyAssessment } from "@/lib/analysis/novelty";
import { patentIntelligenceService } from "./patentIntelligenceService";
import type { RankedCandidate } from "./types";

export interface NoveltyEngineResult {
  assessment: NoveltyAssessment;
  priorArt: RankedCandidate[];
  ragContext: string[];
}

export class NoveltyService {
  async analyze(invention: string, concepts: string[] = [], userId?: string): Promise<NoveltyEngineResult> {
    const retrieval = await patentIntelligenceService.discoverPriorArt(invention, { userId, limit: 8 });
    const assessment = mockNovelty(invention, concepts.length ? concepts : retrieval.keyConcepts);
    return {
      assessment: {
        ...assessment,
        closest_prior_art: assessment.closest_prior_art.map((art, index) => ({
          ...art,
          title: retrieval.rankedResults[index]?.title || art.title,
          overlap: retrieval.rankedResults[index]?.rankReason || art.overlap,
        })),
      },
      priorArt: retrieval.rankedResults,
      ragContext: retrieval.vectorHits.map((hit) => hit.content),
    };
  }
}

export const noveltyService = new NoveltyService();
