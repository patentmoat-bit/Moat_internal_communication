"use client";

import * as React from "react";
import {
  Scale,
  Plus,
  Folder,
  FileText,
  Clock,
  CheckCircle,
  Calendar,
  Layers,
  UploadCloud,
  ChevronRight,
  Shield,
  FileUp,
  X,
  Inbox,
  Sparkles,
} from "lucide-react";

interface VaultFile {
  id: string;
  name: string;
  size: string;
  tag: string;
  uploadedAt: string;
}

interface IPProject {
  id: string;
  matter_ref: string;
  title: string;
  ip_type: "PATENT" | "TRADEMARK" | "COPYRIGHT";
  stage: "RESEARCH" | "DRAFTING" | "DESIGN" | "APPROVAL" | "FILED";
  lead_analyst: string;
  docket_deadline: string;
  documents_count: number;
  progress_pct: number;
  vault_files?: VaultFile[];
}

export default function ResearchProjectsPage() {
  const [projects, setProjects] = React.useState<IPProject[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<IPProject | null>(null);
  const [showNewModal, setShowNewModal] = React.useState(false);

  // New Matter Form state
  const [newMatterRef, setNewMatterRef] = React.useState("");
  const [newTitle, setNewTitle] = React.useState("");
  const [newIpType, setNewIpType] = React.useState<"PATENT" | "TRADEMARK" | "COPYRIGHT">("PATENT");
  const [newLead, setNewLead] = React.useState("");
  const [newDeadline, setNewDeadline] = React.useState("");

  // Load saved matters on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moat_research_matters");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed);
            setSelectedProject(parsed[0]);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const saveProjects = (updated: IPProject[]) => {
    setProjects(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("moat_research_matters", JSON.stringify(updated));
    }
  };

  const handleCreateMatter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const ref = newMatterRef.trim() || `PAT-${new Date().getFullYear()}-${String(projects.length + 1).padStart(4, "0")}`;
    const newProj: IPProject = {
      id: `mat-${Date.now()}`,
      matter_ref: ref,
      title: newTitle.trim(),
      ip_type: newIpType,
      stage: "RESEARCH",
      lead_analyst: newLead.trim() || "Patent Analyst",
      docket_deadline: newDeadline || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      documents_count: 0,
      progress_pct: 10,
      vault_files: [],
    };

    const updated = [newProj, ...projects];
    saveProjects(updated);
    setSelectedProject(newProj);
    setShowNewModal(false);
    setNewMatterRef("");
    setNewTitle("");
    setNewLead("");
    setNewDeadline("");
  };

  const handleUploadFile = () => {
    if (!selectedProject) return;
    const fileName = window.prompt("Enter technical document or claim chart file name (e.g., Invention_Disclosure.pdf):");
    if (!fileName || !fileName.trim()) return;

    const newFile: VaultFile = {
      id: `vf-${Date.now()}`,
      name: fileName.trim(),
      size: "1.8 MB",
      tag: "Verified",
      uploadedAt: new Date().toISOString().split("T")[0],
    };

    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        const files = [...(p.vault_files || []), newFile];
        return { ...p, vault_files: files, documents_count: files.length };
      }
      return p;
    });

    saveProjects(updated);
    setSelectedProject((prev) =>
      prev ? { ...prev, vault_files: [...(prev.vault_files || []), newFile], documents_count: (prev.vault_files?.length || 0) + 1 } : null
    );
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] overflow-hidden bg-canvas">
      {/* Left 45%: Project Matters Tracker */}
      <div className="flex w-[45%] flex-col border-r border-line overflow-hidden">
        <header className="border-b border-line bg-surface/40 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent">
                  Research Projects
                </span>
                <span className="text-xs text-muted">IP Lifecycle & Matter Tracker</span>
              </div>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
                Active Research Matters
              </h1>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
            >
              <Plus className="size-3.5" />
              New Matter
            </button>
          </div>
        </header>

        {/* List of Matters */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted">
              <Folder className="size-8 text-faint mb-2 opacity-40" />
              <p className="text-xs font-semibold text-ink">No research matters created yet</p>
              <p className="text-[11px] text-muted mt-1 max-w-xs">
                Click &quot;New Matter&quot; above to initialize an IP research docket and link prior art citations.
              </p>
            </div>
          ) : (
            projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  selectedProject?.id === proj.id
                    ? "border-accent bg-accent/5 shadow-xs"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent">{proj.matter_ref}</span>
                    <span className="rounded bg-line px-1.5 py-0.2 text-[10px] font-bold text-muted">
                      {proj.ip_type}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      proj.stage === "FILED"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : proj.stage === "APPROVAL"
                        ? "bg-purple-500/10 text-purple-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {proj.stage}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-bold leading-snug text-ink">{proj.title}</h3>

                {/* Progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[11px] text-muted font-medium">
                    <span>Progress: {proj.progress_pct}%</span>
                    <span>Deadline: {proj.docket_deadline}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${proj.progress_pct}%` }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right 55%: Matter Project Storage, Evidence Vault & Review Notes */}
      <div className="flex flex-1 flex-col overflow-y-auto p-8 space-y-6 bg-surface/20">
        {selectedProject ? (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            {/* Matter Detail Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs font-bold text-white">
                    {selectedProject.matter_ref}
                  </span>
                  <h2 className="mt-2 text-xl font-black text-ink">{selectedProject.title}</h2>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                    <span>Lead: {selectedProject.lead_analyst}</span>
                    <span>·</span>
                    <span>Next Docket Deadline: {selectedProject.docket_deadline}</span>
                  </div>
                </div>
              </div>

              {/* Stages Pipeline */}
              <div className="flex items-center justify-between rounded-xl border border-line bg-canvas p-4 text-xs font-semibold">
                {["RESEARCH", "DRAFTING", "DESIGN", "APPROVAL", "FILED"].map((st, i) => {
                  const isCurrent = selectedProject.stage === st;
                  return (
                    <div key={st} className="flex items-center gap-1.5">
                      <span
                        className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isCurrent
                            ? "bg-accent text-white"
                            : "bg-line text-muted"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className={isCurrent ? "text-accent font-bold" : "text-muted"}>
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Project Storage & Uploaded Evidence Vault */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-ink">Project Storage & Evidence Vault</h3>
                  <p className="text-xs text-muted">Technical PDFs, NPL whitepapers, and claim charts.</p>
                </div>
                <button
                  onClick={handleUploadFile}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink hover:border-line-strong transition"
                >
                  <FileUp className="size-3.5" />
                  Upload PDF / File
                </button>
              </div>

              {selectedProject.vault_files && selectedProject.vault_files.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {selectedProject.vault_files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-xl border border-line bg-canvas p-3">
                      <div className="flex items-center gap-2.5">
                        <FileText className="size-4 text-accent" />
                        <div>
                          <div className="font-bold text-ink">{file.name}</div>
                          <div className="text-[10px] text-muted">{file.size} · Uploaded {file.uploadedAt}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-muted">{file.tag}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted border border-dashed border-line rounded-xl bg-canvas/50">
                  <FileText className="size-6 text-faint mb-1.5 opacity-40" />
                  <p className="text-xs font-medium text-ink">Evidence Vault is empty</p>
                  <p className="text-[11px] text-muted mt-0.5">Upload IDF PDFs, prior art citations, or technical specs for this matter.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-muted">
            <div className="rounded-2xl border border-line bg-surface p-6 max-w-sm">
              <Folder className="size-10 mb-2 opacity-30 mx-auto" />
              <p className="font-semibold text-ink text-xs">No Matter Selected</p>
              <p className="text-[11px] text-muted mt-1">
                Select or create a research matter from the left tracker to view pipeline stages and evidence documents.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Matter Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Plus className="size-4 text-accent" />
                Create New Research Matter
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-line"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMatter} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-ink">Matter Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., PAT-2024-0042"
                  value={newMatterRef}
                  onChange={(e) => setNewMatterRef(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Invention / Matter Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Multi-tenant cryptographic isolation protocol"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink">IP Classification</label>
                  <select
                    value={newIpType}
                    onChange={(e) => setNewIpType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none"
                  >
                    <option value="PATENT">Patent</option>
                    <option value="TRADEMARK">Trademark</option>
                    <option value="COPYRIGHT">Copyright</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-ink">Lead Analyst</label>
                  <input
                    type="text"
                    placeholder="e.g., Dr. Elena Rostova"
                    value={newLead}
                    onChange={(e) => setNewLead(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="font-bold text-ink">Docket Deadline</label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-lg border border-line px-3 py-2 font-semibold text-muted hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 font-bold text-white shadow-sm hover:brightness-110"
                >
                  Initialize Matter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

