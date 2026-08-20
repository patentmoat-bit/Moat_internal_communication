import { api } from "./api";
import type { Collection } from "@/types";

export const collectionService = {
  async getCollections(): Promise<Collection[]> {
    const response = await api.get<Collection[]>("/collections");
    return response.data;
  },

  async getCollection(id: string): Promise<Collection> {
    const response = await api.get<Collection>(`/collections/${id}`);
    return response.data;
  },

  async createCollection(data: {
    name: string;
    description: string;
  }): Promise<Collection> {
    const response = await api.post<Collection>("/collections", data);
    return response.data;
  },

  async updateCollection(
    id: string,
    data: Partial<Collection>
  ): Promise<Collection> {
    const response = await api.patch<Collection>(`/collections/${id}`, data);
    return response.data;
  },

  async deleteCollection(id: string): Promise<void> {
    await api.delete(`/collections/${id}`);
  },

  async addPatentToCollection(
    collectionId: string,
    patentId: string
  ): Promise<void> {
    await api.post(`/collections/${collectionId}/patents`, {
      patent_id: patentId,
    });
  },

  async removePatentFromCollection(
    collectionId: string,
    patentId: string
  ): Promise<void> {
    await api.delete(`/collections/${collectionId}/patents/${patentId}`);
  },
};
