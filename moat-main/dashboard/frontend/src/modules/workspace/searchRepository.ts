import { createAdminClient } from "@/lib/supabase/admin";

export type SearchType = "NOVELTY" | "FTO" | "LANDSCAPE" | "VALIDITY" | "INVALIDITY" | "DESIGN";
export type SearchStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface ProjectSearch {
  id: string;
  project_id: string;
  search_type: SearchType;
  search_status: SearchStatus;
  result_data: any;
  created_by?: string;
  created_at: string;
  completed_at?: string;
  report_id?: string;
}

export class SearchRepository {
  private supabase = createAdminClient();

  async getSearchesForProject(projectId: string) {
    const { data, error } = await this.supabase
      .from("project_searches")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(`Failed to fetch searches for project ${projectId}:`, error);
      return [];
    }

    return (data || []) as ProjectSearch[];
  }

  async getAllSearches(limit: number = 20) {
    const { data, error } = await this.supabase
      .from("project_searches")
      .select(`
        *,
        inventions:project_id(title)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`Failed to fetch all searches:`, error);
      return [];
    }

    return (data || []).map((s: any) => ({
      ...s,
      project_title: s.inventions?.title || "Unknown Project"
    }));
  }

  async getSearchForProject(projectId: string, searchType: SearchType) {
    const { data, error } = await this.supabase
      .from("project_searches")
      .select("*")
      .eq("project_id", projectId)
      .eq("search_type", searchType)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error(`Failed to fetch ${searchType} search for project ${projectId}:`, error);
    }

    return (data || null) as ProjectSearch | null;
  }

  async upsertSearch(
    projectId: string,
    searchType: SearchType,
    resultData: any,
    status: SearchStatus = "COMPLETED",
    userId?: string
  ) {
    const payload: any = {
      project_id: projectId,
      search_type: searchType,
      search_status: status,
      result_data: resultData,
      completed_at: status === "COMPLETED" ? new Date().toISOString() : undefined,
    };

    if (userId) {
      payload.created_by = userId;
    }

    const { data, error } = await this.supabase
      .from("project_searches")
      .upsert(payload, { onConflict: "project_id, search_type" })
      .select()
      .single();

    if (error) {
      console.error(`Failed to upsert ${searchType} search for project ${projectId}:`, error);
      throw error;
    }

    return data as ProjectSearch;
  }

  async updateSearchStatus(id: string, status: SearchStatus) {
    const { data, error } = await this.supabase
      .from("project_searches")
      .update({
        search_status: status,
        completed_at: status === "COMPLETED" ? new Date().toISOString() : undefined,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Failed to update status for search ${id}:`, error);
      throw error;
    }

    return data as ProjectSearch;
  }

  async updateSearchResult(id: string, resultData: any) {
    // Allows independent editing of a search result
    const { data, error } = await this.supabase
      .from("project_searches")
      .update({
        result_data: resultData,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(`Failed to update result for search ${id}:`, error);
      throw error;
    }

    return data as ProjectSearch;
  }
}
