import { getOpenAI } from "@/lib/openai";
import type { EmbeddingResult } from "./types";

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const DIMENSIONS = 1536;

export class EmbeddingService {
  async embed(text: string): Promise<EmbeddingResult> {
    const normalized = normalizeText(text);
    const openai = getOpenAI();

    if (openai && normalized) {
      try {
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: normalized.slice(0, 12000),
        });
        const embedding = response.data[0]?.embedding || [];
        if (embedding.length) {
          return { text: normalized, embedding, model: EMBEDDING_MODEL, dimensions: embedding.length, source: "openai" };
        }
      } catch (err) {
        console.warn("[embedding] OpenAI embedding failed:", (err as Error).message);
      }
    }

    return {
      text: normalized,
      embedding: deterministicEmbedding(normalized, DIMENSIONS),
      model: "deterministic-local-embedding",
      dimensions: DIMENSIONS,
      source: "deterministic",
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }

  cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    if (!len) return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    if (!magA || !magB) return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }
}

export const embeddingService = new EmbeddingService();

export function embeddingToPgVector(embedding: number[]): string {
  return `[${embedding.map((value) => Number(value).toFixed(8)).join(",")}]`;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function deterministicEmbedding(text: string, dimensions: number): number[] {
  const vector = new Array(dimensions).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) || ["empty"];
  for (const token of tokens) {
    let h = hash(token);
    for (let i = 0; i < 4; i++) {
      h = hash(`${token}:${h}:${i}`);
      const index = h % dimensions;
      vector[index] += h % 2 === 0 ? 1 : -1;
    }
  }
  const mag = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / mag);
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
