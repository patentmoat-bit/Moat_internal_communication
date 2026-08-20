"use client"

import { create } from "zustand"
import type { Patent } from "@/types"
import { MOCK_PATENTS, searchMockPatents, advancedFilterPatents } from "@/lib/mockData"

interface SandboxState {
  enabled: boolean
  patents: Patent[]
  results: Patent[]
  totalResults: number

  toggle: () => void
  enable: () => void
  disable: () => void
  search: (query: string, filters?: any) => void
  getPatentById: (id: string) => Patent | undefined
  exportToProject: () => { patents: Patent[]; query: string }
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  enabled: false,
  patents: MOCK_PATENTS,
  results: [],
  totalResults: 0,

  toggle: () => set((s) => ({ enabled: !s.enabled, results: [], totalResults: 0 })),
  enable: () => set({ enabled: true, results: [], totalResults: 0 }),
  disable: () => set({ enabled: false, results: [], totalResults: 0 }),

  search: (query, filters) => {
    const { patents } = get()
    if (filters && Object.values(filters).some(Boolean)) {
      const filtered = advancedFilterPatents(filters, 50)
      set({ results: filtered, totalResults: filtered.length })
    } else {
      const results = searchMockPatents(query, 50)
      set({ results, totalResults: results.length })
    }
  },

  getPatentById: (id) => {
    return MOCK_PATENTS.find((p) => p.id === id)
  },

  exportToProject: () => {
    const { results } = get()
    return { patents: results, query: "sandbox export" }
  },
}))
