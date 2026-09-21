"use client";

import * as React from "react";
import {
  FolderPlus,
  Folder,
  Tag,
  Check,
  X,
  FileText,
  Star,
  ShieldAlert,
  Sparkles,
  Layers,
  BookOpen,
  Info,
} from "lucide-react";

export type ReferenceCategory =
  | "102_ANTICIPATION"
  | "103_OBVIOUSNESS"
  | "BACKGROUND_ART"
  | "FTO_RISK"
  | "DEFENSIVE";

export interface SavedReference {
  publication_id: string;
  title: string;
  applicant: string;
  jurisdiction: string;
  abstract: string;
  score: number;
  category: ReferenceCategory;
  relevance_rating: number; // 1 - 5
  analyst_notes: string;
  custom_tags: string[];
  saved_at: string;
}

export interface ProjectFolder {
  id: string;
  matter_ref: string;
  name: string;
  client: string;
  created_at: string;
  references: SavedReference[];
}

interface ProjectDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPatents: {
    publication_id: string;
    title: string;
    applicant: string;
    jurisdiction: string;
    abstract: string;
    score: number;
  }[];
  onSavedToProject?: (folderId: string, references: SavedReference[]) => void;
}

const DEFAULT_PROJECT_FOLDERS: ProjectFolder[] = [];

export const STATUTORY_CATEGORIES: {
  id: ReferenceCategory;
  label: string;
  code: string;
  color: string;
  badge: string;
  description: string;
}[] = [
  {
    id: "102_ANTICIPATION",
    label: "35 U.S.C. § 102 — Direct Anticipation (Tier 1 Primary Art)",
    code: "Category X / 102",
    color: "text-rose-500 border-rose-500/30 bg-rose-500/10",
    badge: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    description: "Single reference disclosing every claimed element identically.",
  },
  {
    id: "103_OBVIOUSNESS",
    label: "35 U.S.C. § 103 — Obviousness Combination (Secondary Art)",
    code: "Category Y / 103",
    color: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    badge: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    description: "Discloses specific limitations combinable with primary art.",
  },
  {
    id: "BACKGROUND_ART",
    label: "Background & State of the Art (Category A)",
    code: "Category A",
    color: "text-blue-500 border-blue-500/30 bg-blue-500/10",
    badge: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    description: "General technical field context without anticipation.",
  },
  {
    id: "FTO_RISK",
    label: "FTO / Freedom to Operate Potential Blocking Art",
    code: "FTO Risk",
    color: "text-purple-500 border-purple-500/30 bg-purple-500/10",
    badge: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    description: "Active granted claims presenting infringement liability.",
  },
  {
    id: "DEFENSIVE",
    label: "Defensive Prior Art / Prior Publication",
    code: "Defensive",
    color: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    description: "Useful for invalidating competitor claims or portfolio fencing.",
  },
];

export function ProjectDossierModal({
  isOpen,
  onClose,
  selectedPatents,
  onSavedToProject,
}: ProjectDossierModalProps) {
  const [folders, setFolders] = React.useState<ProjectFolder[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moat_project_folders");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_PROJECT_FOLDERS;
  });

  const [selectedFolderId, setSelectedFolderId] = React.useState<string>(
    folders[0]?.id || ""
  );
  const [isCreatingNew, setIsCreatingNew] = React.useState<boolean>(folders.length === 0);
  const [newFolderName, setNewFolderName] = React.useState<string>("");
  const [newMatterRef, setNewMatterRef] = React.useState<string>("");
  const [newClientName, setNewClientName] = React.useState<string>("");

  const [category, setCategory] = React.useState<ReferenceCategory>("102_ANTICIPATION");
  const [rating, setRating] = React.useState<number>(4);
  const [analystNotes, setAnalystNotes] = React.useState<string>("");
  const [tagInput, setTagInput] = React.useState<string>("");
  const [savedSuccess, setSavedSuccess] = React.useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveToFolder = () => {
    let targetFolderId = selectedFolderId;
    let updatedFolders = [...folders];

    if (isCreatingNew) {
      if (!newFolderName.trim()) {
        alert("Please enter a Project Folder name.");
        return;
      }
      const newFolder: ProjectFolder = {
        id: `proj-${Date.now().toString().slice(-4)}`,
        matter_ref: newMatterRef.trim() || `PAT-2024-${Math.floor(1000 + Math.random() * 9000)}`,
        name: newFolderName.trim(),
        client: newClientName.trim() || "Internal IP Portfolio",
        created_at: new Date().toISOString().split("T")[0],
        references: [],
      };
      updatedFolders.unshift(newFolder);
      targetFolderId = newFolder.id;
    }

    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newRefs: SavedReference[] = selectedPatents.map((pat) => ({
      publication_id: pat.publication_id,
      title: pat.title,
      applicant: pat.applicant,
      jurisdiction: pat.jurisdiction,
      abstract: pat.abstract,
      score: pat.score,
      category,
      relevance_rating: rating,
      analyst_notes: analystNotes,
      custom_tags: tags,
      saved_at: new Date().toISOString().split("T")[0],
    }));

    updatedFolders = updatedFolders.map((f) => {
      if (f.id === targetFolderId) {
        // Prevent duplicate publication_ids
        const existingIds = new Set(f.references.map((r) => r.publication_id));
        const mergedRefs = [...f.references];
        for (const ref of newRefs) {
          if (!existingIds.has(ref.publication_id)) {
            mergedRefs.push(ref);
          }
        }
        return { ...f, references: mergedRefs };
      }
      return f;
    });

    setFolders(updatedFolders);
    if (typeof window !== "undefined") {
      localStorage.setItem("moat_project_folders", JSON.stringify(updatedFolders));
    }

    setSavedSuccess(true);
    if (onSavedToProject) {
      onSavedToProject(targetFolderId, newRefs);
    }

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-surface/80">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <FolderPlus className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">
                Add {selectedPatents.length} Selected Reference{selectedPatents.length > 1 ? "s" : ""} to Project Folder
              </h2>
              <p className="text-xs text-muted">
                Curate prior art citations into an active matter dossier with statutory tags
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-ink">
          {/* Selected Reference Pills */}
          <div className="space-y-2">
            <label className="font-bold uppercase tracking-wider text-muted text-[11px]">
              Selected Citations ({selectedPatents.length})
            </label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto rounded-xl border border-line bg-canvas p-2.5">
              {selectedPatents.map((p) => (
                <span
                  key={p.publication_id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1 font-mono text-[11.5px] font-bold text-accent"
                >
                  <FileText className="size-3" />
                  {p.publication_id}
                  <span className="text-[10.5px] font-sans font-normal text-muted truncate max-w-[140px]">
                    ({p.applicant})
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Project Folder Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold uppercase tracking-wider text-muted text-[11px]">
                Target Project / Matter Dossier
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingNew(!isCreatingNew)}
                className="text-accent font-semibold hover:underline"
              >
                {isCreatingNew ? "← Select Existing Folder" : "+ Create New Project Folder"}
              </button>
            </div>

            {isCreatingNew ? (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted">Matter Ref #</label>
                    <input
                      type="text"
                      placeholder="e.g. PAT-2024-0099"
                      value={newMatterRef}
                      onChange={(e) => setNewMatterRef(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted">Client / Assignee</label>
                    <input
                      type="text"
                      placeholder="e.g. Apple Inc. / Internal"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted">Project Folder Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Zero-Trust Cryptographic Outbox Prior Art Study"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {folders.map((folder) => {
                  const isChecked = selectedFolderId === folder.id;
                  return (
                    <div
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`cursor-pointer rounded-xl border p-3 transition flex items-start gap-2.5 ${
                        isChecked
                          ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent"
                          : "border-line bg-canvas hover:border-line-strong hover:bg-surface"
                      }`}
                    >
                      <Folder className={`size-4 mt-0.5 ${isChecked ? "text-accent" : "text-muted"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] font-bold text-accent">
                            {folder.matter_ref}
                          </span>
                          <span className="text-[10px] text-muted">{folder.references.length} refs</span>
                        </div>
                        <p className="font-semibold text-ink truncate text-xs mt-0.5">{folder.name}</p>
                        <p className="text-[10.5px] text-muted truncate">{folder.client}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Statutory Category Classification */}
          <div className="space-y-2">
            <label className="font-bold uppercase tracking-wider text-muted text-[11px]">
              Statutory Prior Art Categorization
            </label>
            <div className="space-y-2">
              {STATUTORY_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <label
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                      isSelected
                        ? `${cat.color} ring-1 ring-accent shadow-xs`
                        : "border-line bg-canvas hover:bg-surface"
                    }`}
                  >
                    <input
                      type="radio"
                      name="statutory_category"
                      checked={isSelected}
                      onChange={() => setCategory(cat.id)}
                      className="mt-1 text-accent"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{cat.label}</span>
                        <span className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${cat.badge}`}>
                          {cat.code}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted">{cat.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Relevance Rating & Custom Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-muted text-[11px]">
                Analyst Relevance Rating (1-5)
              </label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-500 hover:scale-110 transition"
                  >
                    <Star
                      className={`size-5 ${
                        star <= rating ? "fill-amber-400 text-amber-400" : "text-muted/40"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 font-mono text-xs font-bold text-muted">
                  {rating === 5 ? "Critical Primary Art" : rating === 4 ? "High Relevance" : "Moderate"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold uppercase tracking-wider text-muted text-[11px]">
                Custom Tags (comma separated)
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                <Tag className="size-3.5 text-muted shrink-0" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. Outbox, CDC, Ephemeral Key"
                  className="w-full bg-transparent text-xs text-ink placeholder:text-faint focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Analyst Annotation Notes */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-muted text-[11px]">
              Analyst Dossier Annotation Notes
            </label>
            <textarea
              rows={3}
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              placeholder="Enter qualitative justification or claim mapping thoughts..."
              className="w-full rounded-xl border border-line bg-surface p-3 text-xs text-ink placeholder:text-faint focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-surface/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-muted hover:bg-hover hover:text-ink transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveToFolder}
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition ${
              savedSuccess ? "bg-emerald-600" : "bg-accent hover:bg-accent/90"
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="size-4" />
                Saved to Project Dossier!
              </>
            ) : (
              <>
                <FolderPlus className="size-4" />
                Save {selectedPatents.length} Reference{selectedPatents.length > 1 ? "s" : ""} to Folder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
