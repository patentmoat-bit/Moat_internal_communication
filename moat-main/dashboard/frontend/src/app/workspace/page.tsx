"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Plus, Pencil, Trash2, Loader2, FolderOpen,
  NotebookText, ChevronRight, Search, X, AlertTriangle, Check,
} from "lucide-react";
import { useWorkspaceStore, type Workspace } from "@/stores/workspaceStore";
import { useAuthStore } from "@/stores/authStore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/* ─────────────────────────────── helpers ─────────────────────────────── */

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-32 text-center"
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#c9a84c]/10 border border-[#c9a84c]/20">
        <Briefcase className="h-9 w-9 text-[#c9a84c]" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No workspaces yet</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-7">
        Workspaces let you organise patent research into focused projects. Create one to get started.
      </p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b8921e] hover:bg-[#c9a84c] text-white text-sm font-semibold transition-colors"
      >
        <Plus className="h-4 w-4" /> Create Workspace
      </button>
    </motion.div>
  );
}

/* ─────────────────────────── workspace card ─────────────────────────── */

function WorkspaceCard({
  workspace,
  isActive,
  onSelect,
  onEdit,
  onDelete,
}: {
  workspace: Workspace;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer rounded-2xl border p-5 transition-all duration-200",
        isActive
          ? "border-[#c9a84c]/40 bg-[#c9a84c]/10 shadow-lg shadow-[#c9a84c]/10"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
      )}
    >
      {/* active indicator */}
      {isActive && (
        <motion.div
          layoutId="workspace-active"
          className="absolute inset-0 rounded-2xl ring-1 ring-[#c9a84c]/30"
        />
      )}

      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold",
            isActive ? "bg-[#c9a84c]/30 text-[#e8c97a]" : "bg-white/5 text-slate-400"
          )}>
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm leading-tight">{workspace.name}</h3>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Created {format(new Date(workspace.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* description */}
      {workspace.description && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
          {workspace.description}
        </p>
      )}

      {/* footer */}
      <div className="flex items-center gap-3 text-[11px] text-slate-600">
        <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" /> {workspace.collections?.length ?? 0} collections</span>
        {isActive && (
          <span className="ml-auto flex items-center gap-1 text-[#c9a84c] font-medium">
            Active <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────── modal form ─────────────────────────────── */

function WorkspaceModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: Workspace;
  onClose: () => void;
  onSave: (name: string, desc: string, notes: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [desc, setDesc] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(name.trim(), desc.trim(), notes.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save workspace");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/25 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-md rounded-2xl bg-[#0d0e1a] border border-white/[0.08] shadow-2xl shadow-black/60 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            {mode === "create" ? "New Workspace" : "Edit Workspace"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Battery Technology FTO"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Description
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Short summary of the research scope…"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              <NotebookText className="inline h-3 w-3 mr-1" />Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context, goals, or instructions…"
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#b8921e] hover:bg-[#c9a84c] text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {mode === "create" ? "Create" : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────── delete confirm ─────────────────────────── */

function DeleteConfirm({
  workspace,
  onClose,
  onConfirm,
}: {
  workspace: Workspace;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-sm rounded-2xl bg-[#0d0e1a] border border-white/[0.08] shadow-2xl p-6 text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <Trash2 className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Delete Workspace?</h3>
        <p className="text-sm text-slate-500 mb-6">
          <span className="text-white font-semibold">&ldquo;{workspace.name}&rdquo;</span> and all its contents will be permanently removed. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────── page ──────────────────────────────── */

function WorkspacePageContent() {
  const { workspaces, activeWorkspace, isLoading, fetchWorkspaces, setActiveWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaceStore();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Workspace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#020308] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c9a84c]/15 border border-[#c9a84c]/20">
                <Briefcase className="h-4.5 w-4.5 text-[#c9a84c] h-5 w-5" />
              </div>
              Workspaces
            </h1>
            <p className="text-sm text-slate-500 mt-1 ml-12">
              Organise patent research into focused projects &mdash; {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} total
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#b8921e] hover:bg-[#c9a84c] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#c9a84c]/20"
          >
            <Plus className="h-4 w-4" /> New Workspace
          </button>
        </div>

        {/* Search bar */}
        {workspaces.length > 0 && (
          <div className="relative mb-6 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter workspaces…"
              className="w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#c9a84c]/40 focus:ring-1 focus:ring-[#c9a84c]/20 transition-all"
            />
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && workspaces.length === 0 && (
          <EmptyState onNew={() => setShowCreate(true)} />
        )}

        {/* Grid */}
        {!isLoading && workspaces.length > 0 && (
          <>
            {filtered.length === 0 ? (
              <p className="text-center text-slate-600 py-16 text-sm">No workspaces match &ldquo;{search}&rdquo;</p>
            ) : (
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {filtered.map((ws) => (
                    <WorkspaceCard
                      key={ws.id}
                      workspace={ws}
                      isActive={activeWorkspace?.id === ws.id}
                      onSelect={() => setActiveWorkspace(ws)}
                      onEdit={() => setEditTarget(ws)}
                      onDelete={() => setDeleteTarget(ws)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <WorkspaceModal
            mode="create"
            onClose={() => setShowCreate(false)}
            onSave={async (name, desc, notes) => { await createWorkspace(name, desc, notes); }}
          />
        )}
        {editTarget && (
          <WorkspaceModal
            mode="edit"
            initial={editTarget}
            onClose={() => setEditTarget(null)}
            onSave={async (name, desc, notes) => { await updateWorkspace(editTarget.id, name, desc, notes); }}
          />
        )}
        {deleteTarget && (
          <DeleteConfirm
            workspace={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => deleteWorkspace(deleteTarget.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <AuthGuard>
      <WorkspacePageContent />
    </AuthGuard>
  );
}
