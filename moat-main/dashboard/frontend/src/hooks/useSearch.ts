"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchService } from "@/services/searchService";
import { useSearchStore } from "@/stores/searchStore";
import type { SearchFilters, AdvancedSearchFilters } from "@/types";

export function useSearchPatents() {
  const { currentFilters, setResults, addRecentSearch } = useSearchStore();

  return useQuery({
    queryKey: ["patents", "search", currentFilters],
    queryFn: async () => {
      const result = await searchService.searchPatents(currentFilters);
      setResults(result);
      addRecentSearch({
        id: crypto.randomUUID(),
        query: currentFilters.query,
        filters: currentFilters,
        result_count: result.total,
        created_at: new Date().toISOString(),
      });
      return result;
    },
    enabled: currentFilters.query.length > 0,
    staleTime: 30 * 1000,
  });
}

export function useAdvancedSearch() {
  const { advancedFilters, setResults, addRecentSearch } = useSearchStore();

  return useQuery({
    queryKey: ["patents", "advanced-search", advancedFilters],
    queryFn: async () => {
      const result = await searchService.advancedSearch(advancedFilters);
      setResults(result);
      addRecentSearch({
        id: crypto.randomUUID(),
        query: advancedFilters.query || "",
        filters: advancedFilters as unknown as SearchFilters,
        result_count: result.total,
        created_at: new Date().toISOString(),
      });
      return result;
    },
    enabled: false,
    staleTime: 30 * 1000,
  });
}

export function usePatent(id: string) {
  return useQuery({
    queryKey: ["patents", id],
    queryFn: () => searchService.getPatent(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchHistory() {
  return useQuery({
    queryKey: ["search-history"],
    queryFn: () => searchService.getSearchHistory(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useClearSearchHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => searchService.clearSearchHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
    },
  });
}

export function useSavedSearches() {
  return useQuery({
    queryKey: ["saved-searches"],
    queryFn: () => searchService.getSavedSearches(),
    staleTime: 60 * 1000,
  });
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; query?: string; filters?: Record<string, unknown> }) =>
      searchService.createSavedSearch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => searchService.deleteSavedSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
    },
  });
}

export function useSearchAnalytics() {
  return useQuery({
    queryKey: ["search-analytics"],
    queryFn: () => searchService.getSearchAnalytics(),
    staleTime: 5 * 60 * 1000,
  });
}
