import { claimMappingService } from "./claimMappingService";
import { documentProcessingService } from "./documentProcessingService";
import { noveltyService } from "./noveltyService";
import { patentabilityService } from "./patentabilityService";
import { patentIntelligenceService } from "./patentIntelligenceService";
import { recommendationService } from "./recommendationService";
import type { AgentWorkflowInput, AgentWorkflowOutput } from "./types";

export class AgentWorkflowService {
  async run(input: AgentWorkflowInput): Promise<AgentWorkflowOutput> {
    const stages: AgentWorkflowOutput["stages"] = [];
    const query = input.invention || input.query;

    if (input.userId && input.documents?.length) {
      for (const document of input.documents) {
        const processed = documentProcessingService.processTextDocument(document);
        await documentProcessingService.ingestForRag({
          userId: input.userId,
          sourceType: document.sourceType || processed.sourceType,
          title: processed.title,
          content: processed.content,
          metadata: processed.metadata,
        });
      }
      stages.push({ name: "Document Processing + Vector Ingest", status: "completed", summary: `${input.documents.length} documents chunked and submitted to the vector store.` });
    } else {
      stages.push({ name: "Document Processing + Vector Ingest", status: "skipped", summary: "No userId/documents supplied for vector ingest." });
    }

    const retrieval = await patentIntelligenceService.discoverPriorArt(query, { userId: input.userId, limit: 10 });
    stages.push({ name: "RAG + Hybrid Retrieval", status: retrieval.vectorHits.length ? "completed" : "fallback", summary: `${retrieval.rankedResults.length} candidates ranked using vector, lexical, and citation signals.` });

    const claims = input.claims?.length ? input.claims : documentProcessingService.extractClaims(query);
    const claimMapping = claimMappingService.mapClaims(claims.length ? claims : [query], retrieval.rankedResults);
    stages.push({ name: "Claim Mapping", status: "completed", summary: `${claimMapping.length} claims mapped against ranked prior art.` });

    const novelty = await noveltyService.analyze(query, retrieval.keyConcepts, input.userId);
    stages.push({ name: "Novelty Analysis", status: "completed", summary: `Novelty score ${novelty.assessment.novelty_score}.` });

    const patentability = patentabilityService.evaluate(query, retrieval.keyConcepts, claimMapping);
    stages.push({ name: "Patentability Analysis", status: "completed", summary: `Patentability score ${patentability.patentability_score}.` });

    const recommendation = recommendationService.recommend({ novelty: novelty.assessment, patentability, riskSignals: claimMapping.map((mapping) => mapping.mappedReferences[0]?.overlapScore || 0) });
    stages.push({ name: "Recommendation Agent", status: "completed", summary: `${recommendation.action} with ${recommendation.confidence}% confidence.` });

    return {
      query,
      stages,
      retrieval: retrieval.vectorHits,
      rankedPriorArt: retrieval.rankedResults,
      novelty: novelty.assessment,
      claimMapping,
      patentability,
      recommendation,
    };
  }
}

export const agentWorkflowService = new AgentWorkflowService();
