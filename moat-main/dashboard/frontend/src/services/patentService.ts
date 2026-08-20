import { api } from "./api";
import type { Patent } from "@/types";

export const patentService = {
  async getPatent(id: string): Promise<Patent> {
    const response = await api.get<Patent>(`/patents/${id}`);
    return response.data;
  },

  async savePatent(patentId: string): Promise<void> {
    await api.post("/patents/saved", { patent_id: patentId });
  },

  async unsavePatent(patentId: string): Promise<void> {
    await api.delete("/patents/saved", { data: { patent_id: patentId } });
  },

  async getSavedPatents(): Promise<Patent[]> {
    const response = await api.get<Patent[]>("/patents/saved");
    return response.data;
  },
};
