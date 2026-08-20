"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMatterStore } from "@/stores/matterStore";
import type { MatterCreateInput, MatterDocumentType, MatterMemberRole, MatterStatus, MatterUpdateInput } from "@/types/matter";

export function useMatters() {
  const fetchMatters = useMatterStore((state) => state.fetchMatters);
  return useQuery({ queryKey: ["matters"], queryFn: fetchMatters, staleTime: 60 * 1000 });
}

export function useMatter(id?: string | null) {
  const fetchMatter = useMatterStore((state) => state.fetchMatter);
  return useQuery({ queryKey: ["matters", id], queryFn: () => fetchMatter(id as string), enabled: Boolean(id), staleTime: 60 * 1000 });
}

export function useCreateMatter() {
  const queryClient = useQueryClient();
  const createMatter = useMatterStore((state) => state.createMatter);
  return useMutation({
    mutationFn: (data: MatterCreateInput) => createMatter(data),
    onSuccess: (matter) => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      queryClient.setQueryData(["matters", matter.id], matter);
    },
  });
}

export function useUpdateMatter() {
  const queryClient = useQueryClient();
  const updateMatter = useMatterStore((state) => state.updateMatter);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MatterUpdateInput }) => updateMatter(id, data),
    onSuccess: (matter) => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      queryClient.setQueryData(["matters", matter.id], matter);
    },
  });
}

export function useDeleteMatter() {
  const queryClient = useQueryClient();
  const deleteMatter = useMatterStore((state) => state.deleteMatter);
  return useMutation({ mutationFn: deleteMatter, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matters"] }) });
}

export function useShareMatter() {
  const queryClient = useQueryClient();
  const shareMatter = useMatterStore((state) => state.shareMatter);
  return useMutation({
    mutationFn: ({ matterId, data }: { matterId: string; data: { email?: string; user_id?: string; role: MatterMemberRole; message?: string } }) => shareMatter(matterId, data),
    onSuccess: (_member, variables) => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      queryClient.invalidateQueries({ queryKey: ["matters", variables.matterId] });
    },
  });
}

export function useUpdateMatterStatus() {
  const queryClient = useQueryClient();
  const updateStatus = useMatterStore((state) => state.updateStatus);
  return useMutation({
    mutationFn: ({ matterId, status, note }: { matterId: string; status: MatterStatus; note?: string }) => updateStatus(matterId, status, note),
    onSuccess: (matter) => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      queryClient.invalidateQueries({ queryKey: ["matters", matter.id] });
    },
  });
}

export function useUpdateMatterNotes() {
  const queryClient = useQueryClient();
  const updateNotes = useMatterStore((state) => state.updateNotes);
  return useMutation({
    mutationFn: ({ matterId, notes }: { matterId: string; notes: string }) => updateNotes(matterId, notes),
    onSuccess: (matter) => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      queryClient.invalidateQueries({ queryKey: ["matters", matter.id] });
    },
  });
}

export function useAddMatterDocument() {
  const queryClient = useQueryClient();
  const addDocument = useMatterStore((state) => state.addDocument);
  return useMutation({
    mutationFn: ({ matterId, data }: { matterId: string; data: { filename: string; document_type: MatterDocumentType; content_type?: string; size_bytes?: number; storage_url?: string; description?: string } }) => addDocument(matterId, data),
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      queryClient.invalidateQueries({ queryKey: ["matters", document.matter_id] });
    },
  });
}
