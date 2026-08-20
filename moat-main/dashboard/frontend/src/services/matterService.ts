import { fetchApi } from "@/lib/apiClient";
import type { Matter, MatterActivity, MatterCreateInput, MatterDocument, MatterDocumentType, MatterMember, MatterMemberRole, MatterStatus, MatterUpdateInput } from "@/types/matter";

export const matterService = {
  listMatters: () => fetchApi<Matter[]>("/matters"),
  getMatter: (id: string) => fetchApi<Matter>(`/matters/${id}`),
  createMatter: (data: MatterCreateInput) => fetchApi<Matter>("/matters", { method: "POST", body: JSON.stringify(data) }),
  updateMatter: (id: string, data: MatterUpdateInput) => fetchApi<Matter>(`/matters/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMatter: (id: string) => fetchApi<void>(`/matters/${id}`, { method: "DELETE" }),
  assignMember: (matterId: string, data: { email?: string; user_id?: string; role: MatterMemberRole }) => fetchApi<MatterMember>(`/matters/${matterId}/members`, { method: "POST", body: JSON.stringify(data) }),
  shareMatter: (matterId: string, data: { email?: string; user_id?: string; role: MatterMemberRole; message?: string }) => fetchApi<MatterMember>(`/matters/${matterId}/share`, { method: "POST", body: JSON.stringify(data) }),
  updateMember: (matterId: string, memberId: string, role: MatterMemberRole) => fetchApi<MatterMember>(`/matters/${matterId}/members/${memberId}`, { method: "PATCH", body: JSON.stringify({ role }) }),
  removeMember: (matterId: string, memberId: string) => fetchApi<void>(`/matters/${matterId}/members/${memberId}`, { method: "DELETE" }),
  updateStatus: (matterId: string, status: MatterStatus, note?: string) => fetchApi<Matter>(`/matters/${matterId}/status`, { method: "POST", body: JSON.stringify({ status, note }) }),
  updateNotes: (matterId: string, notes: string) => fetchApi<Matter>(`/matters/${matterId}/notes`, { method: "PUT", body: JSON.stringify({ notes }) }),
  listActivity: (matterId: string) => fetchApi<MatterActivity[]>(`/matters/${matterId}/activity`),
  addDocument: (matterId: string, data: { filename: string; document_type: MatterDocumentType; content_type?: string; size_bytes?: number; storage_url?: string; description?: string }) => fetchApi<MatterDocument>(`/matters/${matterId}/documents`, { method: "POST", body: JSON.stringify(data) }),
  deleteDocument: (matterId: string, documentId: string) => fetchApi<void>(`/matters/${matterId}/documents/${documentId}`, { method: "DELETE" }),
};
