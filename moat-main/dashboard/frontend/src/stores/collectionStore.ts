import { create } from "zustand";
import type { Collection } from "@/types";

interface CollectionState {
  collections: Collection[];
  activeCollection: Collection | null;
  setCollections: (collections: Collection[]) => void;
  setActiveCollection: (collection: Collection | null) => void;
  addCollection: (collection: Collection) => void;
  updateCollection: (id: string, data: Partial<Collection>) => void;
  removeCollection: (id: string) => void;
}

export const useCollectionStore = create<CollectionState>((set) => ({
  collections: [],
  activeCollection: null,

  setCollections: (collections) => {
    set({ collections });
  },

  setActiveCollection: (collection) => {
    set({ activeCollection: collection });
  },

  addCollection: (collection) => {
    set((state) => ({
      collections: [...state.collections, collection],
    }));
  },

  updateCollection: (id, data) => {
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
      activeCollection:
        state.activeCollection?.id === id
          ? { ...state.activeCollection, ...data }
          : state.activeCollection,
    }));
  },

  removeCollection: (id) => {
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
      activeCollection:
        state.activeCollection?.id === id
          ? null
          : state.activeCollection,
    }));
  },
}));
