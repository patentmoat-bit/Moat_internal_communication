import { createAdminClient } from "@/lib/supabase/admin";
import { embeddingService, embeddingToPgVector } from "./embeddingService";
import type { VectorDocumentInput, VectorHit, VectorSearchOptions } from "./types";

export class VectorService {
  chunkText(text: string, maxChars = 1400, overlap = 180): string[] {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return [];
    const chunks: string[] = [];
    let cursor = 0;
    while (cursor < clean.length) {
      const end = Math.min(clean.length, cursor + maxChars);
      chunks.push(clean.slice(cursor, end).trim());
      if (end === clean.length) break;
      cursor = Math.max(0, end - overlap);
    }
    return chunks.filter(Boolean);
  }

  async upsertDocument(input: VectorDocumentInput): Promise<{ documentId: string; chunks: number; embedded: boolean }> {
    const chunks = this.chunkText(input.content);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { documentId: `local:${input.sourceType}:${input.sourceId || input.title}`, chunks: chunks.length, embedded: false };
    }

    const supabase = createAdminClient();
    const { data: document, error } = await supabase
      .from("ai_vector_documents")
      .insert({
        user_id: input.userId,
        source_type: input.sourceType,
        source_id: input.sourceId,
        title: input.title,
        content: input.content,
        metadata: input.metadata || {},
      })
      .select("id")
      .single();

    if (error || !document) throw new Error(error?.message || "Failed to create vector document");

    const embeddings = await embeddingService.embedBatch(chunks);
    const rows = chunks.map((chunk, index) => ({
      user_id: input.userId,
      document_id: document.id,
      chunk_index: index,
      content: chunk,
      token_estimate: Math.ceil(chunk.length / 4),
      embedding: embeddingToPgVector(embeddings[index].embedding),
      metadata: { ...(input.metadata || {}), embedding_source: embeddings[index].source },
    }));

    const { error: chunkError } = await supabase.from("ai_vector_chunks").upsert(rows, { onConflict: "document_id,chunk_index" });
    if (chunkError) throw new Error(chunkError.message);

    return { documentId: document.id, chunks: chunks.length, embedded: true };
  }

  async search(query: string, options: VectorSearchOptions = {}): Promise<VectorHit[]> {
    const limit = options.limit ?? 10;
    if (!options.userId || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];

    const queryEmbedding = await embeddingService.embed(query);
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("match_ai_vector_chunks", {
      query_embedding: embeddingToPgVector(queryEmbedding.embedding),
      match_count: limit * 2,
      filter_user_id: options.userId,
      filter_metadata: options.metadata || {},
    });

    if (error) {
      console.warn("[vector] search failed:", error.message);
      return [];
    }

    return (data || [])
      .map((row: any) => this.toHybridHit(row, query, options))
      .sort((a: VectorHit, b: VectorHit) => b.hybridScore - a.hybridScore)
      .slice(0, limit);
  }

  hybridRank<T extends { title?: string; abstract?: string; content?: string; vectorScore?: number; citations?: number }>(query: string, candidates: T[]): Array<T & { lexicalScore: number; hybridScore: number }> {
    return candidates
      .map((candidate) => {
        const lexicalScore = lexicalSimilarity(query, `${candidate.title || ""} ${candidate.abstract || ""} ${candidate.content || ""}`);
        const vectorScore = candidate.vectorScore ?? lexicalScore;
        const citationScore = Math.min(1, Math.log1p(Number(candidate.citations || 0)) / Math.log(100));
        const hybridScore = vectorScore * 0.48 + lexicalScore * 0.38 + citationScore * 0.14;
        return { ...candidate, lexicalScore, hybridScore };
      })
      .sort((a, b) => b.hybridScore - a.hybridScore);
  }

  private toHybridHit(row: any, query: string, options: VectorSearchOptions): VectorHit {
    const vectorScore = Number(row.similarity || 0);
    const lexicalScore = lexicalSimilarity(query, `${row.title || ""} ${row.content || ""}`);
    const vectorWeight = options.vectorWeight ?? 0.62;
    const lexicalWeight = options.lexicalWeight ?? 0.38;
    const hybridScore = vectorScore * vectorWeight + lexicalScore * lexicalWeight;
    return {
      id: row.id,
      documentId: row.document_id,
      sourceType: row.source_type,
      sourceId: row.source_id || undefined,
      title: row.title,
      content: row.content,
      metadata: row.metadata || {},
      vectorScore,
      lexicalScore,
      hybridScore,
    };
  }
}

export const vectorService = new VectorService();

export function lexicalSimilarity(query: string, text: string): number {
  const q = tokenize(query);
  if (!q.length) return 0;
  const haystack = new Set(tokenize(text));
  const hits = q.filter((token) => haystack.has(token)).length;
  return hits / q.length;
}

function tokenize(value: string): string[] {
  return [...new Set((value.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((token) => !STOP.has(token)))];
}

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "into", "using", "method", "system", "device", "patent"]);
