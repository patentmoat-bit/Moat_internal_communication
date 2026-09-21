"use client";

import * as React from "react";
import {
  Folder,
  FolderOpen,
  Tag,
  Star,
  Trash2,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  ArrowRight,
  FileCheck2,
} from "lucide-react";
import {
  type ProjectFolder,
  type SavedReference,
  type ReferenceCategory,
  STATUTORY_CATEGORIES,
} from "./project-dossier-modal";

interface ProjectDossierViewProps {
  onOpenReportGenerator?: (folder: ProjectFolder) => void;
  onOpenKeyFeaturesMapping?: (folder: ProjectFolder, references: SavedReference[]) => void;
  onSelectPatentForInspection?: (publicationId: string) => void;
}

export function ProjectDossierView({
  onOpenReportGenerator,
  onOpenKeyFeaturesMapping,
  onSelectPatentForInspection,
}: ProjectDossierViewProps) {
  const [folders, setFolders] = React.useState<ProjectFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>("");
  const [filterCategory, setFilterCategory] = React.useState<string>("ALL");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moat_project_folders");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFolders(parsed);
          if (parsed.length > 0) {
            setSelectedFolderId(parsed[0].id);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const currentFolder = folders.find((f) => f.id === selectedFolderId) || folders[0];

  const handleDeleteRef = (folderId: string, pubId: string) => {
    const updated = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          references: f.references.filter((r) => r.publication_id !== pubId),
        };
      }
      return f;
    });
    setFolders(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("moat_project_folders", JSON.stringify(updated));
    }
  };

  const filteredRefs =
    currentFolder?.references.filter((r) => {
      if (filterCategory === "ALL") return true;
      return r.category === filterCategory;
    }) || [];

  return (
    <div className="flex h-full flex-col md:flex-row border border-line rounded-2xl bg-surface overflow-hidden shadow-sm">
      {/* Folder sidebar */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-line bg-canvas/60 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted">
            Project Folders ({folders.length})
          </h3>
        </div>

        <div className="space-y-2">
          {folders.map((folder) => {
            const isSelected = folder.id === selectedFolderId;
            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`cursor-pointer rounded-xl border p-3 transition flex items-start gap-2.5 ${
                  isSelected
                    ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent"
                    : "border-line bg-surface hover:border-line-strong hover:bg-surface/80"
                }`}
              >
                {isSelected ? (
                  <FolderOpen className="size-4 text-accent mt-0.5" />
                ) : (
                  <Folder className="size-4 text-muted mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-bold text-accent">
                      {folder.matter_ref}
                    </span>
                    <span className="rounded-full bg-accent/15 px-2 py-0.2 font-mono text-[10px] font-bold text-accent">
                      {folder.references.length}
                    </span>
                  </div>
                  <h4 className="mt-0.5 text-xs font-semibold text-ink truncate">{folder.name}</h4>
                  <p className="text-[10.5px] text-muted truncate">{folder.client}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Dossier Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface">
        {currentFolder ? (
          <>
            {/* Dossier Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 bg-surface/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                    {currentFolder.matter_ref}
                  </span>
                  <span className="text-xs text-muted">• Client: {currentFolder.client}</span>
                  <span className="text-xs text-muted">• Created: {currentFolder.created_at}</span>
                </div>
                <h2 className="mt-1 text-base font-bold text-ink">{currentFolder.name}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onOpenKeyFeaturesMapping &&
                    onOpenKeyFeaturesMapping(currentFolder, currentFolder.references)
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shadow-2xs"
                >
                  <Layers className="size-3.5" />
                  Map Key Features ({currentFolder.references.length})
                </button>

                <button
                  type="button"
                  onClick={() => onOpenReportGenerator && onOpenReportGenerator(currentFolder)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-accent/90 transition"
                >
                  <FileCheck2 className="size-3.5" />
                  Generate Formal Report
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5 bg-canvas/40 text-xs">
              <div className="flex items-center gap-2 overflow-x-auto">
                <Filter className="size-3.5 text-muted shrink-0" />
                <button
                  onClick={() => setFilterCategory("ALL")}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                    filterCategory === "ALL"
                      ? "bg-accent text-white"
                      : "text-muted hover:text-ink hover:bg-hover"
                  }`}
                >
                  All Categories ({currentFolder.references.length})
                </button>
                {STATUTORY_CATEGORIES.map((cat) => {
                  const count = currentFolder.references.filter((r) => r.category === cat.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                        filterCategory === cat.id
                          ? "bg-accent text-white"
                          : "text-muted hover:text-ink hover:bg-hover"
                      }`}
                    >
                      {cat.code} ({count})
                    </button>
                  );
                })}
              </div>
              <span className="text-muted font-mono text-[11px]">
                Showing {filteredRefs.length} references
              </span>
            </div>

            {/* References List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {filteredRefs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
                  <FileText className="size-10 stroke-[1.5] text-faint mb-2" />
                  <p className="font-semibold text-xs text-ink">No references in this folder yet</p>
                  <p className="text-[11.5px] max-w-sm mt-1">
                    Search patents and use "Add to Project Folder" to populate this matter dossier.
                  </p>
                </div>
              ) : (
                filteredRefs.map((ref) => {
                  const catMeta = STATUTORY_CATEGORIES.find((c) => c.id === ref.category);
                  return (
                    <div
                      key={ref.publication_id}
                      className="rounded-xl border border-line bg-surface p-4 transition-all hover:border-line-strong hover:shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs font-bold text-accent">
                            {ref.publication_id}
                          </span>
                          <span className="rounded bg-line px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted">
                            {ref.jurisdiction}
                          </span>
                          <span className="text-xs font-semibold text-muted truncate max-w-[180px]">
                            {ref.applicant}
                          </span>

                          {catMeta && (
                            <span
                              className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${catMeta.badge}`}
                            >
                              {catMeta.code}
                            </span>
                          )}

                          <div className="flex items-center gap-0.5 ml-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`size-3 ${
                                  s <= ref.relevance_rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted/30"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {onSelectPatentForInspection && (
                            <button
                              type="button"
                              onClick={() => onSelectPatentForInspection(ref.publication_id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-muted hover:border-accent hover:text-accent transition"
                            >
                              Inspect Spec <ArrowRight className="size-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteRef(currentFolder.id, ref.publication_id)}
                            className="rounded-lg p-1 text-muted hover:bg-rose-500/10 hover:text-rose-500 transition"
                            title="Remove from dossier"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-ink leading-snug">{ref.title}</h4>

                      <p className="text-[11.5px] text-muted line-clamp-2 leading-relaxed">
                        {ref.abstract}
                      </p>

                      {/* Analyst Notes */}
                      {ref.analyst_notes && (
                        <div className="rounded-lg border border-line/60 bg-canvas/80 p-2.5 text-[11px] text-ink">
                          <span className="font-bold text-accent">Analyst Note: </span>
                          <span className="text-muted">{ref.analyst_notes}</span>
                        </div>
                      )}

                      {/* Tags */}
                      {ref.custom_tags && ref.custom_tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {ref.custom_tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-1 rounded-md bg-line px-2 py-0.5 text-[10px] font-semibold text-muted"
                            >
                              <Tag className="size-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-muted">
            <p className="text-xs">Select or create a project folder to view dossier references.</p>
          </div>
        )}
      </div>
    </div>
  );
}
