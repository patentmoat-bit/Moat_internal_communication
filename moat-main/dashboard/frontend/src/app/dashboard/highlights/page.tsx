"use client"

import { useState } from "react"
import { useHighlightStore } from "@/stores/highlightStore"
import type { HighlightGroup } from "@/types"

const COLOR_OPTIONS = [
  { name: "Red", value: "#ef4444" },
  { name: "Yellow", value: "#eab308" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "Pink", value: "#ec4899" },
  { name: "Teal", value: "#14b8a6" },
]

export default function HighlightsPage() {
  const { schemes, activeSchemeId, createScheme, updateScheme, deleteScheme, duplicateScheme, setActiveScheme } =
    useHighlightStore()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState("")
  const [formGroups, setFormGroups] = useState<HighlightGroup[]>([
    { keywords: [""], color: "#eab308" },
  ])

  const resetForm = () => {
    setFormName("")
    setFormGroups([{ keywords: [""], color: "#eab308" }])
    setEditingId(null)
    setShowForm(false)
  }

  const editScheme = (id: string) => {
    const s = schemes.find((sc) => sc.id === id)
    if (!s) return
    setFormName(s.name)
    setFormGroups(s.groups.length > 0 ? s.groups : [{ keywords: [""], color: "#eab308" }])
    setEditingId(id)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!formName.trim()) return
    const validGroups = formGroups.filter((g) => g.keywords.some((k) => k.trim()))
    if (validGroups.length === 0) return

    if (editingId) {
      updateScheme(editingId, { name: formName.trim(), groups: validGroups })
    } else {
      createScheme(formName.trim(), validGroups)
    }
    resetForm()
  }

  const addGroup = () => {
    setFormGroups([...formGroups, { keywords: [""], color: "#eab308" }])
  }

  const removeGroup = (idx: number) => {
    setFormGroups(formGroups.filter((_, i) => i !== idx))
  }

  const updateGroup = (idx: number, field: keyof HighlightGroup, value: any) => {
    setFormGroups(
      formGroups.map((g, i) => (i === idx ? { ...g, [field]: value } : g))
    )
  }

  const updateKeyword = (gIdx: number, kIdx: number, value: string) => {
    setFormGroups(
      formGroups.map((g, i) =>
        i === gIdx
          ? {
              ...g,
              keywords: g.keywords.map((k, j) => (j === kIdx ? value : k)),
            }
          : g
      )
    )
  }

  const addKeyword = (gIdx: number) => {
    setFormGroups(
      formGroups.map((g, i) => (i === gIdx ? { ...g, keywords: [...g.keywords, ""] } : g))
    )
  }

  const removeKeyword = (gIdx: number, kIdx: number) => {
    setFormGroups(
      formGroups.map((g, i) =>
        i === gIdx
          ? { ...g, keywords: g.keywords.filter((_, j) => j !== kIdx) }
          : g
      )
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Highlight Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage named highlight schemes for patent documents
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          + New Scheme
        </button>
      </div>

      {showForm && (
        <div className="mb-8 p-4 border rounded-xl bg-card">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Scheme" : "Create New Scheme"}
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Scheme Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Battery Tech Highlights"
              className="w-full p-2 border rounded-lg text-sm bg-background"
            />
          </div>

          <div className="space-y-3 mb-4">
            {formGroups.map((group, gIdx) => (
              <div key={gIdx} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Keyword Group {gIdx + 1}</span>
                  {formGroups.length > 1 && (
                    <button
                      onClick={() => removeGroup(gIdx)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Color:</span>
                  <div className="flex gap-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => updateGroup(gIdx, "color", c.value)}
                        className="w-5 h-5 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: c.value,
                          borderColor: group.color === c.value ? "#000" : "transparent",
                        }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">Proximity:</span>
                  <select
                    value={group.proximity || ""}
                    onChange={(e) =>
                      updateGroup(gIdx, "proximity", e.target.value || undefined)
                    }
                    className="text-xs p-1 border rounded bg-background"
                  >
                    <option value="">None (anywhere)</option>
                    <option value="sentence">Same sentence</option>
                    <option value="paragraph">Same paragraph</option>
                  </select>
                </div>

                <div className="space-y-1">
                  {group.keywords.map((kw, kIdx) => (
                    <div key={kIdx} className="flex items-center gap-1">
                      <input
                        value={kw}
                        onChange={(e) => updateKeyword(gIdx, kIdx, e.target.value)}
                        placeholder="Enter keyword or phrase"
                        className="flex-1 p-1.5 text-sm border rounded bg-background"
                      />
                      {group.keywords.length > 1 && (
                        <button
                          onClick={() => removeKeyword(gIdx, kIdx)}
                          className="text-xs text-destructive px-1"
                        >
                          x
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addKeyword(gIdx)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    + Add keyword
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={addGroup}
              className="text-sm text-primary hover:underline"
            >
              + Add keyword group
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
            >
              {editingId ? "Update" : "Create"} Scheme
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-muted-foreground hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {schemes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No highlight schemes yet.</p>
          <p className="text-sm mt-1">Create your first scheme to start highlighting patents.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className={`p-4 border rounded-xl transition-colors ${
                activeSchemeId === scheme.id ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{scheme.name}</h3>
                    {activeSchemeId === scheme.id && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {scheme.groups.map((g, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: g.color }}
                        />
                        <span className="text-muted-foreground">
                          {g.keywords.filter(Boolean).join(", ")}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {scheme.groups.length} group(s) · Created {new Date(scheme.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() =>
                      setActiveScheme(activeSchemeId === scheme.id ? null : scheme.id)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeSchemeId === scheme.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {activeSchemeId === scheme.id ? "Applied" : "Apply"}
                  </button>
                  <button
                    onClick={() => editScheme(scheme.id)}
                    className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      const name = prompt("Enter name for duplicate:", scheme.name + " (copy)")
                      if (name) duplicateScheme(scheme.id, name)
                    }}
                    className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${scheme.name}"?`)) deleteScheme(scheme.id)
                    }}
                    className="px-2 py-1.5 text-xs text-destructive hover:text-destructive/80"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
