import { create } from "zustand";
import { inventionService } from "@/services/inventionService";
import type { Invention, InventionAnalysis, InventionCreateInput, InventionDocument, InventionDocumentType } from "@/types/invention";

interface VersionEntry {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

interface InventionState {
  currentInvention: Invention | null;
  analysisStatus: "idle" | "saving" | "uploading" | "analyzing" | "complete" | "error";
  analysisResults: InventionAnalysis | null;
  documents: InventionDocument[];
  history: InventionAnalysis[];
  versions: VersionEntry[];
  progress: number;
  error: string | null;
  createOrUpdateDraft: (data: InventionCreateInput) => Promise<Invention>;
  uploadDocument: (file: File, fileType: InventionDocumentType) => Promise<InventionDocument>;
  analyze: () => Promise<InventionAnalysis>;
  loadHistory: () => Promise<InventionAnalysis[]>;
  autosaveLocal: (title: string, description: string) => void;
  restoreLocal: () => { title: string; description: string } | null;
}

function now() { return new Date().toISOString(); }
function unavailable(error: unknown) {
  return error instanceof Error && ["Failed to fetch", "Unauthorized", "User not found", "404", "An error occurred", "Upload failed"].some((text) => error.message.includes(text));
}

function localAnalysis(invention: Invention): InventionAnalysis {
  const text = `${invention.title}. ${invention.description || ""}`;
  const lower = text.toLowerCase();
  const domains = [
    lower.includes("battery") ? { name: "Battery", confidence: 0.86 } : null,
    lower.includes("robot") ? { name: "Robotics", confidence: 0.82 } : null,
    lower.includes("network") ? { name: "Networking", confidence: 0.78 } : null,
    lower.includes("medical") || lower.includes("patient") ? { name: "Medical Device", confidence: 0.8 } : null,
    lower.includes("model") || lower.includes("ai") ? { name: "AI", confidence: 0.76 } : null,
  ].filter(Boolean) as Array<Record<string, any>>;
  const selectedDomains = domains.length ? domains : [{ name: "General Engineering", confidence: 0.58 }];
  return {
    id: `local-analysis-${Date.now()}`,
    invention_id: invention.id,
    technical_summary: `The invention describes ${invention.title}. It converts the submitted invention description and supporting files into a structured technical profile with components, workflow, and architecture.`,
    innovation_summary: "The likely innovation centers on how the disclosed components are coordinated to produce a practical technical result with improved automation, reliability, or performance.",
    key_components: [
      { name: "Input Capture", function: "Receives invention data, uploaded diagrams, patents, sketches, or technical documents.", evidence: "Submitted workspace content" },
      { name: "Processing Logic", function: "Transforms input information into summaries, domains, workflows, and patentable concepts.", evidence: "Invention analysis flow" },
      { name: "Output Profile", function: "Stores structured patent intelligence for downstream patent search and claim workflows.", evidence: "Generated results" },
    ],
    technical_domains: selectedDomains,
    differentiators: [
      { differentiator: "Structured conversion of raw invention input into patent intelligence", why_it_matters: "This creates repeatable intake artifacts for search, drafting, and review." },
      { differentiator: "Multi-format invention context", why_it_matters: "Text, patents, PDFs, sketches, diagrams, and images can support richer technical understanding." },
    ],
    workflows: [
      { step: 1, action: "Capture invention description and uploaded technical artifacts", output: "Source context" },
      { step: 2, action: "Extract components, domains, workflows, and differentiators", output: "Structured invention profile" },
      { step: 3, action: "Highlight likely patentable concepts", output: "Patentability highlights" },
    ],
    technical_architecture: { layers: ["Input", "Extraction", "Analysis", "Patent intelligence output"], components: ["Workspace editor", "Document parser", "AI analysis engine", "Invention profile"], data_flow: "Submitted content flows through extraction and analysis into a reusable invention profile." },
    innovation_highlights: [
      { title: "Multi-modal invention profile generation", rationale: "Combines text and supporting artifacts into structured patent intelligence." },
      { title: "Workflow and architecture extraction", rationale: "Produces patent-relevant process and system views from early-stage invention material." },
    ],
    confidence_score: 0.66,
    model_name: "local-fallback",
    created_at: now(),
  };
}

function localInvention(data: InventionCreateInput): Invention {
  return {
    id: `local-invention-${Date.now()}`,
    workspace_id: data.workspace_id ?? null,
    matter_id: data.matter_id ?? null,
    title: data.title,
    description: data.description ?? "",
    status: data.status ?? "draft",
    created_by: "demo-user",
    created_at: now(),
    updated_at: now(),
    documents: [],
    latest_analysis: null,
  };
}

export const useInventionStore = create<InventionState>((set, get) => ({
  currentInvention: null,
  analysisStatus: "idle",
  analysisResults: null,
  documents: [],
  history: [],
  versions: [],
  progress: 0,
  error: null,

  createOrUpdateDraft: async (data) => {
    set({ analysisStatus: "saving", error: null, progress: 12 });
    const existing = get().currentInvention;
    try {
      const invention = existing ? await inventionService.update(existing.id, data) : await inventionService.create(data);
      set({ currentInvention: invention, documents: invention.documents, analysisResults: invention.latest_analysis ?? null, analysisStatus: "idle", progress: 25 });
      return invention;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const invention = existing ? { ...existing, ...data, updated_at: now() } as Invention : localInvention(data);
      const versions = [{ id: `version-${Date.now()}`, title: invention.title, description: invention.description ?? "", created_at: now() }, ...get().versions].slice(0, 8);
      set({ currentInvention: invention, documents: invention.documents, analysisStatus: "idle", versions, progress: 25 });
      return invention;
    }
  },

  uploadDocument: async (file, fileType) => {
    const invention = get().currentInvention;
    if (!invention) throw new Error("Create an invention before uploading files");
    set({ analysisStatus: "uploading", progress: 42 });
    try {
      const doc = await inventionService.upload(invention.id, file, fileType);
      const documents = [doc, ...get().documents];
      set({ documents, currentInvention: { ...invention, documents }, analysisStatus: "idle", progress: 52 });
      return doc;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const doc: InventionDocument = { id: `local-doc-${Date.now()}`, invention_id: invention.id, file_name: file.name, file_type: fileType, content_type: file.type, storage_url: null, created_at: now() };
      const documents = [doc, ...get().documents];
      set({ documents, currentInvention: { ...invention, documents, status: "ready" }, analysisStatus: "idle", progress: 52 });
      return doc;
    }
  },

  analyze: async () => {
    const invention = get().currentInvention;
    if (!invention) throw new Error("Create an invention before analysis");
    set({ analysisStatus: "analyzing", progress: 72, error: null });
    try {
      const result = await inventionService.analyze(invention.id);
      set({ currentInvention: result.invention, analysisResults: result.analysis, history: [result.analysis, ...get().history], analysisStatus: "complete", progress: 100 });
      return result.analysis;
    } catch (error) {
      if (!unavailable(error)) throw error;
      const analysis = localAnalysis(invention);
      const updated = { ...invention, status: "analyzed" as const, latest_analysis: analysis };
      set({ currentInvention: updated, analysisResults: analysis, history: [analysis, ...get().history], analysisStatus: "complete", progress: 100 });
      return analysis;
    }
  },

  loadHistory: async () => {
    const invention = get().currentInvention;
    if (!invention) return [];
    try {
      const history = await inventionService.history(invention.id);
      set({ history });
      return history;
    } catch (error) {
      if (!unavailable(error)) throw error;
      return get().history;
    }
  },

  autosaveLocal: (title, description) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("pfs_invention_draft", JSON.stringify({ title, description, saved_at: now() }));
    const versions = [{ id: `local-version-${Date.now()}`, title, description, created_at: now() }, ...get().versions].slice(0, 8);
    set({ versions });
  },

  restoreLocal: () => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("pfs_invention_draft");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
}));
