import { fetchApi } from "@/lib/apiClient";
import type { Invention, InventionAnalysis, InventionCreateInput, InventionDocument, InventionDocumentType } from "@/types/invention";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const inventionService = {
  list: () => fetchApi<Invention[]>("/inventions"),
  create: (data: InventionCreateInput) => fetchApi<Invention>("/inventions", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<InventionCreateInput>) => fetchApi<Invention>(`/inventions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  get: (id: string) => fetchApi<Invention>(`/inventions/${id}`),
  analyze: (id: string) => fetchApi<{ invention: Invention; analysis: InventionAnalysis; task_id?: string | null }>(`/inventions/${id}/analyze`, { method: "POST" }),
  analysis: (id: string) => fetchApi<InventionAnalysis>(`/inventions/${id}/analysis`),
  history: (id: string) => fetchApi<InventionAnalysis[]>(`/inventions/${id}/analysis/history`),
  async upload(inventionId: string, file: File, fileType: InventionDocumentType): Promise<InventionDocument> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const form = new FormData();
    form.append("invention_id", inventionId);
    form.append("file_type", fileType);
    form.append("file", file);
    const response = await fetch(`${API_BASE_URL}/inventions/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Upload failed");
    }
    return response.json();
  },
};
