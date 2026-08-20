"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare, History as HistoryIcon, User, Plus, Check, Link as LinkIcon, Paperclip,
  CheckCircle2, XCircle, AlertCircle, Clock, Save, FileText, Download, X
} from "lucide-react";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface CEOFeedback {
  id: string;
  title: string;
  status: string;
  target_id: string;
  target_type: string;
  created_at: string;
  versions: CEOFeedbackVersion[];
}

interface CEOFeedbackVersion {
  id: string;
  content: string;
  version_number: number;
  created_at: string;
  created_by: string;
}

const statusColors: Record<string, string> = {
  Open: "bg-blue-500/20 text-blue-400",
  Pending: "bg-amber-500/20 text-amber-400",
  Approved: "bg-emerald-500/20 text-emerald-400",
  Rejected: "bg-red-500/20 text-red-400",
  "Need Changes": "bg-orange-500/20 text-orange-400",
};

export default function CEOFeedbackWorkspace() {
  const [feedbacks, setFeedbacks] = useState<CEOFeedback[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<CEOFeedback | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Open");

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  const fetchFeedbacks = useCallback(async () => {
    try {
      const res = await fetch("/api/ceo-feedback");
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  useEffect(() => {
    if (selectedFeedback && editor) {
      const latestVersion = selectedFeedback.versions?.sort((a, b) => b.version_number - a.version_number)[0];
      editor.commands.setContent(latestVersion?.content || "");
      setTitle(selectedFeedback.title);
      setStatus(selectedFeedback.status);
    }
  }, [selectedFeedback, editor]);

  const handleSave = async () => {
    if (!title || !editor) return;
    
    const content = editor.getHTML();

    if (isCreating) {
      const res = await fetch("/api/ceo-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status, content }),
      });
      if (res.ok) {
        setIsCreating(false);
        fetchFeedbacks();
      }
    } else if (selectedFeedback) {
      const res = await fetch(`/api/ceo-feedback/${selectedFeedback.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status, content }),
      });
      if (res.ok) fetchFeedbacks();
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-16 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight pfs-heading flex items-center gap-2">
            <MessageSquare className="h-6 w-6 pfs-cyan" /> CEO Review Workspace
          </h1>
          <p className="mt-1 text-sm pfs-muted">
            Advanced rich-text workspace for reviews, notes, and collaborative feedback.
          </p>
        </div>
        <button onClick={() => { setIsCreating(true); setSelectedFeedback(null); setTitle(""); setStatus("Open"); editor?.commands.setContent(""); }} className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--pfs-cyan))] px-4 text-sm font-bold text-[hsl(var(--pfs-cyan-foreground))] hover:bg-[hsl(var(--pfs-cyan))]/85">
          <Plus className="h-4 w-4" /> New Review
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 scrollbar-thin">
            {feedbacks.map(fb => (
              <button
                key={fb.id}
                onClick={() => { setIsCreating(false); setSelectedFeedback(fb); }}
                className={`w-full text-left rounded-xl p-4 transition-all border ${selectedFeedback?.id === fb.id ? 'border-[hsl(var(--pfs-cyan))] bg-[hsl(var(--pfs-cyan))]/10 shadow-md' : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--pfs-cyan))]/30'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[fb.status] || statusColors.Open}`}>
                    {fb.status}
                  </span>
                </div>
                <h3 className="text-sm font-bold pfs-heading line-clamp-1">{fb.title}</h3>
                <p className="text-xs pfs-muted mt-1">{new Date(fb.created_at).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="lg:col-span-2">
          {(selectedFeedback || isCreating) ? (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden flex flex-col h-full min-h-[600px]">
              <div className="p-4 border-b border-[hsl(var(--border))] space-y-4">
                <div className="flex gap-4">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Review Title"
                    className="flex-1 h-10 rounded-lg pfs-field px-3 font-bold pfs-heading"
                  />
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-40 h-10 rounded-lg pfs-field px-3 text-sm font-bold"
                  >
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Need Changes">Need Changes</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 border border-[hsl(var(--border))] rounded-lg p-1 bg-[hsl(var(--muted))]/10">
                  <button onClick={() => editor?.chain().focus().toggleBold().run()} className="p-2 rounded hover:bg-[hsl(var(--muted))]/50"><strong className="font-bold">B</strong></button>
                  <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="p-2 rounded hover:bg-[hsl(var(--muted))]/50"><em className="italic font-serif">I</em></button>
                  <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="p-2 rounded hover:bg-[hsl(var(--muted))]/50"><span className="font-bold">H2</span></button>
                  <div className="w-px h-6 bg-[hsl(var(--border))] mx-1" />
                  <button className="p-2 rounded hover:bg-[hsl(var(--muted))]/50"><LinkIcon className="w-4 h-4" /></button>
                  <button className="p-2 rounded hover:bg-[hsl(var(--muted))]/50"><Paperclip className="w-4 h-4" /></button>
                  <button className="p-2 rounded hover:bg-[hsl(var(--muted))]/50"><User className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} />
              </div>
              <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] flex justify-between items-center">
                <span className="text-xs pfs-muted">Auto-saving enabled.</span>
                <button onClick={handleSave} className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--pfs-cyan))] px-6 text-sm font-bold text-[hsl(var(--pfs-cyan-foreground))] hover:bg-[hsl(var(--pfs-cyan))]/85">
                  <Save className="h-4 w-4" /> Save Review
                </button>
              </div>
            </div>
          ) : (
             <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/10 p-12">
              <MessageSquare className="h-16 w-16 pfs-muted opacity-20 mb-4" />
              <h2 className="text-xl font-bold pfs-heading">Select a Review</h2>
              <p className="mt-2 text-sm pfs-muted max-w-md">Choose an item to continue reviewing or create a new feedback note.</p>
            </div>
          )}
        </div>

        {/* Version History Sidebar */}
        <div className="lg:col-span-1">
          {selectedFeedback && (
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
              <h3 className="text-sm font-bold pfs-heading flex items-center gap-2 mb-4">
                <HistoryIcon className="h-4 w-4 pfs-cyan" /> Version History
              </h3>
              <div className="space-y-4">
                {selectedFeedback.versions?.sort((a, b) => b.version_number - a.version_number).map(v => (
                  <div key={v.id} className="relative pl-6 pb-4 border-l border-[hsl(var(--border))] last:border-0 last:pb-0">
                    <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-[hsl(var(--pfs-cyan))]" />
                    <p className="text-xs font-bold pfs-heading">v{v.version_number}</p>
                    <p className="text-[10px] pfs-muted mt-0.5">{new Date(v.created_at).toLocaleString()}</p>
                    <p className="text-[10px] pfs-muted mt-1">By: {v.created_by}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
