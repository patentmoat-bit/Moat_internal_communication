"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { collectionService } from "@/services/collectionService";
import { useCollectionStore } from "@/stores/collectionStore";
import type { Collection } from "@/types";

export function useCollections() {
  const setCollections = useCollectionStore((s) => s.setCollections);

  return useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const data = await collectionService.getCollections();
      setCollections(data);
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useCollection(id: string) {
  const setActiveCollection = useCollectionStore((s) => s.setActiveCollection);

  return useQuery({
    queryKey: ["collections", id],
    queryFn: async () => {
      const data = await collectionService.getCollection(id);
      setActiveCollection(data);
      return data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const addCollection = useCollectionStore((s) => s.addCollection);

  return useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      collectionService.createCollection(data),
    onSuccess: (newCollection) => {
      addCollection(newCollection);
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const updateCollection = useCollectionStore((s) => s.updateCollection);

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Collection> }) =>
      collectionService.updateCollection(id, data),
    onSuccess: (updated) => {
      updateCollection(updated.id, updated);
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collections", updated.id] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const removeCollection = useCollectionStore((s) => s.removeCollection);

  return useMutation({
    mutationFn: (id: string) => collectionService.deleteCollection(id),
    onSuccess: (_, id) => {
      removeCollection(id);
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useAddPatentToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      collectionId,
      patentId,
    }: {
      collectionId: string;
      patentId: string;
    }) => collectionService.addPatentToCollection(collectionId, patentId),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections", variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useRemovePatentFromCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      collectionId,
      patentId,
    }: {
      collectionId: string;
      patentId: string;
    }) => collectionService.removePatentFromCollection(collectionId, patentId),
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections", variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}
