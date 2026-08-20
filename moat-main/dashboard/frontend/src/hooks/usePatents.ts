"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patentService } from "@/services/patentService";

export function useSavedPatents() {
  return useQuery({
    queryKey: ["patents", "saved"],
    queryFn: () => patentService.getSavedPatents(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSavePatent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patentId: string) => patentService.savePatent(patentId),
    onMutate: async (patentId) => {
      await queryClient.cancelQueries({ queryKey: ["patents", "saved"] });
      const previous = queryClient.getQueryData(["patents", "saved"]);
      return { previous };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["patents", "saved"] });
      queryClient.invalidateQueries({ queryKey: ["patents", patentService] });
    },
  });
}

export function useUnsavePatent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patentId: string) => patentService.unsavePatent(patentId),
    onMutate: async (patentId) => {
      await queryClient.cancelQueries({ queryKey: ["patents", "saved"] });
      const previous = queryClient.getQueryData(["patents", "saved"]);
      return { previous };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["patents", "saved"] });
    },
  });
}
