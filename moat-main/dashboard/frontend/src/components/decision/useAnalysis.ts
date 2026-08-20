"use client";

import { useCallback, useState } from "react";

/**
 * Shared fetch lifecycle for the analysis pages (novelty, FTO). Posts
 * { query, concepts } to an endpoint and tracks loading/error/result.
 */
export function useAnalysis<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (query: string, concepts: string[], extraPayload?: Record<string, any>) => {
      const q = query.trim();
      if (!q) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q, concepts, ...extraPayload }),
        });
        if (!res.ok) {
          throw new Error((await res.json().catch(() => ({})))?.error || "Analysis failed");
        }
        setData((await res.json()) as T);
      } catch (e) {
        setError((e as Error).message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [endpoint],
  );

  return { data, loading, error, run };
}
