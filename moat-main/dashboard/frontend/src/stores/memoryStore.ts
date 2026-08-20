"use client"

import { create } from "zustand"

interface MemoryState {
  seenPatentIds: string[]
  currentSessionNewIds: string[]

  markSeen: (patentId: string) => void
  isSeen: (patentId: string) => boolean
  tagResults: <T extends { id: string }>(patents: T[]) => Array<T & { status: "NEW" | "SEEN" }>
  getSummary: <T extends { id: string }>(patents: T[]) => { total: number; newCount: number; seenCount: number }
  resetMemory: () => void
  loadFromStorage: () => void
  saveToStorage: () => void
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  seenPatentIds: [],
  currentSessionNewIds: [],

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem("patent-memory")
      if (raw) {
        const data = JSON.parse(raw)
        set({ seenPatentIds: data.seenPatentIds || [], currentSessionNewIds: [] })
      }
    } catch {}
  },

  saveToStorage: () => {
    try {
      localStorage.setItem("patent-memory", JSON.stringify({ seenPatentIds: get().seenPatentIds }))
    } catch {}
  },

  markSeen: (patentId) => {
    set((s) => {
      if (s.seenPatentIds.includes(patentId)) return s
      const next = [...s.seenPatentIds, patentId]
      const sessionNext = s.currentSessionNewIds.filter((id) => id !== patentId)
      const newState = { seenPatentIds: next, currentSessionNewIds: sessionNext }
      try { localStorage.setItem("patent-memory", JSON.stringify({ seenPatentIds: next })) } catch {}
      return newState
    })
  },

  isSeen: (patentId) => {
    return get().seenPatentIds.includes(patentId)
  },

  tagResults: (patents) => {
    const { seenPatentIds, currentSessionNewIds } = get()
    const newIds = [...currentSessionNewIds]

    const result = patents.map((p) => {
      if (seenPatentIds.includes(p.id)) {
        return { ...p, status: "SEEN" as const }
      }
      if (!newIds.includes(p.id)) newIds.push(p.id)
      return { ...p, status: "NEW" as const }
    })

    set({ currentSessionNewIds: newIds })
    return result
  },

  getSummary: (patents) => {
    const { seenPatentIds } = get()
    let newCount = 0
    let seenCount = 0
    patents.forEach((p) => {
      if (seenPatentIds.includes(p.id)) seenCount++
      else newCount++
    })
    return { total: patents.length, newCount, seenCount }
  },

  resetMemory: () => {
    set({ seenPatentIds: [], currentSessionNewIds: [] })
    try { localStorage.removeItem("patent-memory") } catch {}
  },
}))
