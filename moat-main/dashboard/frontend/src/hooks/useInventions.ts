"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventionService } from "@/services/inventionService";
import { useInventionStore } from "@/stores/inventionStore";
import type { InventionCreateInput, InventionDocumentType } from "@/types/invention";

export function useInventions() {
  return useQuery({ queryKey: ["inventions"], queryFn: inventionService.list, staleTime: 60 * 1000 });
}

export function useInvention(id?: string | null) {
  return useQuery({ queryKey: ["inventions", id], queryFn: () => inventionService.get(id as string), enabled: Boolean(id), staleTime: 60 * 1000 });
}

export function useSaveInventionDraft() {
  const queryClient = useQueryClient();
  const save = useInventionStore((state) => state.createOrUpdateDraft);
  return useMutation({
    mutationFn: (data: InventionCreateInput) => save(data),
    onSuccess: (invention) => {
      queryClient.invalidateQueries({ queryKey: ["inventions"] });
      queryClient.setQueryData(["inventions", invention.id], invention);
    },
  });
}

export function useUploadInventionDocument() {
  const upload = useInventionStore((state) => state.uploadDocument);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, fileType }: { file: File; fileType: InventionDocumentType }) => upload(file, fileType),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ["inventions", doc.invention_id] });
    },
  });
}

export function useAnalyzeInvention() {
  const analyze = useInventionStore((state) => state.analyze);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: analyze,
    onSuccess: (analysis) => {
      queryClient.invalidateQueries({ queryKey: ["inventions"] });
      queryClient.invalidateQueries({ queryKey: ["inventions", analysis.invention_id] });
    },
  });
}

export function useInventionAnalysisHistory() {
  const current = useInventionStore((state) => state.currentInvention);
  const loadHistory = useInventionStore((state) => state.loadHistory);
  return useQuery({ queryKey: ["inventions", current?.id, "analysis-history"], queryFn: loadHistory, enabled: Boolean(current?.id), staleTime: 60 * 1000 });
}
