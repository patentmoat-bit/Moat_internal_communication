"use client";

import { useQuery } from "@tanstack/react-query";
import { visualizationService } from "@/services/visualizationService";

export function useCitationGraph(patentId: string, depth = 2) {
  return useQuery({
    queryKey: ["visualization", "citation-graph", patentId, depth],
    queryFn: () => visualizationService.getCitationGraph(patentId, depth),
    enabled: !!patentId,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useTechnologyTree() {
  return useQuery({
    queryKey: ["visualization", "technology-tree"],
    queryFn: () => visualizationService.getTechnologyTree(),
    staleTime: 60 * 60 * 1000,
  });
}

export function usePatentRelationships(patentId: string) {
  return useQuery({
    queryKey: ["visualization", "relationships", patentId],
    queryFn: () => visualizationService.getPatentRelationships(patentId),
    enabled: !!patentId,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useGraphStats() {
  return useQuery({
    queryKey: ["visualization", "stats"],
    queryFn: () => visualizationService.getGraphStats(),
    staleTime: 60 * 60 * 1000,
  });
}
