import { api } from "./api";
import type { Patent, PatentSearchResult, SearchFilters, SearchHistory, SavedSearch, SearchAnalytics, AdvancedSearchFilters } from "@/types";

export const searchService = {
  async searchPatents(
    filters: SearchFilters,
    page = 1,
    pageSize = 20
  ): Promise<PatentSearchResult> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));

    if (filters.query) params.set("query", filters.query);
    if (filters.assignee) params.set("assignee", filters.assignee);
    if (filters.status) params.set("status", filters.status);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.cpc_class) params.set("cpc_class", filters.cpc_class);
    if (filters.inventor) params.set("inventor", filters.inventor);

    const response = await api.get<PatentSearchResult>(
      `/search?${params.toString()}`
    );
    return response.data;
  },

  async advancedSearch(
    filters: AdvancedSearchFilters,
    page = 1,
    pageSize = 20
  ): Promise<PatentSearchResult> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));

    const response = await api.post<PatentSearchResult>(
      `/search/advanced?${params.toString()}`,
      filters
    );
    return response.data;
  },

  async getPatent(id: string): Promise<Patent> {
    const response = await api.get<Patent>(`/patents/${id}`);
    return response.data;
  },

  async getSearchHistory(limit = 50): Promise<SearchHistory[]> {
    const response = await api.get<SearchHistory[]>(`/search/history?limit=${limit}`);
    return response.data;
  },

  async clearSearchHistory(): Promise<void> {
    await api.delete("/search/history");
  },

  async getSavedSearches(): Promise<SavedSearch[]> {
    const response = await api.get<SavedSearch[]>("/search/saved");
    return response.data;
  },

  async createSavedSearch(data: {
    name: string;
    query?: string;
    filters?: Record<string, unknown>;
    notify_on_new?: boolean;
  }): Promise<SavedSearch> {
    const response = await api.post<SavedSearch>("/search/saved", data);
    return response.data;
  },

  async deleteSavedSearch(id: string): Promise<void> {
    await api.delete(`/search/saved/${id}`);
  },

  async getSearchAnalytics(): Promise<SearchAnalytics> {
    const response = await api.get<SearchAnalytics>("/search/analytics");
    return response.data;
  },
};
