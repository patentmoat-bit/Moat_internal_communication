"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, CalendarClock, CheckCircle2, Clock3, FileText, Filter, FolderOpen, MoreHorizontal, Paperclip, Plus, Search, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { useCreateMatter, useDeleteMatter, useMatters, useShareMatter, useUpdateMatter, useUpdateMatterNotes, useUpdateMatterStatus, useAddMatterDocument } from "@/hooks/useMatters";
import { useMatterStore } from "@/stores/matterStore";
import type { Matter, MatterCreateInput, MatterDocumentType, MatterMemberRole, MatterPriority, MatterStatus } from "@/types/matter";

const statuses: MatterStatus[] = ["intake", "active", "searching", "analysis", "review", "blocked", "completed", "archived"];
const priorities: MatterPriority[] = ["low", "medium", "high", "critical"];
const memberRoles: MatterMemberRole[] = ["manager", "contributor", "viewer"];
const documentTypes: MatterDocumentType[] = ["patent", "prior_art", "technical", "legal", "evidence", "other"];

const statusTone: Record<MatterStatus, string> = {
  intake: "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/70 pfs-heading",
  active: "border-[hsl(var(--pfs-green))]/25 bg-[hsl(var(--pfs-green))]/10 text-[hsl(var(--pfs-green))]",
  searching: "border-[hsl(var(--pfs-teal))]/25 bg-[hsl(var(--pfs-teal))]/10 text-[hsl(var(--pfs-teal))]",
  analysis: "border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
  review: "border-[hsl(var(--primary))]/25 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]",
  blocked: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300",
  completed: "border-[hsl(var(--pfs-green))]/25 bg-[hsl(var(--pfs-green))]/10 text-[hsl(var(--pfs-green))]",
  archived: "border-[hsl(var(--border))] bg-[hsl(var(--muted))]/70 pfs-muted",
};

const priorityTone: Record<MatterPriority, string> = {
  low: "pfs-muted",
  medium: "text-[hsl(var(--pfs-green))]",
  high: "text-[hsl(var(--primary))]",
  critical: "text-red-600 dark:text-red-300",
};

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function ShellPanel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg pfs-panel shadow-sm">
      <div className="flex min-h-14 items-center justify-between border-b border-[hsl(var(--border))]/80 px-5 py-3">
        <h2 className="text-sm font-semibold pfs-heading">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="rounded-lg pfs-panel p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.18em] pfs-muted">{label}</p>
        <Icon className="h-4 w-4 pfs-muted" />
      </div>
      <p className="mt-3 text-2xl font-semibold pfs-heading">{value}</p>
    </div>
  );
}

function MatterForm({ matter, onSubmit, onCancel }: { matter?: Matter | null; onSubmit: (data: MatterCreateInput) => void; onCancel: () => void }) {
  const [form, setForm] = useState<MatterCreateInput>({
    title: matter?.title ?? "",
    matter_number: matter?.matter_number,
    description: matter?.description ?? "",
    workspace_id: matter?.workspace_id ?? null,
    client_name: matter?.client_name ?? "",
    technology_area: matter?.technology_area ?? "",
    notes: matter?.notes ?? "",
    status: matter?.status ?? "intake",
    priority: matter?.priority ?? "medium",
    due_date: matter?.due_date ?? null,
    tags: matter?.tags ?? [],
  });
  const [tagText, setTagText] = useState((matter?.tags ?? []).join(", "));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ ...form, tags: tagText.split(",").map((tag) => tag.trim()).filter(Boolean) });
        }}
        className="w-full max-w-3xl rounded-lg pfs-panel p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--pfs-green))]">Matter Management</p>
            <h3 className="mt-2 text-xl font-semibold pfs-heading">{matter ? "Edit Matter" : "Create Matter"}</h3>
          </div>
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-2 text-sm pfs-muted hover:bg-[hsl(var(--pfs-green))]/10 hover:text-[hsl(var(--foreground))]">Close</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2 text-sm pfs-heading">Matter title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 h-11 w-full rounded-md pfs-field px-3 outline-none focus:border-[hsl(var(--pfs-green))]/60" /></label>
          <label className="text-sm pfs-heading">Matter number<input value={form.matter_number ?? ""} onChange={(e) => setForm({ ...form, matter_number: e.target.value })} placeholder="Auto generated" className="mt-2 h-11 w-full rounded-md pfs-field px-3 outline-none focus:border-[hsl(var(--pfs-green))]/60" /></label>
          <label className="text-sm pfs-heading">Client<input value={form.client_name ?? ""} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="mt-2 h-11 w-full rounded-md pfs-field px-3 outline-none focus:border-[hsl(var(--pfs-green))]/60" /></label>
          <label className="text-sm pfs-heading">Technology area<input value={form.technology_area ?? ""} onChange={(e) => setForm({ ...form, technology_area: e.target.value })} className="mt-2 h-11 w-full rounded-md pfs-field px-3 outline-none focus:border-[hsl(var(--pfs-green))]/60" /></label>
          <label className="text-sm pfs-heading">Due date<input type="date" value={form.due_date ? form.due_date.slice(0, 10) : ""} onChange={(e) => setForm({ ...form, due_date: e.target.value ? new Date(e.target.value).toISOString() : null })} className="mt-2 h-11 w-full rounded-md pfs-field px-3 outline-none focus:border-[hsl(var(--pfs-green))]/60" /></label>
          <label className="text-sm pfs-heading">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MatterStatus })} className="mt-2 h-11 w-full rounded-md pfs-field px-3 outline-none focus:border-[hsl(var(--pfs-green))]/60">{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          <label className="text-sm pfs-heading">Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as MatterPriority })} className="mt-2 h-11 w-full rounded-md pfs-field px-3 outline-none focus:border-[hsl(var(--pfs-green))]/60">{priorities.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          <label className="md:col-span-2 text-sm pfs-heading">Tags<input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="FTO, novelty, robotics" className="mt-2 h-11 w-full rounded-md pfs-field px-3 outline-none focus:border-[hsl(var(--pfs-green))]/60" /></label>
          <label className="md:col-span-2 text-sm pfs-heading">Description<textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-2 w-full rounded-md pfs-field px-3 py-3 outline-none focus:border-[hsl(var(--pfs-green))]/60" /></label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-md border border-[hsl(var(--border))] px-4 py-2 text-sm font-medium pfs-heading hover:bg-[hsl(var(--pfs-green))]/10">Cancel</button>
          <button type="submit" className="rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/85">Save Matter</button>
        </div>
      </form>
    </div>
  );
}

function MatterList({ matters, activeId, onSelect }: { matters: Matter[]; activeId?: string; onSelect: (matter: Matter) => void }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))]">
      <div className="grid grid-cols-[1.4fr_.8fr_.7fr_.7fr_.5fr] border-b border-[hsl(var(--border))]/80 bg-[hsl(var(--background))] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] pfs-muted">
        <span>Matter</span><span>Client</span><span>Status</span><span>Due</span><span>Files</span>
      </div>
      {matters.map((matter) => (
        <button key={matter.id} onClick={() => onSelect(matter)} className={`grid w-full grid-cols-[1.4fr_.8fr_.7fr_.7fr_.5fr] items-center border-b border-[hsl(var(--border))]/70 px-4 py-4 text-left transition hover:bg-[hsl(var(--pfs-green))]/10 ${activeId === matter.id ? "bg-[hsl(var(--primary))]/10" : ""}`}>
          <span><span className="block text-sm font-semibold pfs-heading">{matter.title}</span><span className="mt-1 block text-xs pfs-muted">{matter.matter_number} · {matter.technology_area || "Unclassified"}</span></span>
          <span className="text-sm pfs-heading">{matter.client_name || "Internal"}</span>
          <span><span className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusTone[matter.status]}`}>{label(matter.status)}</span></span>
          <span className="text-sm pfs-muted">{formatDate(matter.due_date)}</span>
          <span className="text-sm pfs-muted">{matter.document_count}</span>
        </button>
      ))}
    </div>
  );
}

function MatterDetail({ matter, onEdit }: { matter: Matter; onEdit: () => void }) {
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<MatterMemberRole>("viewer");
  const [statusNote, setStatusNote] = useState("");
  const [notes, setNotes] = useState(matter.notes ?? "");
  const [documentName, setDocumentName] = useState("");
  const [documentType, setDocumentType] = useState<MatterDocumentType>("technical");
  const share = useShareMatter();
  const updateStatus = useUpdateMatterStatus();
  const updateNotes = useUpdateMatterNotes();
  const addDocument = useAddMatterDocument();

  useEffect(() => setNotes(matter.notes ?? ""), [matter.id, matter.notes]);

  return (
    <div className="space-y-5">
      <ShellPanel title="Matter Summary" action={<button onClick={onEdit} className="rounded-md border border-[hsl(var(--border))] px-3 py-2 text-xs font-semibold pfs-heading hover:bg-[hsl(var(--pfs-green))]/10">Edit</button>}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] pfs-muted">{matter.matter_number}</span><span className={`rounded-full border px-2 py-1 text-xs ${statusTone[matter.status]}`}>{label(matter.status)}</span><span className={`text-xs font-semibold ${priorityTone[matter.priority]}`}>{label(matter.priority)} priority</span></div>
            <h1 className="mt-3 text-2xl font-semibold pfs-heading">{matter.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 pfs-muted">{matter.description}</p>
          </div>
          <div className="grid min-w-64 grid-cols-2 gap-3 text-sm"><div><p className="pfs-muted">Client</p><p className="pfs-heading">{matter.client_name || "Internal"}</p></div><div><p className="pfs-muted">Due</p><p className="pfs-heading">{formatDate(matter.due_date)}</p></div><div><p className="pfs-muted">Owner</p><p className="pfs-heading">{matter.owner_name || "Unassigned"}</p></div><div><p className="pfs-muted">Domain</p><p className="pfs-heading">{matter.technology_area || "-"}</p></div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{matter.tags.map((tag) => <span key={tag} className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--pfs-green))]/10 px-2 py-1 text-xs pfs-heading">{tag}</span>)}</div>
      </ShellPanel>

      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <ShellPanel title="Status Workflow">
          <div className="flex flex-wrap gap-2">{statuses.map((status) => <button key={status} onClick={() => updateStatus.mutate({ matterId: matter.id, status, note: statusNote })} className={`rounded-md border px-3 py-2 text-xs font-semibold ${matter.status === status ? "border-[hsl(var(--pfs-green))] bg-[hsl(var(--pfs-green))]/10 text-[hsl(var(--pfs-green))]" : "border-[hsl(var(--border))] pfs-muted hover:bg-[hsl(var(--pfs-green))]/10"}`}>{label(status)}</button>)}</div>
          <input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Optional status note" className="mt-4 h-10 w-full rounded-md pfs-field px-3 text-sm outline-none focus:border-[hsl(var(--pfs-green))]/60" />
        </ShellPanel>

        <ShellPanel title="Share And Assign">
          <form onSubmit={(event) => { event.preventDefault(); if (!shareEmail) return; share.mutate({ matterId: matter.id, data: { email: shareEmail, role: shareRole } }); setShareEmail(""); }} className="flex flex-col gap-3 sm:flex-row">
            <input value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} placeholder="name@company.com" className="h-10 flex-1 rounded-md pfs-field px-3 text-sm outline-none focus:border-[hsl(var(--pfs-green))]/60" />
            <select value={shareRole} onChange={(e) => setShareRole(e.target.value as MatterMemberRole)} className="h-10 rounded-md pfs-field px-3 text-sm outline-none">{memberRoles.map((role) => <option key={role} value={role}>{label(role)}</option>)}</select>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/85"><UserPlus className="h-4 w-4" />Assign</button>
          </form>
          <div className="mt-4 space-y-2">{(matter.members ?? []).map((member) => <div key={member.id} className="flex items-center justify-between rounded-md border border-[hsl(var(--border))]/80 bg-[hsl(var(--muted))]/55 px-3 py-2"><div><p className="text-sm font-medium pfs-heading">{member.user_name || member.user_email || member.user_id}</p><p className="text-xs pfs-muted">{member.user_email}</p></div><span className="rounded-md bg-[hsl(var(--pfs-green))]/10 px-2 py-1 text-xs pfs-heading">{label(member.role)}</span></div>)}</div>
        </ShellPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ShellPanel title="Matter Notes" action={<button onClick={() => updateNotes.mutate({ matterId: matter.id, notes })} className="rounded-md bg-[hsl(var(--primary))] px-3 py-2 text-xs font-semibold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/85">Save</button>}>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} className="w-full rounded-md pfs-field px-3 py-3 text-sm leading-6 outline-none focus:border-[hsl(var(--pfs-green))]/60" />
        </ShellPanel>

        <ShellPanel title="Attachments">
          <form onSubmit={(event) => { event.preventDefault(); if (!documentName) return; addDocument.mutate({ matterId: matter.id, data: { filename: documentName, document_type: documentType } }); setDocumentName(""); }} className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder="document-name.pdf" className="h-10 flex-1 rounded-md pfs-field px-3 text-sm outline-none focus:border-[hsl(var(--pfs-green))]/60" />
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value as MatterDocumentType)} className="h-10 rounded-md pfs-field px-3 text-sm outline-none">{documentTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[hsl(var(--border))] px-4 text-sm font-semibold pfs-heading hover:bg-[hsl(var(--pfs-green))]/10"><Paperclip className="h-4 w-4" />Attach</button>
          </form>
          <div className="space-y-2">{(matter.documents ?? []).map((doc) => <div key={doc.id} className="flex items-center justify-between rounded-md border border-[hsl(var(--border))]/80 bg-[hsl(var(--muted))]/55 px-3 py-2"><div><p className="text-sm font-medium pfs-heading">{doc.filename}</p><p className="text-xs pfs-muted">{label(doc.document_type)} · {doc.uploaded_by_name || "Unknown"}</p></div><FileText className="h-4 w-4 pfs-muted" /></div>)}</div>
        </ShellPanel>
      </div>

      <ShellPanel title="Activity Timeline">
        <div className="space-y-3">{(matter.activity ?? []).map((item) => <div key={item.id} className="flex gap-3"><div className="mt-1 h-2 w-2 rounded-full bg-[hsl(var(--pfs-green))]" /><div><p className="text-sm pfs-heading">{item.message}</p><p className="text-xs pfs-muted">{item.actor_name || "System"} · {formatDate(item.created_at)}</p></div></div>)}</div>
      </ShellPanel>
    </div>
  );
}

export function MatterWorkspace() {
  const { data: queriedMatters = [], isLoading } = useMatters();
  const matters = useMatterStore((state) => state.matters.length ? state.matters : queriedMatters);
  const activeMatter = useMatterStore((state) => state.activeMatter);
  const setActiveMatter = useMatterStore((state) => state.setActiveMatter);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MatterStatus | "all">("all");
  const [editing, setEditing] = useState<Matter | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const createMatter = useCreateMatter();
  const updateMatter = useUpdateMatter();
  const deleteMatter = useDeleteMatter();

  useEffect(() => {
    if (!activeMatter && matters[0]) setActiveMatter(matters[0]);
  }, [activeMatter, matters, setActiveMatter]);

  const filtered = useMemo(() => matters.filter((matter) => {
    const text = `${matter.title} ${matter.matter_number} ${matter.client_name} ${matter.technology_area}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (statusFilter === "all" || matter.status === statusFilter);
  }), [matters, query, statusFilter]);

  const activeCount = matters.filter((matter) => !["completed", "archived"].includes(matter.status)).length;
  const dueSoon = matters.filter((matter) => matter.due_date && new Date(matter.due_date).getTime() < Date.now() + 1000 * 60 * 60 * 24 * 14).length;
  const highRisk = matters.filter((matter) => ["high", "critical"].includes(matter.priority)).length;

  return (
    <div className="min-h-screen pfs-page p-6 pfs-heading">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(var(--pfs-green))]">Phase 1 · Matter Management</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight pfs-heading">Patent Research Matters</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 pfs-muted">Create, assign, share, track, and document patent research matters from intake through review.</p>
          </div>
          <div className="flex gap-3">
            {activeMatter && <button onClick={() => deleteMatter.mutate(activeMatter.id)} className="inline-flex items-center gap-2 rounded-md border border-red-400/20 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" />Delete</button>}
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary))]/85"><Plus className="h-4 w-4" />Create Matter</button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4"><Metric label="Active Matters" value={activeCount} icon={Briefcase} /><Metric label="Due Soon" value={dueSoon} icon={CalendarClock} /><Metric label="High Priority" value={highRisk} icon={ShieldCheck} /><Metric label="Documents" value={matters.reduce((sum, matter) => sum + matter.document_count, 0)} icon={FolderOpen} /></div>

        <div className="grid gap-5 xl:grid-cols-[.9fr_1.4fr]">
          <ShellPanel title="Matter Docket" action={<MoreHorizontal className="h-4 w-4 pfs-muted" />}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pfs-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search matters" className="h-10 w-full rounded-md pfs-field pl-9 pr-3 text-sm outline-none focus:border-[hsl(var(--pfs-green))]/60" /></div>
              <div className="relative"><Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pfs-muted" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MatterStatus | "all")} className="h-10 rounded-md pfs-field pl-9 pr-3 text-sm outline-none"><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div>
            </div>
            {isLoading && matters.length === 0 ? <p className="py-10 text-center text-sm pfs-muted">Loading matters...</p> : <MatterList matters={filtered} activeId={activeMatter?.id} onSelect={setActiveMatter} />}
          </ShellPanel>
          {activeMatter ? <MatterDetail matter={activeMatter} onEdit={() => setEditing(activeMatter)} /> : <ShellPanel title="Matter Detail"><p className="text-sm pfs-muted">Select or create a matter to begin.</p></ShellPanel>}
        </div>
      </div>
      {showCreate && <MatterForm onCancel={() => setShowCreate(false)} onSubmit={(data) => { createMatter.mutate(data); setShowCreate(false); }} />}
      {editing && <MatterForm matter={editing} onCancel={() => setEditing(null)} onSubmit={(data) => { updateMatter.mutate({ id: editing.id, data }); setEditing(null); }} />}
    </div>
  );
}
