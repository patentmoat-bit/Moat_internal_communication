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
} from "lucide-react";

export type MatterTab = "storage" | "uploads" | "review" | "tracker" | "comparison";

interface VaultFile {
  id: string;
  name: string;
  size: string;
  category: "INVENTION_DISCLOSURE" | "PRIOR_ART" | "DRAWING" | "CLAIM_CHART" | "OTHER";
  hash: string;
  uploadedAt: string;
}

interface ClaimFeatureComparison {
  id: string;
  feature_element: string;
  d1_citation: string;
  d1_rating: "IDENTICAL" | "EQUIVALENT" | "DISTINGUISHED";
  d2_citation: string;
  d2_rating: "IDENTICAL" | "EQUIVALENT" | "DISTINGUISHED";
  distinguishing_argument: string;
}

interface IPProject {
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
  vault_files?: VaultFile[];
  review_note?: {
    novelty_risk: "LOW" | "MEDIUM" | "HIGH";
    obviousness_risk: "LOW" | "MEDIUM" | "HIGH";
    section_101_eligible: boolean;
    analyst_summary: string;
    key_novelty_points: string;
    prosecution_strategy: string;
    last_saved: string;
  };
  claim_comparisons?: ClaimFeatureComparison[];
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

  const saveProjects = (updated: IPProject[]) => {
    setProjects(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("moat_research_matters", JSON.stringify(updated));
    }
  };

  const handleTabChange = (tab: MatterTab) => {
    setActiveTab(tab);
    router.replace(`/matters?tab=${tab}`);
  };

  const handleCreateMatter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const ref =
      newMatterRef.trim() ||
      `PAT-${new Date().getFullYear()}-${String(projects.length + 1).padStart(4, "0")}`;
    const newProj: IPProject = {
      id: `mat-${Date.now()}`,
      matter_ref: ref,
      title: newTitle.trim(),
      client: newClient.trim() || "Moat Enterprise Client",
      ip_type: newIpType,
      stage: "DISCLOSURE_RECEIVED",
      lead_analyst: newLead.trim() || "Patent Analyst",
      docket_deadline:
        newDeadline ||
        new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      documents_count: 0,
      progress_pct: 20,
      vault_files: [
        {
          id: `vf-${Date.now()}-1`,
          name: `${ref}_Invention_Disclosure.pdf`,
          size: "1.4 MB",
          category: "INVENTION_DISCLOSURE",
          hash: "a4f89d71c8b4e21...",
          uploadedAt: new Date().toISOString().split("T")[0],
        },
      ],
      review_note: {
        novelty_risk: "LOW",
        obviousness_risk: "LOW",
        section_101_eligible: true,
        analyst_summary: `Initial novelty investigation initialized for ${newTitle.trim()}. Prior art search underway.`,
        key_novelty_points: "1. Novel asynchronous enclave isolation mechanism.\n2. Quantum-resistant signature verification pipeline.",
        prosecution_strategy: "Draft independent method and system claims targeting IP5 jurisdiction filings.",
        last_saved: new Date().toISOString().replace("T", " ").substring(0, 16),
      },
      claim_comparisons: [
        {
          id: "feat-1",
          feature_element: "Element [1.1]: Hardware-isolated memory execution enclave",
          d1_citation: "US11842091B2 (Apple) Col 4, Lines 12-30",
          d1_rating: "IDENTICAL",
          d2_citation: "EP3982310A1 (Broadcom) Par 45",
          d2_rating: "EQUIVALENT",
          distinguishing_argument: "Our claim strictly recites dynamic zero-trust epoch key rotation absent in US11842091B2.",
        },
        {
          id: "feat-2",
          feature_element: "Element [1.2]: Asynchronous post-quantum lattice signature verification",
          d1_citation: "No disclosure in US11842091B2",
          d1_rating: "DISTINGUISHED",
          d2_citation: "EP3982310A1 Par 78 (Mentions classical RSA)",
          d2_rating: "DISTINGUISHED",
          distinguishing_argument: "Core point of novelty distinguishing claim 1 over all cited references under 35 U.S.C. 102/103.",
        },
      ],
    };

    const updated = [newProj, ...projects];
    saveProjects(updated);
    setSelectedProject(newProj);
    setShowNewModal(false);
    setNewMatterRef("");
    setNewTitle("");
    setNewClient("");
    setNewLead("");
    setNewDeadline("");
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedProject) return;
    setIsUploading(true);

    setTimeout(() => {
      const newVaultFiles: VaultFile[] = Array.from(files).map((f, idx) => ({
        id: `vf-${Date.now()}-${idx}`,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
        category: uploadCategory,
        hash: `sha256-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
        uploadedAt: new Date().toISOString().split("T")[0],
      }));

      const updated = projects.map((p) => {
        if (p.id === selectedProject.id) {
          const combined = [...(p.vault_files || []), ...newVaultFiles];
          return { ...p, vault_files: combined, documents_count: combined.length };
        }
        return p;
      });

      saveProjects(updated);
      setSelectedProject((prev) =>
        prev
          ? {
              ...prev,
              vault_files: [...(prev.vault_files || []), ...newVaultFiles],
              documents_count: (prev.vault_files?.length || 0) + newVaultFiles.length,
            }
          : null
      );
      setIsUploading(false);
    }, 400);
  };

  const handleDeleteFile = (fileId: string) => {
    if (!selectedProject) return;
    const updatedFiles = (selectedProject.vault_files || []).filter((f) => f.id !== fileId);
    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return { ...p, vault_files: updatedFiles, documents_count: updatedFiles.length };
      }
      return p;
    });
    saveProjects(updated);
    setSelectedProject((prev) => (prev ? { ...prev, vault_files: updatedFiles, documents_count: updatedFiles.length } : null));
  };

  const handleSaveReviewNote = (e: React.FormEvent) => {
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

    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return { ...p, review_note: note };
      }
      return p;
    });

    saveProjects(updated);
    setSelectedProject((prev) => (prev ? { ...prev, review_note: note } : null));
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleUpdateStage = (newStage: IPProject["stage"]) => {
    if (!selectedProject) return;
    const stagePctMap: Record<IPProject["stage"], number> = {
      DISCLOSURE_RECEIVED: 20,
      PRIOR_ART_SEARCH: 40,
      REVIEW_NOTE: 60,
      DRAFTER_HANDOFF: 80,
      FINAL_APPROVAL: 100,
    };

    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return { ...p, stage: newStage, progress_pct: stagePctMap[newStage] };
      }
      return p;
    });

    saveProjects(updated);
    setSelectedProject((prev) =>
      prev ? { ...prev, stage: newStage, progress_pct: stagePctMap[newStage] } : null
    );
  };

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

    const updatedRows = [...(selectedProject.claim_comparisons || []), newRow];
    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return { ...p, claim_comparisons: updatedRows };
      }
      return p;
    });

    saveProjects(updated);
    setSelectedProject((prev) => (prev ? { ...prev, claim_comparisons: updatedRows } : null));
  };

  const handleUpdateComparisonRating = (
    rowId: string,
    field: "d1_rating" | "d2_rating",
    val: "IDENTICAL" | "EQUIVALENT" | "DISTINGUISHED"
  ) => {
    if (!selectedProject) return;
    const updatedRows = (selectedProject.claim_comparisons || []).map((row) => {
      if (row.id === rowId) {
        return { ...row, [field]: val };
      }
      return row;
    });

    const updated = projects.map((p) => {
      if (p.id === selectedProject.id) {
        return { ...p, claim_comparisons: updatedRows };
      }
      return p;
    });

    saveProjects(updated);
    setSelectedProject((prev) => (prev ? { ...prev, claim_comparisons: updatedRows } : null));
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
              className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:brightness-110 transition"
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
                    <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs font-bold text-white">
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
                          ? "bg-accent text-white shadow-xs"
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
                        onClick={() => handleTabChange("review")}
                        className="flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                      >
                        Edit Review Note
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
                        <h3 className="text-sm font-bold text-ink">Analyst Review Note Summary</h3>
                        <span className="text-[10.5px] text-muted">Saved: {selectedProject.review_note.last_saved}</span>
                      </div>
                      <p className="text-xs text-ink leading-relaxed bg-canvas p-3.5 rounded-xl border border-line">
                        {selectedProject.review_note.analyst_summary || "No review summary drafted yet."}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: UPLOADS & FILE VAULT */}
              {activeTab === "uploads" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Upload Drop Zone */}
                  <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-6 text-center space-y-3">
                    <UploadCloud className="size-10 text-accent mx-auto" />
                    <div>
                      <h3 className="text-sm font-bold text-ink">Upload Technical Documents & Evidence</h3>
                      <p className="text-xs text-muted mt-0.5">
                        Invention Disclosures (PDF/Word), Prior Art Patents, FIG 1-N Drawings, or Claim Charts.
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

                      <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:brightness-110 transition">
                        <FileUp className="size-3.5" />
                        {isUploading ? "Uploading..." : "Select Files"}
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(e.target.files)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Uploaded File List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-ink">
                        Vault Documents ({selectedProject.vault_files?.length || 0})
                      </h3>
                      <span className="text-xs text-muted">SHA-256 Verified Storage</span>
                    </div>

                    {selectedProject.vault_files && selectedProject.vault_files.length > 0 ? (
                      <div className="space-y-2 text-xs">
                        {selectedProject.vault_files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5 shadow-2xs hover:border-line-strong transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
                                <FileText className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-ink truncate">{file.name}</div>
                                <div className="text-[10.5px] text-muted flex items-center gap-2 mt-0.5">
                                  <span>{file.size}</span>
                                  <span>·</span>
                                  <span className="font-mono">{file.hash}</span>
                                  <span>·</span>
                                  <span>{file.uploadedAt}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-line px-2 py-0.5 text-[10px] font-bold text-muted">
                                {file.category.replace(/_/g, " ")}
                              </span>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 transition"
                                title="Delete file"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
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
                        className="flex items-center gap-1.5 rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
                      >
                        <Save className="size-3.5" />
                        Save Review Note
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: TRACKER & MILESTONES PIPELINE */}
              {activeTab === "tracker" && (
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-ink">5-Stage Prosecution Milestone Pipeline</h3>
                        <p className="text-xs text-muted">Click any stage to update matter lifecycle progression.</p>
                      </div>
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                        {selectedProject.progress_pct}% Completed
                      </span>
                    </div>

                    {/* Pipeline Stage Bar */}
                    <div className="space-y-3 pt-2">
                      {(
                        [
                          {
                            key: "DISCLOSURE_RECEIVED" as const,
                            title: "1. Disclosure Received",
                            desc: "Inventor IDF & technical specifications ingested.",
                          },
                          {
                            key: "PRIOR_ART_SEARCH" as const,
                            title: "2. Prior Art Search",
                            desc: "Boolean & AI semantic query runs across IP5 databases.",
                          },
                          {
                            key: "REVIEW_NOTE" as const,
                            title: "3. Review Note Drafted",
                            desc: "Patentability evaluation, 102/103 risk scoring completed.",
                          },
                          {
                            key: "DRAFTER_HANDOFF" as const,
                            title: "4. Drafter Handoff",
                            desc: "Transferred to Patent Drafter for formal claims generation.",
                          },
                          {
                            key: "FINAL_APPROVAL" as const,
                            title: "5. Final Approval & Filing",
                            desc: "Executive sign-off and USPTO electronic filing.",
                          },
                        ] as const
                      ).map((st, i) => {
                        const isCurrent = selectedProject.stage === st.key;
                        const isPast =
                          (st.key === "DISCLOSURE_RECEIVED") ||
                          (st.key === "PRIOR_ART_SEARCH" && selectedProject.progress_pct >= 40) ||
                          (st.key === "REVIEW_NOTE" && selectedProject.progress_pct >= 60) ||
                          (st.key === "DRAFTER_HANDOFF" && selectedProject.progress_pct >= 80) ||
                          (st.key === "FINAL_APPROVAL" && selectedProject.progress_pct === 100);

                        return (
                          <div
                            key={st.key}
                            onClick={() => handleUpdateStage(st.key)}
                            className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                              isCurrent
                                ? "border-accent bg-accent/5 shadow-xs"
                                : isPast
                                ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                                : "border-line bg-canvas hover:border-line-strong"
                            }`}
                          >
                            <div
                              className={`flex size-6 items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5 ${
                                isCurrent
                                  ? "bg-accent text-white"
                                  : isPast
                                  ? "bg-emerald-600 text-white"
                                  : "bg-line text-muted"
                              }`}
                            >
                              {isPast && !isCurrent ? <CheckCircle className="size-3.5" /> : i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${isCurrent ? "text-accent" : "text-ink"}`}>
                                  {st.title}
                                </span>
                                {isCurrent && (
                                  <span className="rounded bg-accent px-2 py-0.2 text-[9px] font-bold text-white uppercase">
                                    Active Stage
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted mt-0.5">{st.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

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
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:brightness-110 transition"
                    >
                      <Plus className="size-3.5" />
                      Add Claim Element
                    </button>
                  </div>

                  {/* Matrix Table */}
                  <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
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
                        {(selectedProject.claim_comparisons || []).map((row) => (
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
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-muted">
            <div className="rounded-2xl border border-line bg-surface p-8 max-w-sm">
              <Folder className="size-10 mb-2 opacity-30 mx-auto" />
              <p className="font-semibold text-ink text-xs">No Matter Selected</p>
              <p className="text-[11px] text-muted mt-1">
                Select or initialize a research matter from the left directory to view project storage, files, review notes, tracker, and feature comparisons.
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

export default function ResearchProjectsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-muted">Loading research matters docket...</div>}>
      <ResearchProjectsInner />
    </React.Suspense>
  );
}
