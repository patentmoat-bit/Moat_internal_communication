import { api } from "./api";

interface CitationGraphResponse {
  nodes: Array<{ id: string; patent_number: string; title: string; assignee: string; filing_year: string; citation_count: number; group: string }>;
  links: Array<{ source: string; target: string; type: string; label: string }>;
}

interface TechnologyTreeResponse {
  root: { id: string; name: string; value: number; children: any[] };
}

interface PatentRelationshipsResponse {
  patent_id: string;
  patent_number: string;
  title: string;
  relationships: Array<{
    source_id: string;
    source_number: string;
    source_title: string;
    target_id: string;
    target_number: string;
    target_title: string;
    relationship: string;
    strength: number;
  }>;
}

interface GraphStatsResponse {
  total_nodes: number;
  total_edges: number;
  top_cpc_classes: Array<{ code: string; count: number }>;
  top_assignees: Array<{ name: string; count: number }>;
  citation_network_stats: Record<string, any>;
}

export const visualizationService = {
  async getCitationGraph(patentId: string, depth = 2): Promise<CitationGraphResponse> {
    const response = await api.post<CitationGraphResponse>("/visualization/citation-graph", {
      patent_id: patentId,
      depth,
    });
    return response.data;
  },

  async getTechnologyTree(): Promise<TechnologyTreeResponse> {
    const response = await api.get<TechnologyTreeResponse>("/visualization/technology-tree");
    return response.data;
  },

  async getPatentRelationships(patentId: string): Promise<PatentRelationshipsResponse> {
    const response = await api.post<PatentRelationshipsResponse>("/visualization/relationships", {
      patent_id: patentId,
    });
    return response.data;
  },

  async getGraphStats(): Promise<GraphStatsResponse> {
    const response = await api.get<GraphStatsResponse>("/visualization/stats");
    return response.data;
  },
};

export type { CitationGraphResponse, TechnologyTreeResponse, PatentRelationshipsResponse, GraphStatsResponse };
