"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Download,
  Trash2,
  Edit3,
  Save,
  FileCode,
  Tag,
  ArrowRight,
  GitCompare,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCheck,
  ArrowLeft,
  Lock,
  Unlock,
  Send,
  History,
  ListChecks,
  ShieldCheck,
  FileEdit,
} from "lucide-react";
import mammoth from "mammoth";
import { toast } from "@/components/ui/toast";

export type MatterTab = "storage" | "uploads" | "review" | "tracker" | "comparison";

export interface VaultFile {
  id: string;
  name: string;
  size: string;
  category: "INVENTION_DISCLOSURE" | "PRIOR_ART" | "DRAWING" | "CLAIM_CHART" | "OTHER";
  hash: string;
  uploadedAt: string;
  dataUrl?: string;
  mimeType?: string;
}

export interface ClaimFeatureComparison {
  id: string;
  feature_element: string;
  d1_citation: string;
  d1_rating: "IDENTICAL" | "EQUIVALENT" | "DISTINGUISHED";
  d2_citation: string;
  d2_rating: "IDENTICAL" | "EQUIVALENT" | "DISTINGUISHED";
  distinguishing_argument: string;
}

export interface IPProject {
  id: string;
  matter_ref: string;
  title: string;
  client: string;
  ip_type: "PATENT" | "TRADEMARK" | "COPYRIGHT";
  stage: "DISCLOSURE_RECEIVED" | "PRIOR_ART_SEARCH" | "REVIEW_NOTE" | "DRAFTER_HANDOFF" | "FINAL_APPROVAL";
  lead_analyst: string;
  docket_deadline: string;
  documents_count: number;
  progress_pct: number;
  vault_files: VaultFile[];
  review_note?: {
    novelty_risk: "LOW" | "MEDIUM" | "HIGH";
    obviousness_risk: "LOW" | "MEDIUM" | "HIGH";
    section_101_eligible: boolean;
    analyst_summary: string;
    key_novelty_points: string;
    prosecution_strategy: string;
    last_saved: string;
  };
  claim_comparisons: ClaimFeatureComparison[];
  history?: { from: IPProject["stage"] | null; to: IPProject["stage"]; by: string; at: string }[];
}

async function matterApi(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Request failed.");
  return json as { matter?: IPProject };
}

function ResearchProjectsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = (searchParams.get("tab") as MatterTab) || "storage";
  const [activeTab, setActiveTab] = React.useState<MatterTab>(tabParam);

  const [projects, setProjects] = React.useState<IPProject[]>([]);
  const [selectedProject, setSelectedProject] = React.useState<IPProject | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("ALL");

  // New Matter Modal
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [newMatterRef, setNewMatterRef] = React.useState("");
  const [newTitle, setNewTitle] = React.useState("");
  const [newClient, setNewClient] = React.useState("");
  const [newIpType, setNewIpType] = React.useState<"PATENT" | "TRADEMARK" | "COPYRIGHT">("PATENT");
  const [newLead, setNewLead] = React.useState("");
  const [newDeadline, setNewDeadline] = React.useState("");

  // Upload Form Modal / State
  const [uploadCategory, setUploadCategory] = React.useState<VaultFile["category"]>("INVENTION_DISCLOSURE");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = React.useState<VaultFile | null>(null);
  const [docxHtml, setDocxHtml] = React.useState<string>("");
  const [isConvertingDocx, setIsConvertingDocx] = React.useState<boolean>(false);

  // Convert DOCX files to clean HTML when opened
  React.useEffect(() => {
    if (!previewFile?.dataUrl) {
      setDocxHtml("");
      setIsConvertingDocx(false);
      return;
    }

    const isDocx =
      previewFile.name.toLowerCase().endsWith(".docx") ||
      previewFile.name.toLowerCase().endsWith(".doc") ||
      previewFile.mimeType?.includes("word") ||
      previewFile.mimeType?.includes("officedocument");

    if (isDocx) {
      setIsConvertingDocx(true);
      setDocxHtml("");
      let cancelled = false;
      fetch(previewFile.dataUrl.replace("?inline=1", ""))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("download failed"))))
        .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
        .then((result) => { if (!cancelled) setDocxHtml(result.value); })
        .catch((err) => {
          console.error("DOCX conversion error:", err);
          if (!cancelled) setDocxHtml("<p class='text-red-500'>Unable to parse Word document formatting.</p>");
        })
        .finally(() => { if (!cancelled) setIsConvertingDocx(false); });
      return () => { cancelled = true; };
    } else {
      setDocxHtml("");
      setIsConvertingDocx(false);
    }
  }, [previewFile]);

  // Review Note State
  const [reviewNoveltyRisk, setReviewNoveltyRisk] = React.useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [reviewObviousRisk, setReviewObviousRisk] = React.useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [review101Eligible, setReview101Eligible] = React.useState<boolean>(true);
  const [reviewSummary, setReviewSummary] = React.useState<string>("");
  const [reviewNoveltyPoints, setReviewNoveltyPoints] = React.useState<string>("");
  const [reviewStrategy, setReviewStrategy] = React.useState<string>("");
  const [saveSuccessNotice, setSaveSuccessNotice] = React.useState<boolean>(false);

  // Synchronize tab from URL params
  React.useEffect(() => {
    const tab = searchParams.get("tab") as MatterTab;
    if (tab && ["storage", "uploads", "review", "tracker", "comparison"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Load matters from the server. Matters kept in this browser by older versions are
  // moved to the server once, then removed from local storage.
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [stageError, setStageError] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        try {
          const legacy = JSON.parse(localStorage.getItem("moat_research_matters") ?? "[]");
          if (Array.isArray(legacy) && legacy.length) {
            const results = await Promise.all(
              legacy.map((p: any) =>
                matterApi("/api/matters", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...p, import: true }),
                }).then(() => true).catch((e: Error) => /already exists/.test(e.message)),
              ),
            );
            if (results.every(Boolean)) localStorage.removeItem("moat_research_matters");
          }
        } catch { /* nothing to migrate */ }
        const { matters } = (await (await fetch("/api/matters")).json()) as { matters?: IPProject[] };
        if (cancelled) return;
        setProjects(matters ?? []);
        setSelectedProject((cur) => (matters ?? []).find((m) => m.id === cur?.id) ?? matters?.[0] ?? null);
      } catch {
        if (!cancelled) setLoadError("Could not load matters from the server.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => setStageError(null), [selectedProject?.id]);

  // Update Review Note form state when selectedProject changes
  React.useEffect(() => {
    if (selectedProject?.review_note) {
      setReviewNoveltyRisk(selectedProject.review_note.novelty_risk || "LOW");
      setReviewObviousRisk(selectedProject.review_note.obviousness_risk || "LOW");
      setReview101Eligible(selectedProject.review_note.section_101_eligible ?? true);
      setReviewSummary(selectedProject.review_note.analyst_summary || "");
      setReviewNoveltyPoints(selectedProject.review_note.key_novelty_points || "");
      setReviewStrategy(selectedProject.review_note.prosecution_strategy || "");
    } else {
      setReviewNoveltyRisk("LOW");
      setReviewObviousRisk("LOW");
      setReview101Eligible(true);
      setReviewSummary("");
      setReviewNoveltyPoints("");
      setReviewStrategy("");
    }
  }, [selectedProject]);

  /** Replace one matter everywhere after the server confirms a change. */
  const applyMatter = (m: IPProject) => {
    setProjects((prev) => prev.map((p) => (p.id === m.id ? m : p)));
    setSelectedProject((cur) => (cur?.id === m.id ? m : cur));
  };
  const patchMatter = async (body: object) => {
    if (!selectedProject) return;
    const { matter } = await matterApi(`/api/matters/${selectedProject.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (matter) applyMatter(matter);
  };

  const handleTabChange = (tab: MatterTab) => {
    setActiveTab(tab);
    router.replace(`/matters?tab=${tab}`);
  };

  const handleCreateMatter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const { matter } = await matterApi("/api/matters", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matter_ref: newMatterRef, title: newTitle, client: newClient, ip_type: newIpType,
          lead_analyst: newLead, docket_deadline: newDeadline,
        }),
      });
      if (!matter) return;
      setProjects((prev) => [matter, ...prev]);
      setSelectedProject(matter);
      setShowNewModal(false);
      setNewMatterRef(""); setNewTitle(""); setNewClient(""); setNewLead(""); setNewDeadline("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the matter.");
    }
  };

  // Files are uploaded to the server; the browser keeps no copy.
  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedProject) return;
    setIsUploading(true);
    try {
      const form = new FormData();
      form.set("category", uploadCategory);
      Array.from(files).forEach((f) => form.append("files", f));
      const { matter } = await matterApi(`/api/matters/${selectedProject.id}/files`, { method: "POST", body: form });
      if (matter) {
        applyMatter(matter);
        toast.success("Files uploaded successfully.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    processFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!selectedProject) return;
    const ok = await toast.confirm({
      title: "Delete File",
      message: "Are you sure you want to delete this file from the matter vault?",
      confirmText: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      const { matter } = await matterApi(`/api/matters/${selectedProject.id}/files/${fileId}`, { method: "DELETE" });
      if (matter) applyMatter(matter);
      if (previewFile?.id === fileId) setPreviewFile(null);
      toast.success("File deleted from vault.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the file.");
    }
  };

  const handleDeleteMatter = async () => {
    if (!selectedProject) return;
    const ok = await toast.confirm({
      title: "Delete Matter",
      message: `Delete ${selectedProject.matter_ref} and all of its files? This cannot be undone.`,
      confirmText: "Delete Matter",
      danger: true,
    });
    if (!ok) return;
    try {
      await matterApi(`/api/matters/${selectedProject.id}`, { method: "DELETE" });
      const rest = projects.filter((p) => p.id !== selectedProject.id);
      setProjects(rest);
      setSelectedProject(rest[0] ?? null);
      toast.success(`Matter ${selectedProject.matter_ref} deleted.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the matter.");
    }
  };

  const handleDownloadFile = (file: VaultFile) => {
    if (!file.dataUrl) {
      toast.warning("File is not available for download.");
      return;
    }
    const link = document.createElement("a");
    link.href = file.dataUrl.replace("?inline=1", "");
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPreview = (file: VaultFile) => {
    setPreviewFile(file);
  };

  const handleSaveReviewNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    const note = {
      novelty_risk: reviewNoveltyRisk,
      obviousness_risk: reviewObviousRisk,
      section_101_eligible: review101Eligible,
      analyst_summary: reviewSummary,
      key_novelty_points: reviewNoveltyPoints,
      prosecution_strategy: reviewStrategy,
      last_saved: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    try {
      await patchMatter({ review_note: note });
      setStageError(null);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 2500);
      toast.success("Review note saved successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the review note.");
    }
  };

  const handleUpdateStage = async (newStage: IPProject["stage"]) => {
    if (!selectedProject || newStage === selectedProject.stage) return;
    try {
      await patchMatter({ stage: newStage });
      setStageError(null);
    } catch (err) {
      setStageError(err instanceof Error ? err.message : "Could not update the stage.");
    }
  };

  const saveComparisons = (rows: ClaimFeatureComparison[]) =>
    patchMatter({ claim_comparisons: rows }).catch((err: Error) => toast.error(err.message));

  const handleAddComparisonRow = () => {
    if (!selectedProject) return;
    const newRow: ClaimFeatureComparison = {
      id: `feat-${Date.now()}`,
      feature_element: `Element [1.${(selectedProject.claim_comparisons?.length || 0) + 1}]: Novel structural/method limit...`,
      d1_citation: "Reference citation (e.g. US10982341 Col 2)",
      d1_rating: "DISTINGUISHED",
      d2_citation: "Reference citation (e.g. EP2891234 Par 12)",
      d2_rating: "DISTINGUISHED",
      distinguishing_argument: "Recite clear patentable distinction under 35 U.S.C. 102/103.",
    };
    saveComparisons([...(selectedProject.claim_comparisons || []), newRow]);
  };

  const handleUpdateComparisonRating = (
    rowId: string,
    field: "d1_rating" | "d2_rating",
    val: "IDENTICAL" | "EQUIVALENT" | "DISTINGUISHED"
  ) => {
    if (!selectedProject) return;
    saveComparisons((selectedProject.claim_comparisons || []).map((row) => (row.id === rowId ? { ...row, [field]: val } : row)));
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.matter_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || p.ip_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (file: VaultFile) => {
    const name = file.name.toLowerCase();
    if (name.endsWith(".pdf") || file.mimeType?.includes("pdf")) return FileText;
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".svg") || file.mimeType?.includes("image"))
      return ImageIcon;
    if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) return FileSpreadsheet;
    return FileText;
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] overflow-hidden bg-canvas">
      {/* Left 35%: Project Storage & Matter Directory */}
      <div className="flex w-[35%] flex-col border-r border-line overflow-hidden bg-surface/20">
        <header className="border-b border-line bg-surface/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent">
                Research Projects
              </span>
              <span className="text-xs text-muted">IP Docket</span>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-bold text-on-accent shadow-xs hover:brightness-110 transition"
            >
              <Plus className="size-3.5" />
              New Matter
            </button>
          </div>

          <h1 className="text-lg font-bold tracking-tight text-ink">Project Directory</h1>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
              <input
                type="text"
                placeholder="Search matter, title, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-line bg-canvas pl-8 pr-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-line bg-canvas px-2 py-1.5 text-xs font-semibold text-ink outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="PATENT">Patents</option>
              <option value="TRADEMARK">Trademarks</option>
              <option value="COPYRIGHT">Copyrights</option>
            </select>
          </div>
        </header>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted">
              <Folder className="size-8 text-faint mb-2 opacity-40" />
              <p className="text-xs font-semibold text-ink">No matters found</p>
              <p className="text-[11px] text-muted mt-1 max-w-xs">
                Click &quot;New Matter&quot; above to initialize an IP research docket and link prior art citations.
              </p>
            </div>
          ) : (
            filteredProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  selectedProject?.id === proj.id
                    ? "border-accent bg-accent/5 shadow-xs"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent">{proj.matter_ref}</span>
                    <span className="rounded bg-line px-1.5 py-0.2 text-[9.5px] font-bold text-muted">
                      {proj.ip_type}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                      proj.stage === "FINAL_APPROVAL"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : proj.stage === "DRAFTER_HANDOFF"
                        ? "bg-purple-500/10 text-purple-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {proj.stage.replace(/_/g, " ")}
                  </span>
                </div>

                <h3 className="mt-1.5 text-xs font-bold leading-snug text-ink">{proj.title}</h3>

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted font-medium">
                  <span>{proj.client}</span>
                  <span>{proj.vault_files?.length || 0} Docs</span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-muted">
                    <span>Progress: {proj.progress_pct}%</span>
                    <span>Due: {proj.docket_deadline}</span>
                  </div>
                  <div className="h-1 rounded-full bg-line overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${proj.progress_pct}%` }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right 65%: 5 Specialized Tabs (Project Storage, Uploads, Review Note, Tracker, Comparison) */}
      <div className="flex flex-1 flex-col overflow-hidden bg-canvas">
        {selectedProject ? (
          <>
            {/* Header / Active Matter Badge & Tab Navigation */}
            <div className="border-b border-line bg-surface p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs font-bold text-on-accent">
                      {selectedProject.matter_ref}
                    </span>
                    <span className="text-xs text-muted">· Lead: {selectedProject.lead_analyst}</span>
                    <span className="text-xs text-muted">· Deadline: {selectedProject.docket_deadline}</span>
                  </div>
                  <h2 className="mt-1 text-base font-bold text-ink">{selectedProject.title}</h2>
                </div>
              </div>

              {/* 5 Tabs Navigation Bar */}
              <div className="flex items-center gap-1.5 border-t border-line/60 pt-3">
                {[
                  { id: "storage" as MatterTab, label: "Project Storage", icon: Folder },
                  { id: "uploads" as MatterTab, label: "Uploads", icon: UploadCloud, count: selectedProject.vault_files?.length },
                  { id: "review" as MatterTab, label: "Review Note", icon: FileText },
                  { id: "tracker" as MatterTab, label: "Tracker", icon: Clock },
                  { id: "comparison" as MatterTab, label: "Comparison", icon: GitCompare, count: selectedProject.claim_comparisons?.length },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTabChange(t.id)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        isActive
                          ? "bg-accent text-on-accent shadow-xs"
                          : "text-muted hover:bg-hover hover:text-ink"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      <span>{t.label}</span>
                      {t.count !== undefined && (
                        <span
                          className={`ml-1 rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                            isActive ? "bg-white/20 text-white" : "bg-line text-muted"
                          }`}
                        >
                          {t.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Contents Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: PROJECT STORAGE OVERVIEW */}
              {activeTab === "storage" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
                      <div className="text-[11px] font-bold text-muted uppercase">Matter Classification</div>
                      <div className="mt-1 text-base font-bold text-ink">{selectedProject.ip_type}</div>
                      <div className="mt-0.5 text-[11px] text-muted">Statutory IP Docket</div>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
                      <div className="text-[11px] font-bold text-muted uppercase">Lifecycle Stage</div>
                      <div className="mt-1 text-base font-bold text-accent">{selectedProject.stage.replace(/_/g, " ")}</div>
                      <div className="mt-0.5 text-[11px] text-muted">{selectedProject.progress_pct}% Completed</div>
                    </div>
                    <div className="rounded-xl border border-line bg-surface p-4 shadow-xs">
                      <div className="text-[11px] font-bold text-muted uppercase">Vault Documents</div>
                      <div className="mt-1 text-base font-bold text-ink">{selectedProject.vault_files?.length || 0} Files</div>
                      <div className="mt-0.5 text-[11px] text-muted">Verified Evidence</div>
                    </div>
                  </div>

                  {/* Quick Access Card */}
                  <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink">Matter Details & Metadata</h3>
                      <button
                        onClick={() => handleTabChange("uploads")}
                        className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                      >
                        Upload & Manage Files
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted font-medium">Matter Reference:</span>
                        <div className="font-mono font-bold text-ink mt-0.5">{selectedProject.matter_ref}</div>
                      </div>
                      <div>
                        <span className="text-muted font-medium">Assignee / Client:</span>
                        <div className="font-bold text-ink mt-0.5">{selectedProject.client}</div>
                      </div>
                      <div>
                        <span className="text-muted font-medium">Lead Patent Analyst:</span>
                        <div className="font-bold text-ink mt-0.5">{selectedProject.lead_analyst}</div>
                      </div>
                      <div>
                        <span className="text-muted font-medium">Statutory Docket Deadline:</span>
                        <div className="font-bold text-amber-600 mt-0.5">{selectedProject.docket_deadline}</div>
                      </div>
                    </div>
                  </div>

                  {/* Summary of Review Note */}
                  {selectedProject.review_note && (
                    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-ink">Analyst Review Note</h3>
                        <span className="text-[10.5px] text-muted">Saved: {selectedProject.review_note.last_saved}</span>
                      </div>
                      <p className="text-xs text-ink leading-relaxed bg-canvas p-3.5 rounded-xl border border-line">
                        {selectedProject.review_note.analyst_summary || "No review summary drafted yet. Navigate to the Review Note tab to add evaluation notes."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: UPLOADS & FILE VAULT WITH DIRECT PREVIEW & VIEWER */}
              {activeTab === "uploads" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Upload Drop Zone with Drag & Drop */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`rounded-2xl border-2 border-dashed p-6 text-center space-y-3 transition ${
                      isDragging
                        ? "border-accent bg-accent/15 scale-[1.01]"
                        : "border-accent/40 bg-accent/5"
                    }`}
                  >
                    <UploadCloud className="size-10 text-accent mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-ink">Upload Technical Documents & Evidence</h3>
                      <p className="text-xs text-muted mt-0.5">
                        Drag & drop files here, or browse PDF, Word, Drawings (PNG/JPG), and Claim Charts.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <select
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value as any)}
                        className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink outline-none"
                      >
                        <option value="INVENTION_DISCLOSURE">Invention Disclosure (IDF)</option>
                        <option value="PRIOR_ART">Prior Art Citation (NPL/Patent)</option>
                        <option value="DRAWING">Technical Drawing Sheet</option>
                        <option value="CLAIM_CHART">Claim Chart Matrix</option>
                        <option value="OTHER">General Attachment</option>
                      </select>

                      <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-on-accent shadow-xs hover:brightness-110 transition">
                        <FileUp className="size-3.5" />
                        {isUploading ? "Uploading & Processing..." : "Select Files"}
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Uploaded File List with Preview & Download Actions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink">
                        Vault Documents ({selectedProject.vault_files?.length || 0})
                      </h3>
                      <span className="text-xs text-muted">Click any file or &quot;Preview&quot; to view content</span>
                    </div>

                    {selectedProject.vault_files && selectedProject.vault_files.length > 0 ? (
                      <div className="space-y-2.5 text-xs">
                        {selectedProject.vault_files.map((file) => {
                          const Icon = getFileIcon(file);
                          return (
                            <div
                              key={file.id}
                              className="group flex items-center justify-between rounded-xl border border-line bg-surface p-3.5 shadow-2xs hover:border-accent/60 hover:bg-accent/5 transition"
                            >
                              <div
                                onClick={() => handleOpenPreview(file)}
                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                              >
                                <div className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0 group-hover:bg-accent group-hover:text-white transition">
                                  <Icon className="size-4.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-ink truncate group-hover:text-accent transition flex items-center gap-1.5">
                                    <span>{file.name}</span>
                                    <Eye className="size-3 text-muted opacity-0 group-hover:opacity-100 transition" />
                                  </div>
                                  <div className="text-[10.5px] text-muted flex items-center gap-2 mt-0.5">
                                    <span>{file.size}</span>
                                    <span>·</span>
                                    <span className="font-mono">{file.hash}</span>
                                    <span>·</span>
                                    <span>Uploaded: {file.uploadedAt}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-md bg-line px-2 py-0.5 text-[10px] font-bold text-muted">
                                  {file.category.replace(/_/g, " ")}
                                </span>

                                <button
                                  onClick={() => handleOpenPreview(file)}
                                  className="flex items-center gap-1 rounded-lg border border-line bg-canvas px-2.5 py-1 text-[11px] font-bold text-ink hover:border-accent hover:text-accent transition"
                                  title="View File"
                                >
                                  <Eye className="size-3.5" />
                                  <span>View</span>
                                </button>

                                <button
                                  onClick={() => handleDownloadFile(file)}
                                  className="rounded-lg p-1.5 text-muted hover:bg-line hover:text-ink transition"
                                  title="Download Original File"
                                >
                                  <Download className="size-3.5" />
                                </button>

                                <button
                                  onClick={() => handleDeleteFile(file.id)}
                                  className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 transition"
                                  title="Delete file"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-line bg-surface p-8 text-center text-muted">
                        <FileText className="size-8 text-faint mb-2 opacity-40 mx-auto" />
                        <p className="text-xs font-semibold text-ink">No documents uploaded yet</p>
                        <p className="text-[11px] text-muted mt-1">Upload technical disclosures or prior art files above.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: REVIEW NOTE & EVALUATION */}
              {activeTab === "review" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {saveSuccessNotice && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Review Note successfully saved and synced to matter docket.</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveReviewNote} className="space-y-6">
                    {/* Risk Rating Assessment Row */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase">35 U.S.C. 102 Novelty Risk</label>
                        <select
                          value={reviewNoveltyRisk}
                          onChange={(e) => setReviewNoveltyRisk(e.target.value as any)}
                          className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-ink outline-none"
                        >
                          <option value="LOW">LOW (Strong Novelty)</option>
                          <option value="MEDIUM">MEDIUM (Close Prior Art)</option>
                          <option value="HIGH">HIGH (Anticipated)</option>
                        </select>
                      </div>

                      <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase">35 U.S.C. 103 Obviousness</label>
                        <select
                          value={reviewObviousRisk}
                          onChange={(e) => setReviewObviousRisk(e.target.value as any)}
                          className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-ink outline-none"
                        >
                          <option value="LOW">LOW (Clear Distinction)</option>
                          <option value="MEDIUM">MEDIUM (Potential 103 Combo)</option>
                          <option value="HIGH">HIGH (Obvious Combination)</option>
                        </select>
                      </div>

                      <div className="rounded-xl border border-line bg-surface p-4 space-y-2">
                        <label className="text-[11px] font-bold text-muted uppercase">Section 101 Eligibility</label>
                        <select
                          value={review101Eligible ? "YES" : "NO"}
                          onChange={(e) => setReview101Eligible(e.target.value === "YES")}
                          className="w-full rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-ink outline-none"
                        >
                          <option value="YES">Eligible (Technical Character)</option>
                          <option value="NO">Alice / Abstract Idea Risk</option>
                        </select>
                      </div>
                    </div>

                    {/* Section: Analyst Findings Summary */}
                    <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-ink uppercase tracking-wider">
                          Patent Analyst Executive Findings & Novelty Summary *
                        </label>
                        <span className="text-[11px] text-muted">Required for Drafter Handoff</span>
                      </div>
                      <textarea
                        rows={4}
                        required
                        value={reviewSummary}
                        onChange={(e) => setReviewSummary(e.target.value)}
                        placeholder="Detail the technical solution, comparison against identified prior art, and patentability conclusion..."
                        className="w-full rounded-xl border border-line bg-canvas p-3 text-xs text-ink leading-relaxed outline-none focus:border-accent"
                      />
                    </div>

                    {/* Section: Key Novelty Points */}
                    <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
                      <label className="text-xs font-bold text-ink uppercase tracking-wider">
                        Key Points of Novelty & Distinguishing Technical Features
                      </label>
                      <textarea
                        rows={3}
                        value={reviewNoveltyPoints}
                        onChange={(e) => setReviewNoveltyPoints(e.target.value)}
                        placeholder="1. Distinct cryptographic lattice signature handshake...&#10;2. Dynamic microsecond epoch key rotation..."
                        className="w-full rounded-xl border border-line bg-canvas p-3 text-xs text-ink leading-relaxed outline-none focus:border-accent"
                      />
                    </div>

                    {/* Section: Prosecution Strategy */}
                    <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
                      <label className="text-xs font-bold text-ink uppercase tracking-wider">
                        Recommended Prosecution & Claim Drafting Strategy
                      </label>
                      <textarea
                        rows={2}
                        value={reviewStrategy}
                        onChange={(e) => setReviewStrategy(e.target.value)}
                        placeholder="Draft independent system and computer-implemented method claims..."
                        className="w-full rounded-xl border border-line bg-canvas p-3 text-xs text-ink leading-relaxed outline-none focus:border-accent"
                      />
                    </div>

                    {/* Submit Bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-line">
                      <div className="text-xs text-muted">
                        Signed as: <strong className="text-ink">{selectedProject.lead_analyst}</strong>
                      </div>
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-on-accent shadow-sm hover:brightness-110 transition"
                      >
                        <Save className="size-3.5" />
                        Save Review Note
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: TRACKER & MILESTONES PIPELINE */}
              {activeTab === "tracker" && (() => {
                const STAGE_ORDER = ["DISCLOSURE_RECEIVED", "PRIOR_ART_SEARCH", "REVIEW_NOTE", "DRAFTER_HANDOFF", "FINAL_APPROVAL"] as const;
                const currentStageIdx = STAGE_ORDER.indexOf(selectedProject.stage);
                const nextStageKey = currentStageIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentStageIdx + 1] : null;
                const prevStageKey = currentStageIdx > 0 ? STAGE_ORDER[currentStageIdx - 1] : null;
                const hasReviewSummary = Boolean(selectedProject.review_note?.analyst_summary?.trim());

                const deadlineDays = selectedProject.docket_deadline
                  ? Math.ceil((new Date(selectedProject.docket_deadline).getTime() - Date.now()) / (1000 * 3600 * 24))
                  : null;

                const STAGES_META = [
                  {
                    key: "DISCLOSURE_RECEIVED" as const,
                    step: 1,
                    title: "1. Disclosure Received",
                    shortName: "Disclosure Received",
                    desc: "Inventor IDF & technical specifications ingested.",
                    badge: "Stage 1 · Ingestion",
                    checkLabel: `${selectedProject.vault_files?.length || 0} Files in Vault`,
                    tabAction: "uploads" as MatterTab,
                    tabLabel: "Vault Files",
                  },
                  {
                    key: "PRIOR_ART_SEARCH" as const,
                    step: 2,
                    title: "2. Prior Art Search",
                    shortName: "Prior Art Search",
                    desc: "Boolean & AI semantic query runs across IP5 databases.",
                    badge: "Stage 2 · Search & Matrix",
                    checkLabel: `${selectedProject.claim_comparisons?.length || 0} Claim Features Mapped`,
                    tabAction: "comparison" as MatterTab,
                    tabLabel: "Feature Comparison",
                  },
                  {
                    key: "REVIEW_NOTE" as const,
                    step: 3,
                    title: "3. Review Note Drafted",
                    shortName: "Review Note Drafted",
                    desc: "Patentability evaluation, 102/103 risk scoring completed.",
                    badge: "Stage 3 · Analyst Review",
                    checkLabel: hasReviewSummary ? "Novelty Summary Complete" : "Summary Required",
                    tabAction: "review" as MatterTab,
                    tabLabel: "Review Note",
                  },
                  {
                    key: "DRAFTER_HANDOFF" as const,
                    step: 4,
                    title: "4. Drafter Handoff",
                    shortName: "Drafter Handoff",
                    desc: "Transferred to Patent Drafter for formal claims generation.",
                    badge: "Stage 4 · Drafting Assignment",
                    checkLabel: currentStageIdx >= 3 ? "Transferred to Drafter Studio" : "Pending Handoff",
                    linkUrl: "/dashboard/patent-drafter",
                    linkLabel: "Open Drafting Studio",
                  },
                  {
                    key: "FINAL_APPROVAL" as const,
                    step: 5,
                    title: "5. Final Approval & Filing",
                    shortName: "Final Approval & Filing",
                    desc: "Executive sign-off and USPTO electronic filing clearance.",
                    badge: "Stage 5 · Executive Filing",
                    checkLabel: currentStageIdx >= 4 ? "In CEO Approval Queue" : "Pending Sign-Off",
                    linkUrl: "/dashboard/ceo/approvals",
                    linkLabel: "Open CEO Approvals",
                  },
                ];

                return (
                  <div className="max-w-3xl mx-auto space-y-6">
                    {/* DOCKET & SLA TRACKER HEADER CARD */}
                    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-accent">{selectedProject.matter_ref}</span>
                            <span className="text-xs text-muted">· Lead: {selectedProject.lead_analyst}</span>
                            <span className="text-xs text-muted">· Client: {selectedProject.client}</span>
                          </div>
                          <h3 className="text-base font-bold text-ink mt-1">Prosecution Lifecycle & SLA Tracker</h3>
                        </div>

                        {/* Deadline Countdown Badge */}
                        <div className="flex items-center gap-2 shrink-0">
                          {deadlineDays !== null && (
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                                deadlineDays < 0
                                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                  : deadlineDays <= 14
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              }`}
                            >
                              {deadlineDays < 0 ? (
                                <>
                                  <AlertTriangle className="size-3.5" />
                                  <span>Overdue by {Math.abs(deadlineDays)} Days</span>
                                </>
                              ) : deadlineDays <= 14 ? (
                                <>
                                  <Clock className="size-3.5" />
                                  <span>Urgent: {deadlineDays} Days Left</span>
                                </>
                              ) : (
                                <>
                                  <Calendar className="size-3.5" />
                                  <span>{deadlineDays} Days Left</span>
                                </>
                              )}
                            </span>
                          )}
                          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                            {selectedProject.progress_pct}% Completed
                          </span>
                        </div>
                      </div>

                      {/* Overall Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[11px] text-muted">
                          <span>Progress: {selectedProject.stage.replace(/_/g, " ")}</span>
                          <span>Deadline: {selectedProject.docket_deadline}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${selectedProject.progress_pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Meta Indicators */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                        <div className="rounded-lg bg-canvas p-2.5 border border-line">
                          <span className="text-[10.5px] text-muted font-medium">Vault Documents</span>
                          <p className="font-bold text-ink mt-0.5">{selectedProject.vault_files?.length || 0} Files</p>
                        </div>
                        <div className="rounded-lg bg-canvas p-2.5 border border-line">
                          <span className="text-[10.5px] text-muted font-medium">Claim Matrix</span>
                          <p className="font-bold text-ink mt-0.5">{selectedProject.claim_comparisons?.length || 0} Elements</p>
                        </div>
                        <div className="rounded-lg bg-canvas p-2.5 border border-line">
                          <span className="text-[10.5px] text-muted font-medium">Novelty Risk</span>
                          <p className="font-bold text-ink mt-0.5">{selectedProject.review_note?.novelty_risk || "Pending"}</p>
                        </div>
                        <div className="rounded-lg bg-canvas p-2.5 border border-line">
                          <span className="text-[10.5px] text-muted font-medium">Section 101</span>
                          <p className="font-bold text-emerald-600 mt-0.5">
                            {selectedProject.review_note?.section_101_eligible ? "Eligible" : "Under Evaluation"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* STAGE PROGRESSION ACTION CONTROLS */}
                    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Active Stage Action</div>
                          <div className="text-sm font-bold text-ink mt-0.5 flex items-center gap-2">
                            <span>{STAGES_META[currentStageIdx].title}</span>
                            <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent uppercase">
                              Active
                            </span>
                          </div>
                        </div>

                        {/* Progression Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {prevStageKey && (
                            <button
                              onClick={async () => {
                                const ok = await toast.confirm({
                                  title: "Revert Matter Stage",
                                  message: `Revert matter status back to "${STAGES_META[currentStageIdx - 1].shortName}"?`,
                                  confirmText: "Revert",
                                  danger: true,
                                });
                                if (ok) {
                                  handleUpdateStage(prevStageKey);
                                }
                              }}
                              className="flex items-center gap-1 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:border-line-strong transition"
                            >
                              <ArrowLeft className="size-3" />
                              <span>Revert Step</span>
                            </button>
                          )}

                          {nextStageKey ? (
                            <button
                              onClick={() => {
                                if (nextStageKey === "DRAFTER_HANDOFF" && !hasReviewSummary) {
                                  setStageError("Review Note summary is required before handing off to Patent Drafter. Please complete it in the Review Note tab.");
                                  return;
                                }
                                handleUpdateStage(nextStageKey);
                              }}
                              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-xs hover:brightness-110 transition"
                            >
                              <span>Advance to {STAGES_META[currentStageIdx + 1].shortName}</span>
                              <ArrowRight className="size-3.5" />
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-600">
                              <CheckCircle2 className="size-3.5" />
                              <span>Lifecycle Complete</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Missing Prerequisite Alert & One-Click Shortcut */}
                      {nextStageKey === "DRAFTER_HANDOFF" && !hasReviewSummary && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                            <span>Analyst Review Note summary required before drafter handoff.</span>
                          </div>
                          <button
                            onClick={() => handleTabChange("review")}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-700 transition shrink-0"
                          >
                            <span>Draft Review Note</span>
                            <ArrowRight className="size-3" />
                          </button>
                        </div>
                      )}

                      {/* Downstream Integration Links */}
                      {selectedProject.stage === "DRAFTER_HANDOFF" && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs">
                          <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
                            <FileEdit className="size-4 shrink-0 text-purple-600" />
                            <span>Matter assigned to Patent Drafter. Drafting studio tasks are active.</span>
                          </div>
                          <a
                            href="/dashboard/patent-drafter"
                            className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1 font-bold text-white hover:bg-purple-700 transition shrink-0"
                          >
                            <span>Open Drafting Studio</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      )}

                      {selectedProject.stage === "FINAL_APPROVAL" && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                            <span>Matter is ready for final executive sign-off in CEO approvals queue.</span>
                          </div>
                          <a
                            href="/dashboard/ceo/approvals"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700 transition shrink-0"
                          >
                            <span>Open CEO Approvals</span>
                            <ExternalLink className="size-3" />
                          </a>
                        </div>
                      )}

                      {stageError && (
                        <p role="alert" className="rounded-lg border border-critical/25 bg-critical-soft px-3 py-2 text-xs text-critical">
                          {stageError}
                        </p>
                      )}
                    </div>

                    {/* 5-STAGE PROSECUTION MILESTONES PIPELINE */}
                    <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-ink">5-Stage Prosecution Milestone Pipeline</h4>
                        <p className="text-xs text-muted">Click any actionable stage to update lifecycle progression or review details.</p>
                      </div>

                      <div className="space-y-3 pt-1">
                        {STAGES_META.map((st, i) => {
                          const isCurrent = selectedProject.stage === st.key;
                          const isPast = STAGE_ORDER.indexOf(st.key) < currentStageIdx;
                          const isNext = STAGE_ORDER.indexOf(st.key) === currentStageIdx + 1;
                          const isFuture = STAGE_ORDER.indexOf(st.key) > currentStageIdx + 1;

                          return (
                            <div
                              key={st.key}
                              onClick={async () => {
                                if (isCurrent) return;
                                if (isNext) {
                                  if (st.key === "DRAFTER_HANDOFF" && !hasReviewSummary) {
                                    setStageError("Review Note summary is required before handing off to Patent Drafter.");
                                    return;
                                  }
                                  handleUpdateStage(st.key);
                                } else if (isPast) {
                                  const ok = await toast.confirm({
                                    title: "Revert Lifecycle",
                                    message: `Revert lifecycle back to "${st.shortName}"?`,
                                    confirmText: "Revert",
                                    danger: true,
                                  });
                                  if (ok) {
                                    handleUpdateStage(st.key);
                                  }
                                } else {
                                  setStageError(`Please complete stage "${STAGES_META[currentStageIdx + 1].shortName}" before unlocking this step.`);
                                }
                              }}
                              className={`flex items-start gap-3 rounded-xl border p-4 transition-all ${
                                isCurrent
                                  ? "border-accent bg-accent/5 shadow-xs"
                                  : isPast
                                  ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 cursor-pointer"
                                  : isNext
                                  ? "border-accent/40 bg-accent/5 hover:border-accent cursor-pointer"
                                  : "border-line bg-canvas/60 opacity-75 cursor-not-allowed"
                              }`}
                            >
                              {/* Stage Number / Status Icon */}
                              <div
                                className={`flex size-7 items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                                  isCurrent
                                    ? "bg-accent text-on-accent"
                                    : isPast
                                    ? "bg-emerald-600 text-white"
                                    : isNext
                                    ? "border-2 border-accent text-accent bg-transparent"
                                    : "bg-line text-muted"
                                }`}
                              >
                                {isPast ? (
                                  <CheckCircle className="size-4" />
                                ) : isFuture ? (
                                  <Lock className="size-3.5 opacity-60" />
                                ) : (
                                  st.step
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${isCurrent ? "text-accent" : isPast ? "text-emerald-700 dark:text-emerald-400" : "text-ink"}`}>
                                      {st.title}
                                    </span>
                                    <span className="text-[10px] text-muted hidden sm:inline">· {st.badge}</span>
                                  </div>

                                  {isCurrent ? (
                                    <span className="rounded bg-accent px-2 py-0.5 text-[9px] font-bold text-on-accent uppercase">
                                      Active Stage
                                    </span>
                                  ) : isPast ? (
                                    <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                                      Completed
                                    </span>
                                  ) : isNext ? (
                                    <span className="rounded bg-accent/15 border border-accent/30 px-2 py-0.5 text-[9px] font-bold text-accent">
                                      Ready to Advance
                                    </span>
                                  ) : (
                                    <span className="rounded bg-line px-2 py-0.5 text-[9px] font-bold text-muted flex items-center gap-1">
                                      <Lock className="size-2.5" />
                                      Locked
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-muted mt-1">{st.desc}</p>

                                <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
                                  <span className="font-semibold text-muted flex items-center gap-1">
                                    {isPast && <CheckCircle2 className="size-3 text-emerald-600 inline" />}
                                    {st.checkLabel}
                                  </span>

                                  {st.tabAction && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTabChange(st.tabAction!);
                                      }}
                                      className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5"
                                    >
                                      <span>View {st.tabLabel}</span>
                                      <ArrowRight className="size-3" />
                                    </button>
                                  )}

                                  {st.linkUrl && (isCurrent || isPast) && (
                                    <a
                                      href={st.linkUrl}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5"
                                    >
                                      <span>{st.linkLabel}</span>
                                      <ExternalLink className="size-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* STAGE HISTORY AUDIT TRAIL */}
                      {selectedProject.history && selectedProject.history.length > 0 ? (
                        <div className="border-t border-line pt-4 space-y-2">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                            <History className="size-3.5" />
                            <span>Milestone Transition Audit Trail</span>
                          </h4>
                          <ul className="space-y-2 pt-1">
                            {[...selectedProject.history].reverse().map((h, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-xs text-muted">
                                <div className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                                <div>
                                  <span className="font-bold text-ink">
                                    {h.to.replace(/_/g, " ")}
                                  </span>
                                  {h.from ? (
                                    <span> (transitioned from {h.from.replace(/_/g, " ")})</span>
                                  ) : (
                                    <span> (matter initialized)</span>
                                  )}
                                  <span className="text-[10.5px] text-muted"> · by {h.by} · {new Date(h.at).toLocaleString()}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {/* DANGER ZONE: DELETE MATTER */}
                      <div className="border-t border-line pt-4 flex items-center justify-between">
                        <span className="text-xs text-muted">Permanently remove this research matter and all vault documents.</span>
                        <button
                          onClick={handleDeleteMatter}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-critical/30 px-3 py-1.5 text-xs font-semibold text-critical hover:bg-critical-soft transition"
                        >
                          <Trash2 className="size-3.5" /> Delete matter
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 5: FEATURE COMPARISON MATRIX */}
              {activeTab === "comparison" && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ink">Feature-by-Feature Claim Comparison Matrix</h3>
                      <p className="text-xs text-muted">
                        Evaluate subject claim limitations side-by-side against D1 and D2 prior art publications.
                      </p>
                    </div>
                    <button
                      onClick={handleAddComparisonRow}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-on-accent shadow-xs hover:brightness-110 transition"
                    >
                      <Plus className="size-3.5" />
                      Add Claim Element
                    </button>
                  </div>

                  {/* Matrix Table */}
                  <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
                    {selectedProject.claim_comparisons && selectedProject.claim_comparisons.length > 0 ? (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-line bg-canvas/80 text-[11px] font-bold uppercase tracking-wider text-muted">
                            <th className="p-3.5 w-1/3">Subject Claim Limitation</th>
                            <th className="p-3.5 w-1/4">Prior Art Ref D1</th>
                            <th className="p-3.5 w-1/4">Prior Art Ref D2</th>
                            <th className="p-3.5">Distinguishing Argument</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {selectedProject.claim_comparisons.map((row) => (
                            <tr key={row.id} className="hover:bg-canvas/50 transition">
                              <td className="p-3.5 font-bold text-ink align-top">
                                {row.feature_element}
                              </td>
                              <td className="p-3.5 align-top space-y-1.5">
                                <div className="text-[11px] text-muted">{row.d1_citation}</div>
                                <div className="flex gap-1">
                                  {(["IDENTICAL", "EQUIVALENT", "DISTINGUISHED"] as const).map((r) => (
                                    <button
                                      key={r}
                                      onClick={() => handleUpdateComparisonRating(row.id, "d1_rating", r)}
                                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition ${
                                        row.d1_rating === r
                                          ? r === "IDENTICAL"
                                            ? "bg-red-500 text-white"
                                            : r === "EQUIVALENT"
                                            ? "bg-amber-500 text-white"
                                            : "bg-emerald-600 text-white"
                                          : "bg-line text-muted hover:bg-hover"
                                      }`}
                                    >
                                      {r[0]}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3.5 align-top space-y-1.5">
                                <div className="text-[11px] text-muted">{row.d2_citation}</div>
                                <div className="flex gap-1">
                                  {(["IDENTICAL", "EQUIVALENT", "DISTINGUISHED"] as const).map((r) => (
                                    <button
                                      key={r}
                                      onClick={() => handleUpdateComparisonRating(row.id, "d2_rating", r)}
                                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition ${
                                        row.d2_rating === r
                                          ? r === "IDENTICAL"
                                            ? "bg-red-500 text-white"
                                            : r === "EQUIVALENT"
                                            ? "bg-amber-500 text-white"
                                            : "bg-emerald-600 text-white"
                                          : "bg-line text-muted hover:bg-hover"
                                      }`}
                                    >
                                      {r[0]}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3.5 text-[11px] text-muted leading-relaxed align-top">
                                {row.distinguishing_argument}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-8 text-center text-muted">
                        <GitCompare className="size-8 text-faint mb-2 opacity-40 mx-auto" />
                        <p className="text-xs font-semibold text-ink">No claim comparison elements added</p>
                        <p className="text-[11px] text-muted mt-1">
                          Click &quot;Add Claim Element&quot; above to map claim limitations against prior art references.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-muted">
            <div className="rounded-2xl border border-line bg-surface p-8 max-w-sm">
              <Folder className="size-10 mb-2 opacity-30 mx-auto" />
              <p className="font-semibold text-ink text-xs">{loadError ?? "No Matter Selected"}</p>
              <p className="text-[11px] text-muted mt-1">
                Select or initialize a research matter from the left directory to view project storage, files, review notes, tracker, and feature comparisons.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN FILE PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
            {/* Preview Modal Header */}
            <div className="flex items-center justify-between border-b border-line bg-canvas px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-ink truncate">{previewFile.name}</h3>
                  <div className="text-[10.5px] text-muted flex items-center gap-2">
                    <span>{previewFile.size}</span>
                    <span>·</span>
                    <span className="rounded bg-line px-1.5 py-0.2 font-bold text-muted text-[9.5px]">
                      {previewFile.category.replace(/_/g, " ")}
                    </span>
                    <span>·</span>
                    <span>{previewFile.uploadedAt}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile(previewFile)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-on-accent shadow-xs hover:brightness-110 transition"
                >
                  <Download className="size-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="rounded-lg p-1.5 text-muted hover:bg-line hover:text-ink transition"
                >
                  <X className="size-4.5" />
                </button>
              </div>
            </div>

            {/* Preview Modal Content Body */}
            <div className="flex-1 overflow-hidden bg-canvas/60 p-4 flex items-center justify-center">
              {previewFile.dataUrl ? (
                previewFile.name.toLowerCase().endsWith(".pdf") || previewFile.mimeType?.includes("pdf") ? (
                  <iframe
                    src={previewFile.dataUrl}
                    className="w-full h-full rounded-xl border border-line bg-white shadow-inner"
                    title={previewFile.name}
                  />
                ) : previewFile.name.toLowerCase().endsWith(".docx") ||
                  previewFile.name.toLowerCase().endsWith(".doc") ||
                  previewFile.mimeType?.includes("word") ||
                  previewFile.mimeType?.includes("officedocument") ? (
                  <div className="w-full h-full overflow-y-auto p-4 sm:p-6 bg-canvas/80">
                    <div className="max-w-4xl mx-auto rounded-2xl border border-line bg-white text-slate-900 shadow-2xl p-8 sm:p-12 font-sans space-y-4 min-h-[60vh]">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs text-slate-500 font-mono">
                        <span className="font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                          <FileText className="size-3.5" />
                          Word Document (.docx) Interactive Reader
                        </span>
                        <span>{previewFile.size}</span>
                      </div>

                      {isConvertingDocx ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                          <div className="size-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                          <p className="text-xs font-bold text-slate-700">Converting Word Document to Interactive Layout...</p>
                        </div>
                      ) : docxHtml ? (
                        <div
                          className="prose prose-slate max-w-none text-[13.5px] leading-relaxed text-slate-800 space-y-3 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-slate-900 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:text-lg [&_h3]:font-bold [&_p]:leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_table]:my-4 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-bold [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-bold [&_em]:italic"
                          dangerouslySetInnerHTML={{ __html: docxHtml }}
                        />
                      ) : (
                        <div className="text-center py-12 text-slate-500">
                          <p className="text-xs font-semibold">Empty document or unformatted Word content.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : previewFile.mimeType?.includes("image") ||
                  previewFile.name.toLowerCase().match(/\.(png|jpg|jpeg|svg|webp|gif)$/) ? (
                  <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewFile.dataUrl}
                      alt={previewFile.name}
                      className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-md">
                    <FileText className="size-16 text-accent opacity-80" />
                    <div>
                      <h4 className="font-bold text-ink text-sm">{previewFile.name}</h4>
                      <p className="text-xs text-muted mt-1">
                        Binary or raw document ({previewFile.size}). Click download to open with your system viewer.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadFile(previewFile)}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-on-accent shadow-md hover:brightness-110 transition"
                    >
                      <Download className="size-4" />
                      Download {previewFile.name}
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center text-muted p-8">
                  <FileText className="size-12 mb-2 opacity-40 mx-auto" />
                  <p className="text-xs font-bold text-ink">Preview not available for this record</p>
                  <p className="text-[11px] text-muted mt-1">
                    Re-upload the document to generate an in-browser interactive preview.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

              <div>
                <label className="font-bold text-ink">Assignee / Client Name</label>
                <input
                  type="text"
                  placeholder="e.g., Moat Global Technologies"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
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
                  />
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
                  className="rounded-lg bg-accent px-4 py-2 font-bold text-on-accent shadow-sm hover:brightness-110"
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

export default function ResearchProjectsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading research matters docket...</div>}>
      <ResearchProjectsInner />
    </React.Suspense>
  );
}
