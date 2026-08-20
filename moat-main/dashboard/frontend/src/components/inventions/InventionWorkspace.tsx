"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, ChevronDown, Clock3, Download, FileArchive, FileImage, FileText, GitBranch, History, Layers3, Loader2, Network, Paperclip, PenLine, RefreshCw, Sparkles, UploadCloud, Workflow } from "lucide-react";
import { useAnalyzeInvention, useSaveInventionDraft, useUploadInventionDocument } from "@/hooks/useInventions";
import { useInventionStore } from "@/stores/inventionStore";
import type { InventionAnalysis, InventionDocumentType } from "@/types/invention";

import { RichEditor } from "./RichEditor";

const uploadTypes: Array<{ type: InventionDocumentType; label: string; icon: React.ElementType; accept: string }> = [
  { type: "pdf", label: "Upload PDF", icon: FileText, accept: ".pdf,application/pdf" },
  { type: "patent", label: "Upload Patent", icon: FileArchive, accept: ".pdf,.txt,.xml" },
  { type: "diagram", label: "Upload Diagram", icon: Network, accept: "image/*,.pdf" },
  { type: "sketch", label: "Upload Sketch", icon: PenLine, accept: "image/*,.pdf" },
  { type: "image", label: "Upload Image", icon: FileImage, accept: "image/*" },
  { type: "technical_document", label: "Upload Technical Document", icon: Layers3, accept: ".pdf,.txt,.md,.doc,.docx" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function Section({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg pfs-panel">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold pfs-heading"><Icon className="h-4 w-4 pfs-cyan" />{title}</span>
        <ChevronDown className={`h-4 w-4 pfs-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-5">{children}</div>}
    </section>
  );
}

function SkeletonResults() {
  return <div className="space-y-4">{[1, 2, 3].map((item) => <div key={item} className="rounded-lg pfs-panel p-5"><div className="h-4 w-40 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="mt-4 space-y-2"><div className="h-3 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="h-3 w-4/5 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="h-3 w-3/5 animate-pulse rounded bg-[hsl(var(--muted))]" /></div></div>)}</div>;
}

function UploadTile({ type, label, icon: Icon, accept, onUpload }: { type: InventionDocumentType; label: string; icon: React.ElementType; accept: string; onUpload: (file: File, type: InventionDocumentType) => void }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files?.[0]; if (file) onUpload(file, type); }}
      className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center transition ${dragging ? "border-[hsl(var(--pfs-cyan))] bg-[hsl(var(--pfs-cyan))]/10" : "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/55 hover:border-[hsl(var(--pfs-cyan))]/40 hover:bg-[hsl(var(--pfs-cyan))]/10"}`}
    >
      <Icon className="h-6 w-6 pfs-cyan" />
      <span className="mt-3 text-sm font-semibold pfs-heading">{label}</span>
      <span className="mt-1 text-xs pfs-muted">Drag and drop or click</span>
      <input type="file" accept={accept} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file, type); event.currentTarget.value = ""; }} />
    </label>
  );
}

function ListItems({ items, render }: { items: Array<Record<string, any>>; render: (item: Record<string, any>, index: number) => React.ReactNode }) {
  if (!items?.length) return <p className="text-sm pfs-muted">No data generated yet.</p>;
  return <div className="space-y-3">{items.map((item, index) => <div key={index} className="rounded-md pfs-subpanel p-3">{render(item, index)}</div>)}</div>;
}

function Results({ analysis }: { analysis: InventionAnalysis }) {
  return (
    <div className="space-y-4">
      <Section title="Technical Summary" icon={BrainCircuit}><p className="text-sm leading-6 pfs-heading">{analysis.technical_summary}</p></Section>
      <Section title="Innovation Summary" icon={Sparkles}><p className="text-sm leading-6 pfs-heading">{analysis.innovation_summary}</p></Section>
      <Section title="Key Components" icon={Layers3}><ListItems items={analysis.key_components} render={(item) => <><p className="font-semibold pfs-heading">{item.name}</p><p className="mt-1 text-sm pfs-muted">{item.function}</p><p className="mt-2 text-xs pfs-muted">{item.evidence}</p></>} /></Section>
      <Section title="Technical Domains" icon={Network}><div className="flex flex-wrap gap-2">{analysis.technical_domains.map((domain, index) => <span key={index} className="rounded-md border border-[hsl(var(--pfs-cyan))]/25 bg-[hsl(var(--pfs-cyan))]/10 px-3 py-2 text-sm pfs-cyan">{domain.name} · {Math.round((domain.confidence ?? 0.5) * 100)}%</span>)}</div></Section>
      <Section title="Differentiators" icon={GitBranch}><ListItems items={analysis.differentiators} render={(item) => <><p className="font-semibold pfs-heading">{item.differentiator}</p><p className="mt-1 text-sm pfs-muted">{item.why_it_matters}</p></>} /></Section>
      <Section title="Workflow Diagram" icon={Workflow}><div className="grid gap-3 md:grid-cols-3">{analysis.workflows.map((step, index) => <div key={index} className="rounded-md pfs-subpanel p-4"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--pfs-cyan))] text-sm font-bold text-[hsl(var(--pfs-cyan-foreground))]">{step.step ?? index + 1}</span><p className="mt-3 text-sm font-semibold pfs-heading">{step.action}</p><p className="mt-2 text-xs pfs-muted">Output: {step.output}</p></div>)}</div></Section>
      <Section title="Technical Architecture" icon={Layers3}><pre className="overflow-auto rounded-md pfs-field p-4 text-xs leading-5 pfs-heading">{JSON.stringify(analysis.technical_architecture, null, 2)}</pre></Section>
      <Section title="Patentability Highlights" icon={Sparkles}><ListItems items={analysis.innovation_highlights} render={(item) => <><p className="font-semibold pfs-heading">{item.title}</p><p className="mt-1 text-sm pfs-muted">{item.rationale}</p></>} /></Section>
    </div>
  );
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DecisionIntelligence } from "./DecisionIntelligence";

export function InventionWorkspace() {
  const store = useInventionStore();
  const saveDraft = useSaveInventionDraft();
  const upload = useUploadInventionDocument();
  const analyze = useAnalyzeInvention();
  const restored = useMemo(() => store.restoreLocal(), []);
  const [title, setTitle] = useState(restored?.title || "Adaptive wearable sensor calibration system");
  const [description, setDescription] = useState(restored?.description || "<p>Describe the invention, technical problem, system components, operating workflow, and what is new compared with existing approaches.</p>");

  useEffect(() => {
    const timer = window.setTimeout(() => store.autosaveLocal(title, description), 900);
    return () => window.clearTimeout(timer);
  }, [title, description]);

  const save = async () => saveDraft.mutateAsync({ title, description, status: "ready" });
  const uploadFile = async (file: File, type: InventionDocumentType) => {
    if (!store.currentInvention) await save();
    await upload.mutateAsync({ file, fileType: type });
  };
  const runAnalyze = async () => {
    if (!store.currentInvention) await save();
    await analyze.mutateAsync();
  };
  const exportAnalysis = () => {
    const blob = new Blob([JSON.stringify(store.analysisResults, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${store.currentInvention?.title || "invention"}-analysis.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const busy = ["saving", "uploading", "analyzing"].includes(store.analysisStatus);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="mt-2 text-3xl font-semibold tracking-tight pfs-heading">Invention Workspace</h1><p className="mt-2 max-w-3xl text-sm leading-6 pfs-muted">Draft a patent using the rich editor, upload supporting artifacts, and generate structured patent intelligence.</p></div>
          <div className="flex flex-wrap gap-3"><button onClick={save} className="rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold pfs-heading hover:bg-[hsl(var(--muted))]">Save Draft</button><button onClick={runAnalyze} disabled={busy} className="inline-flex items-center gap-2 rounded-md pfs-cyan-button px-4 py-2 text-sm font-semibold disabled:opacity-60">{store.analysisStatus === "analyzing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Analyze</button>{store.analysisResults && <button onClick={exportAnalysis} className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm font-semibold pfs-heading hover:bg-[hsl(var(--muted))]"><Download className="h-4 w-4" />Export</button>}</div>
        </header>

        <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className="h-full rounded-full bg-[hsl(var(--pfs-cyan))] transition-all" style={{ width: `${store.progress}%` }} /></div>

        <Tabs defaultValue="drafting" className="w-full">
          <TabsList className="mb-6 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-md w-full justify-start overflow-x-auto p-1">
            <TabsTrigger value="drafting" className="data-[state=active]:bg-[hsl(var(--pfs-cyan))]/10 data-[state=active]:text-[hsl(var(--pfs-cyan))] rounded text-sm px-4 py-2">Drafting & Analysis</TabsTrigger>
            <TabsTrigger value="decision" className="data-[state=active]:bg-[hsl(var(--pfs-cyan))]/10 data-[state=active]:text-[hsl(var(--pfs-cyan))] rounded text-sm px-4 py-2">Decision Intelligence</TabsTrigger>
          </TabsList>

          <TabsContent value="drafting" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="space-y-5">
                <section className="rounded-lg pfs-panel p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-semibold pfs-heading"><PenLine className="h-4 w-4 pfs-cyan" />Patent Draft Editor</div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4 h-11 w-full rounded-md pfs-field px-3 font-semibold outline-none focus:border-[hsl(var(--pfs-cyan))]/60" placeholder="Invention Title" />
                  <RichEditor content={description} onChange={setDescription} />
                </section>
                <section className="rounded-lg pfs-panel p-5"><div className="flex items-center gap-2 text-sm font-semibold pfs-heading"><UploadCloud className="h-4 w-4 pfs-cyan" />Upload Area</div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{uploadTypes.map((item) => <UploadTile key={item.type} {...item} onUpload={uploadFile} />)}</div><div className="mt-4 space-y-2">{store.documents.map((doc) => <div key={doc.id} className="flex items-center justify-between rounded-md pfs-subpanel px-3 py-2"><span className="flex items-center gap-2 text-sm pfs-heading"><Paperclip className="h-4 w-4 pfs-muted" />{doc.file_name}</span><span className="text-xs pfs-muted">{doc.file_type}</span></div>)}</div></section>
                <section className="grid gap-4 md:grid-cols-2"><div className="rounded-lg pfs-panel p-5"><div className="flex items-center gap-2 text-sm font-semibold pfs-heading"><History className="h-4 w-4 pfs-cyan" />Analysis History</div><div className="mt-4 space-y-2">{store.history.map((item) => <div key={item.id} className="rounded-md pfs-subpanel p-3"><p className="text-sm pfs-heading">{Math.round(item.confidence_score * 100)}% confidence</p><p className="text-xs pfs-muted">{formatDate(item.created_at)}</p></div>)}</div></div><div className="rounded-lg pfs-panel p-5"><div className="flex items-center gap-2 text-sm font-semibold pfs-heading"><Clock3 className="h-4 w-4 pfs-cyan" />Version History</div><div className="mt-4 space-y-2">{store.versions.slice(0, 5).map((item) => <div key={item.id} className="rounded-md pfs-subpanel p-3"><p className="truncate text-sm pfs-heading">{item.title}</p><p className="text-xs pfs-muted">{formatDate(item.created_at)}</p></div>)}</div></div></section>
              </div>
              <div className="space-y-5"><div className="rounded-lg pfs-panel p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold pfs-heading">AI Assistant Results</p><p className="mt-1 text-xs pfs-muted">Technical summary, innovation profile, workflow, architecture, and patentability highlights</p></div><RefreshCw className={`h-4 w-4 pfs-muted ${busy ? "animate-spin" : ""}`} /></div></div>{store.analysisStatus === "analyzing" ? <SkeletonResults /> : store.analysisResults ? <Results analysis={store.analysisResults} /> : <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center"><BrainCircuit className="mx-auto h-10 w-10 pfs-muted" /><p className="mt-4 text-sm font-semibold pfs-heading">No analysis generated yet</p><p className="mt-2 text-sm pfs-muted">Add invention content and click Analyze.</p></div>}</div>
            </div>
          </TabsContent>

          <TabsContent value="decision" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            <DecisionIntelligence />
          </TabsContent>
        </Tabs>
    </div>
  );
}
