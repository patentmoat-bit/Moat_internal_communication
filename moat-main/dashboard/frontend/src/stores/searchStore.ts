import { create } from "zustand";
import type { SearchHistory, SearchFilters, AdvancedSearchFilters, PatentSearchResult } from "@/types";

interface SearchState {
  recentSearches: SearchHistory[];
  currentFilters: SearchFilters;
  advancedFilters: AdvancedSearchFilters;
  results: PatentSearchResult | null;
  setFilters: (filters: SearchFilters) => void;
  setAdvancedFilters: (filters: AdvancedSearchFilters) => void;
  setResults: (results: PatentSearchResult) => void;
  addRecentSearch: (search: SearchHistory) => void;
  setRecentSearches: (searches: SearchHistory[]) => void;
  clearResults: () => void;
}

const defaultFilters: SearchFilters = {
  query: "",
};

const defaultAdvancedFilters: AdvancedSearchFilters = {};

export const useSearchStore = create<SearchState>((set) => ({
  recentSearches: [],
  currentFilters: defaultFilters,
  advancedFilters: defaultAdvancedFilters,
  results: null,

  setFilters: (filters) => {
    set({ currentFilters: filters });
  },

  setAdvancedFilters: (filters) => {
    set({ advancedFilters: filters });
  },

  setResults: (results) => {
    set({ results });
  },

  addRecentSearch: (search) => {
    set((state) => ({
      recentSearches: [search, ...state.recentSearches].slice(0, 20),
    }));
  },

  setRecentSearches: (searches) => {
    set({ recentSearches: searches });
  },

  clearResults: () => {
    set({ results: null, currentFilters: defaultFilters, advancedFilters: defaultAdvancedFilters });
  },
}));
