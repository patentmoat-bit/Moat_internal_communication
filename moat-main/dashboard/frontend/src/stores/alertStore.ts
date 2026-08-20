"use client"

import { create } from "zustand"
import type { AlertNotification } from "@/types"

const STORAGE_KEY = "patent-alert-notifications"

function load(): AlertNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function save(items: AlertNotification[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
}

interface AlertState {
  notifications: AlertNotification[]
  unreadCount: number

  addNotification: (n: Omit<AlertNotification, "id" | "createdAt" | "read">) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearNotifications: (alertId?: string) => void
  loadFromStorage: () => void
}

export const useAlertStore = create<AlertState>((set, get) => ({
  notifications: load(),
  unreadCount: load().filter((n) => !n.read).length,

  loadFromStorage: () => {
    const items = load()
    set({ notifications: items, unreadCount: items.filter((n) => !n.read).length })
  },

  addNotification: (n) => {
    const notification: AlertNotification = {
      ...n,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    }
    const next = [notification, ...get().notifications]
    set({ notifications: next, unreadCount: next.filter((n) => !n.read).length })
    save(next)
  },

  markRead: (id) => {
    const next = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    )
    set({ notifications: next, unreadCount: next.filter((n) => !n.read).length })
    save(next)
  },

  markAllRead: () => {
    const next = get().notifications.map((n) => ({ ...n, read: true }))
    set({ notifications: next, unreadCount: 0 })
    save(next)
  },

  clearNotifications: (alertId) => {
    const next = alertId
      ? get().notifications.filter((n) => n.alertId !== alertId)
      : []
    set({ notifications: next, unreadCount: next.filter((n) => !n.read).length })
    save(next)
  },
}))
