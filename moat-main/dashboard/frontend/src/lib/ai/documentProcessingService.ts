import { vectorService } from "./vectorService";
import type { VectorDocumentInput } from "./types";

export interface ProcessedDocument {
  title: string;
  sourceType: string;
  content: string;
  chunks: string[];
  metadata: Record<string, unknown>;
}

export class DocumentProcessingService {
  processTextDocument(input: { title: string; content: string; sourceType?: string; metadata?: Record<string, unknown> }): ProcessedDocument {
    const content = normalizeDocument(input.content);
    return {
      title: input.title,
      sourceType: input.sourceType || "document",
      content,
      chunks: vectorService.chunkText(content),
      metadata: {
        ...(input.metadata || {}),
        char_count: content.length,
        word_count: content.split(/\s+/).filter(Boolean).length,
      },
    };
  }

  async ingestForRag(input: VectorDocumentInput): Promise<{ documentId: string; chunks: number; embedded: boolean }> {
    return vectorService.upsertDocument(input);
  }

  extractClaims(text: string): string[] {
    const normalized = normalizeDocument(text);
    const claimMatches = normalized.match(/(?:^|\n)\s*\d+\.\s+([\s\S]*?)(?=(?:\n\s*\d+\.)|$)/g);
    if (claimMatches?.length) return claimMatches.map((claim) => claim.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean);
    return normalized.split(/\n{2,}/).filter((part) => /wherein|comprising|configured to|method|system/i.test(part)).slice(0, 10);
  }

  extractTechnicalFeatures(text: string): string[] {
    const tokens = normalizeDocument(text).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [];
    const phrases = new Set<string>();
    for (let i = 0; i < tokens.length - 1; i++) phrases.add(`${tokens[i]} ${tokens[i + 1]}`);
    return [...phrases].filter((phrase) => !STOP_PHRASES.some((stop) => phrase.includes(stop))).slice(0, 20);
  }
}

export const documentProcessingService = new DocumentProcessingService();

function normalizeDocument(text: string): string {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

const STOP_PHRASES = ["this invention", "the present", "and the", "with the", "from the"];
