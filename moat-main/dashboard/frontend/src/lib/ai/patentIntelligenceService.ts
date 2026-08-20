import { searchGooglePatents } from "@/lib/googlePatents";
import { searchPatentsFromBigQuery } from "@/lib/bigquery";
import { generateMockSearchResults } from "@/lib/mockSearchData";
import { vectorService } from "./vectorService";
import type { RankedCandidate, RankingCandidate, VectorHit, VectorSearchOptions } from "./types";

export interface PatentIntelligenceResult {
  query: string;
  retrievalMode: "rag" | "hybrid" | "fallback";
  vectorHits: VectorHit[];
  rankedResults: RankedCandidate[];
  keyConcepts: string[];
}

export class PatentIntelligenceService {
  async discoverPriorArt(query: string, options: VectorSearchOptions = {}): Promise<PatentIntelligenceResult> {
    const [vectorHits, patentCandidates] = await Promise.all([
      vectorService.search(query, { ...options, limit: options.limit ?? 8 }),
      this.searchPatents(query, options.limit ?? 10),
    ]);

    const vectorCandidates: RankingCandidate[] = vectorHits.map((hit) => ({
      id: hit.id,
      title: hit.title,
      abstract: hit.content,
      source: hit.sourceType,
      vectorScore: hit.vectorScore,
      lexicalScore: hit.lexicalScore,
      metadata: { ...hit.metadata, documentId: hit.documentId, sourceId: hit.sourceId },
    }));

    const rankedResults = this.multiStageRank(query, [...vectorCandidates, ...patentCandidates]);
    return {
      query,
      retrievalMode: vectorHits.length ? "rag" : patentCandidates.length ? "hybrid" : "fallback",
      vectorHits,
      rankedResults,
      keyConcepts: extractConcepts(query),
    };
  }

  multiStageRank(query: string, candidates: RankingCandidate[]): RankedCandidate[] {
    const ranked = vectorService.hybridRank(query, candidates.map((candidate) => ({
      ...candidate,
      content: candidate.abstract,
      citations: Number(candidate.metadata?.citations || 0),
    })));

    return ranked.map((candidate, index) => ({
      id: candidate.id,
      title: candidate.title,
      abstract: candidate.abstract,
      source: candidate.source,
      metadata: candidate.metadata,
      vectorScore: candidate.vectorScore,
      lexicalScore: candidate.lexicalScore,
      citationScore: candidate.citationScore,
      recencyScore: candidate.recencyScore,
      finalScore: Math.round(candidate.hybridScore * 100),
      rank: index + 1,
      rankReason: `Hybrid rank combines semantic/vector overlap, lexical claim-term overlap, and citation signal for "${query.slice(0, 80)}".`,
    }));
  }

  private async searchPatents(query: string, limit: number): Promise<RankingCandidate[]> {
    let results: any[] = [];
    try {
      results = await searchPatentsFromBigQuery(query);
    } catch (err) {
      console.error("BigQuery failed in PatentIntelligenceService, falling back:", err);
    }
    
    if (!results || results.length === 0) {
      const data: any = await searchGooglePatents(query, { resultsCount: limit });
      results = data.results || [];
    }
    
    if (!results || results.length === 0) {
      const mockData = generateMockSearchResults(query, { resultsCount: limit });
      results = mockData.results || [];
    }

    return results.map((result: any) => ({
      id: result.patent_number || result.id || result.title,
      title: result.title || "Untitled patent",
      abstract: result.abstract || result.relevance_reason || "",
      source: "patent",
      lexicalScore: (result.ai_match_score || 70) / 100,
      citationScore: Math.min(1, Math.log1p(Number(result.citations || 0)) / Math.log(100)),
      metadata: result,
    }));
  }
}

export const patentIntelligenceService = new PatentIntelligenceService();

function extractConcepts(query: string): string[] {
  return [...new Set(query.toLowerCase().match(/[a-z0-9]{4,}/g) || [])].slice(0, 10);
}
