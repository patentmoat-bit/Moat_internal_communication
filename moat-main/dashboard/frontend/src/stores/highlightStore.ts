"use client"

import { create } from "zustand"
import type { HighlightScheme, HighlightGroup } from "@/types"

const STORAGE_KEY = "patent-highlights"

function loadSchemes(): HighlightScheme[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSchemes(schemes: HighlightScheme[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(schemes)) } catch {}
}

const loadActive = (): string | null => {
  try { return localStorage.getItem("patent-highlights-active") } catch { return null }
}

const saveActive = (id: string | null) => {
  try {
    if (id) localStorage.setItem("patent-highlights-active", id)
    else localStorage.removeItem("patent-highlights-active")
  } catch {}
}

interface HighlightState {
  schemes: HighlightScheme[]
  activeSchemeId: string | null
  isApplying: boolean

  createScheme: (name: string, groups: HighlightGroup[]) => HighlightScheme
  updateScheme: (id: string, updates: Partial<HighlightScheme>) => void
  deleteScheme: (id: string) => void
  duplicateScheme: (id: string, newName: string) => HighlightScheme | null
  setActiveScheme: (id: string | null) => void
  getActiveScheme: () => HighlightScheme | null
  applyHighlight: (text: string) => string
  clearActive: () => void
  loadFromStorage: () => void
}

export const useHighlightStore = create<HighlightState>((set, get) => ({
  schemes: loadSchemes(),
  activeSchemeId: loadActive(),
  isApplying: false,

  loadFromStorage: () => {
    set({ schemes: loadSchemes(), activeSchemeId: loadActive() })
  },

  createScheme: (name, groups) => {
    const scheme: HighlightScheme = {
      id: crypto.randomUUID(),
      name,
      groups,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const next = [...get().schemes, scheme]
    set({ schemes: next })
    saveSchemes(next)
    return scheme
  },

  updateScheme: (id, updates) => {
    const next = get().schemes.map((sc) =>
      sc.id === id ? { ...sc, ...updates, updatedAt: new Date().toISOString() } : sc
    )
    set({ schemes: next })
    saveSchemes(next)
  },

  deleteScheme: (id) => {
    const next = get().schemes.filter((sc) => sc.id !== id)
    const activeId = get().activeSchemeId === id ? null : get().activeSchemeId
    set({ schemes: next, activeSchemeId: activeId })
    saveSchemes(next)
    saveActive(activeId)
  },

  duplicateScheme: (id, newName) => {
    const original = get().schemes.find((s) => s.id === id)
    if (!original) return null
    const dup: HighlightScheme = {
      ...original,
      id: crypto.randomUUID(),
      name: newName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const next = [...get().schemes, dup]
    set({ schemes: next })
    saveSchemes(next)
    return dup
  },

  setActiveScheme: (id) => {
    set({ activeSchemeId: id })
    saveActive(id)
  },

  getActiveScheme: () => {
    const { schemes, activeSchemeId } = get()
    if (!activeSchemeId) return null
    return schemes.find((s) => s.id === activeSchemeId) || null
  },

  applyHighlight: (text) => {
    const scheme = get().getActiveScheme()
    if (!scheme || !text) return text

    let result = text
    scheme.groups.forEach((group) => {
      group.keywords.forEach((keyword) => {
        if (!keyword.trim()) return
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const regex = new RegExp(`(${escaped})`, "gi")
        result = result.replace(regex, `[[HIGHLIGHT:${group.color}]]$1[[/HIGHLIGHT]]`)
      })
    })
    return result
  },

  clearActive: () => {
    set({ activeSchemeId: null })
    saveActive(null)
  },
}))
