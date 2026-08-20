"use client";

import { useQuery } from "@tanstack/react-query";
import { aiService } from "@/services/aiService";

export function usePatentSummary(patentId: string) {
  return useQuery({
    queryKey: ["ai", "summary", patentId],
    queryFn: () => aiService.summarize(patentId),
    enabled: !!patentId,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function usePatentSimilarity(patentId: string) {
  return useQuery({
    queryKey: ["ai", "similarity", patentId],
    queryFn: () => aiService.findSimilar(patentId),
    enabled: !!patentId,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function usePatentFeatures(patentId: string) {
  return useQuery({
    queryKey: ["ai", "features", patentId],
    queryFn: () => aiService.extractFeatures(patentId),
    enabled: !!patentId,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useSemanticSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["ai", "semantic-search", query],
    queryFn: () => aiService.semanticSearch(query),
    enabled: enabled && !!query,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export function usePriorArt(patentId: string) {
  return useQuery({
    queryKey: ["ai", "prior-art", patentId],
    queryFn: () => aiService.findPriorArt(patentId),
    enabled: !!patentId,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
