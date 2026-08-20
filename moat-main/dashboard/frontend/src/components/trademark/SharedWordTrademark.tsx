"use client";

import React, { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Stamp, Plus, Search, Trash2, Edit2, X, Save, ArrowLeft, Download,
  Upload, History, Filter, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, FileText, Globe, Tag, Hash, BookOpen, MoreVertical,
  Paperclip, File, Eye, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@supabase/supabase-js";
import { useAuthStore } from "@/stores/authStore";
import { UploadService } from "@/services/uploadService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseBrowser = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

const uploadFileToStorage = async (file: File): Promise<{ name: string; url: string; size: number; type: string }> => {
  const ext = file.name.split(".").pop();
  const path = `attachments/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
  try {
    const url = await UploadService.uploadFile("trademarks", path, file);
    return { name: file.name, url, size: file.size, type: file.type };
  } catch (e) {
    console.error("UploadService failed, falling back to base64", e);
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string || "");
      reader.readAsDataURL(file);
    });
    return { name: file.name, url, size: file.size, type: file.type };
  }
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

interface Trademark {
  id: string;
  type: string;
  name: string;
  application_number: string;
  status: string;
  class: string;
  goods_services: string;
  country: string;
  image_url: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  performed_by: string;
  timestamp: string;
}

const STATUSES = ["Pending", "Approved", "Rejected", "Renewal"];
const NICE_CLASSES = [
  "Class 1 – Chemicals", "Class 2 – Paints", "Class 3 – Cosmetics",
  "Class 4 – Lubricants & Fuels", "Class 5 – Pharmaceuticals",
  "Class 9 – Electronics & Software", "Class 16 – Paper Goods",
  "Class 35 – Advertising & Business", "Class 36 – Financial Services",
  "Class 38 – Telecommunications", "Class 41 – Education & Entertainment",
  "Class 42 – Software & IT", "Class 44 – Medical Services",
  "Class 45 – Legal Services",
];

const STATUS_BADGE: Record<string, string> = {
  Approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Pending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  Renewal: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const STATUS_ICONS: Record<string, any> = {
  Approved: CheckCircle2, Pending: Clock, Rejected: AlertTriangle, Renewal: RefreshCw
};

const EMPTY_FORM = {
  name: "", application_number: "", class: "", goods_services: "",
  country: "", status: "Pending", metadata: { files: [] }
};

export function SharedWordTrademark({ backLink }: { backLink: string }) {
  const { user } = useAuthStore();
  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [formTab, setFormTab] = useState<"details" | "files">("details");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryEntry[]>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddFile = async (uploadedFile: File) => {
    setUploadingFile(true);
    try {
      const fileData = await uploadFileToStorage(uploadedFile);
      const currentFiles = form.metadata?.files || [];
      const updatedFiles = [...currentFiles, { ...fileData, id: Math.random().toString(36).substring(2, 9), uploadedAt: new Date().toISOString() }];
      setForm((prev: any) => ({
        ...prev,
        metadata: {
          ...(prev.metadata || {}),
          files: updatedFiles
        }
      }));
      showToast(`Uploaded ${uploadedFile.name}`);
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setUploadingFile(false);
    }
  };

  const fetchTrademarks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "word" });
      if (search) params.set("search", search);
      if (filterStatus !== "All") params.set("status", filterStatus);
      const res = await fetch(`/api/trademarks?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTrademarks(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { fetchTrademarks(); }, [fetchTrademarks]);

  useEffect(() => {
    if (!supabaseBrowser) return;
    const channel = supabaseBrowser
      .channel("word-trademarks-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trademarks", filter: "type=eq.word" },
        (payload) => {
          fetchTrademarks();
          showToast("New trademark updates received");
        }
      )
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [fetchTrademarks]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Trademark name is required";
    if (!form.class) e.class = "Trademark class is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/trademarks/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, type: "word" })
        });
        if (!res.ok) throw new Error("Update failed");
        showToast("Trademark updated successfully");
      } else {
        const res = await fetch("/api/trademarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, type: "word" })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || errData.error || "Create failed");
        }
        showToast("Trademark created and saved to database");
      }
      resetForm();
      fetchTrademarks();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: Trademark) => {
    setEditingId(t.id);
    setForm({
      name: t.name, application_number: t.application_number,
      class: t.class, goods_services: t.goods_services,
      country: t.country, status: t.status,
      metadata: t.metadata || { files: [] }
    });
    setFormTab("details");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete trademark "${name}"? This action cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/trademarks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Trademark deleted");
      fetchTrademarks();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormTab("details");
    setErrors({});
  };

  const handleInlineUpload = async (t: Trademark, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    showToast("Uploading attachments...");
    try {
      const uploadedFiles = [];
      for (let i = 0; i < files.length; i++) {
        const fileData = await uploadFileToStorage(files[i]);
        uploadedFiles.push({
          ...fileData,
          id: Math.random().toString(36).substring(2, 9),
          uploadedAt: new Date().toISOString()
        });
      }
      
      const currentFiles = t.metadata?.files || [];
      const updatedMetadata = {
        ...(t.metadata || {}),
        files: [...currentFiles, ...uploadedFiles]
      };
      
      const res = await fetch(`/api/trademarks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...t,
          metadata: updatedMetadata
        })
      });
      
      if (!res.ok) throw new Error("Failed to save attachments");
      
      showToast("Attachments uploaded successfully");
      fetchTrademarks();
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      e.target.value = "";
    }
  };

  const handleInlineDelete = async (t: Trademark, fileId: string) => {
    if (!confirm("Are you sure you want to remove this attachment?")) return;
    
    try {
      const currentFiles = t.metadata?.files || [];
      const updatedFiles = currentFiles.filter((f: any) => f.id !== fileId);
      const updatedMetadata = {
        ...(t.metadata || {}),
        files: updatedFiles
      };
      
      const res = await fetch(`/api/trademarks/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...t,
          metadata: updatedMetadata
        })
      });
      
      if (!res.ok) throw new Error("Failed to remove attachment");
      
      showToast("Attachment removed");
      fetchTrademarks();
    } catch (err: any) {
      showToast(`Failed to remove: ${err.message}`, "error");
    }
  };

  const loadHistory = async (id: string) => {
    if (history[id]) return;
    try {
      const res = await fetch(`/api/trademarks/${id}`);
      if (res.ok) {
        const json = await res.json();
        setHistory(prev => ({ ...prev, [id]: json.data?.history || [] }));
      }
    } catch (e) {}
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadHistory(id);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Name", "App No", "Class", "Goods & Services", "Country", "Status", "Filed"],
      ...trademarks.map(t => [t.name, t.application_number, t.class, `"${t.goods_services}"`, t.country, t.status, new Date(t.created_at).toLocaleDateString()])
    ].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "word_trademarks.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) { showToast("CSV file is empty or invalid", "error"); return; }
      const header = lines[0].split(",");
      const rows = lines.slice(1);
      let imported = 0;
      for (const row of rows) {
        const cols = row.split(",");
        const record: any = {};
        header.forEach((h, i) => { record[h.trim().toLowerCase().replace(/ /g, "_")] = (cols[i] || "").trim().replace(/^"|"$/g, ""); });
        if (record.name) {
          await fetch("/api/trademarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "word", name: record.name, application_number: record.app_no || "", class: record.class || "", goods_services: record["goods_&_services"] || record.goods_services || "", country: record.country || "", status: record.status || "Pending" })
          });
          imported++;
        }
      }
      showToast(`Imported ${imported} trademarks`);
      fetchTrademarks();
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = trademarks;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg ${toast.type === "success" ? "bg-emerald-900/90 text-emerald-300 border border-emerald-700/50" : "bg-red-900/90 text-red-300 border border-red-700/50"}`}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2 mb-2">
            <Link href={backLink}><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Trademark Dashboard</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20">
              <FileText className="h-6 w-6 text-[#c9a84c]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Word Trademarks</h1>
              <p className="text-sm text-muted-foreground">Manage text-based brand assets, classes, and application statuses</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-border/60 text-xs" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-border/60 text-xs" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {user?.role !== "CEO" && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}
              className="gap-2 bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold text-xs rounded-xl">
              <Plus className="h-4 w-4" /> New Word Mark
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <Card className="border-[#c9a84c]/30 bg-[#c9a84c]/5">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground">
                  {editingId ? "✏️ Edit Word Trademark" : "➕ New Word Trademark"}
                </CardTitle>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </CardHeader>
              <CardContent>
                {/* Form Tabs */}
                <div className="flex border-b border-border/20 mb-4">
                  <button type="button" onClick={() => setFormTab("details")}
                    className={`pb-2.5 px-4 text-xs font-bold transition-all relative ${formTab === "details" ? "text-[#c9a84c]" : "text-muted-foreground hover:text-foreground"}`}>
                    General Details
                    {formTab === "details" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#c9a84c]" />}
                  </button>
                  <button type="button" onClick={() => setFormTab("files")}
                    className={`pb-2.5 px-4 text-xs font-bold transition-all relative ${formTab === "files" ? "text-[#c9a84c]" : "text-muted-foreground hover:text-foreground"}`}>
                    Files & Attachments ({(form.metadata?.files || []).length})
                    {formTab === "files" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#c9a84c]" />}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {formTab === "details" ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Trademark Name *</label>
                          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            className={`w-full h-10 rounded-xl bg-card border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 transition-all ${errors.name ? "border-red-500" : "border-border/60"}`}
                            placeholder="e.g. MOAT Platform" 
                            disabled={user?.role === "CEO"} />
                          {errors.name && <p className="text-red-400 text-[11px] mt-1">{errors.name}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Application Number</label>
                          <input value={form.application_number} onChange={e => setForm({ ...form, application_number: e.target.value })}
                            className="w-full h-10 rounded-xl bg-card border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50"
                            placeholder="e.g. TM-94021-A"
                            disabled={user?.role === "CEO"} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Trademark Class *</label>
                          <select value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}
                            className={`w-full h-10 rounded-xl bg-card border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50 transition-all ${errors.class ? "border-red-500" : "border-border/60"}`}
                            disabled={user?.role === "CEO"}>
                            <option value="">Select a class…</option>
                            {NICE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="Custom">Custom…</option>
                          </select>
                          {errors.class && <p className="text-red-400 text-[11px] mt-1">{errors.class}</p>}
                        </div>
                        <div>
                          <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Country / Jurisdiction</label>
                          <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                            className="w-full h-10 rounded-xl bg-card border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50"
                            placeholder="e.g. US, EU, JP"
                            disabled={user?.role === "CEO"} />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Status</label>
                          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                            className="w-full h-10 rounded-xl bg-card border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50">
                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Goods & Services Description</label>
                        <textarea value={form.goods_services} onChange={e => setForm({ ...form, goods_services: e.target.value })}
                          className="w-full h-24 rounded-xl bg-card border border-border/60 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50"
                          placeholder="Describe the goods and/or services this mark covers…"
                          disabled={user?.role === "CEO"} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        className="border-2 border-dashed border-[#c9a84c]/30 rounded-xl flex flex-col items-center justify-center p-8 bg-card cursor-pointer hover:border-[#c9a84c]/60 transition-all min-h-[160px]"
                        onClick={() => formFileInputRef.current?.click()}>
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          {uploadingFile ? (
                            <RefreshCw className="h-10 w-10 animate-spin text-[#c9a84c]" />
                          ) : (
                            <Upload className="h-10 w-10 opacity-30 text-[#c9a84c]" />
                          )}
                          <p className="text-xs font-medium mt-1">
                            {uploadingFile ? "Uploading attachment..." : "Click or drag files here to upload"}
                          </p>
                          <p className="text-[10px] opacity-60">PDF, DOCX, PNG, JPG, TXT up to 10MB</p>
                        </div>
                        <input
                          ref={formFileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files) return;
                            for (let i = 0; i < files.length; i++) {
                              await handleAddFile(files[i]);
                            }
                            e.target.value = "";
                          }}
                        />
                      </div>

                      {/* File list */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
                          Uploaded Attachments ({(form.metadata?.files || []).length})
                        </h4>
                        {(form.metadata?.files || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No files uploaded yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(form.metadata?.files || []).map((file: any, index: number) => (
                              <div key={file.id || index} className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-card/80 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-2 rounded-lg bg-[#c9a84c]/10 text-[#c9a84c] shrink-0">
                                    {file.type?.startsWith("image/") ? (
                                      <ImageIcon className="h-4 w-4" />
                                    ) : (
                                      <File className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate max-w-[150px]" title={file.name}>
                                      {file.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {formatFileSize(file.size)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" title="View/Download"
                                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                    <Eye className="h-3.5 w-3.5" />
                                  </a>
                                  <button type="button" onClick={() => {
                                    const updated = (form.metadata?.files || []).filter((_: any, idx: number) => idx !== index);
                                    setForm((prev: any) => ({
                                      ...prev,
                                      metadata: { ...(prev.metadata || {}), files: updated }
                                    }));
                                  }} title="Remove"
                                    className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl border-border/60">Cancel</Button>
                    <Button type="submit" disabled={saving}
                      className="gap-2 bg-[#c9a84c] hover:bg-[#b8943d] text-black font-bold rounded-xl">
                      {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? "Saving…" : editingId ? "Update Trademark" : "Save Trademark"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl bg-card border border-border/60 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/50"
            placeholder="Search by name…"
          />
        </div>
        <div className="flex gap-2">
          {["All", ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 h-10 rounded-xl text-xs font-bold border transition-all ${filterStatus === s ? "bg-[#c9a84c]/20 border-[#c9a84c]/40 text-[#c9a84c]" : "bg-card border-border/60 text-muted-foreground hover:border-[#c9a84c]/30"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{trademarks.length}</span> trademarks
        <span className="text-emerald-400 font-semibold">{trademarks.filter(t => t.status === "Approved").length} Approved</span>
        <span className="text-blue-400 font-semibold">{trademarks.filter(t => t.status === "Pending").length} Pending</span>
        <span className="text-amber-400 font-semibold">{trademarks.filter(t => t.status === "Renewal").length} Renewal</span>
      </div>

      {/* Table */}
      <Card className="border-border/60 bg-card/60 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-sm">Loading trademarks…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Stamp className="h-12 w-12 opacity-20 mx-auto mb-3" />
            <p className="font-semibold">No word trademarks found.</p>
            <p className="text-xs mt-1">Create your first word mark by clicking "New Word Mark" above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-muted/5">
                  {["Trademark Name", "App Number", "Class", "Goods & Services", "Country", "Status", "Filed", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filtered.map(t => {
                  const StatusIcon = STATUS_ICONS[t.status] || Clock;
                  const isExpanded = expandedId === t.id;
                  return (
                    <Fragment key={t.id}>
                      <tr className="hover:bg-muted/5 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-foreground group-hover:text-[#c9a84c] transition-colors">{t.name}</p>
                            {t.metadata?.files?.length > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground" title={`${t.metadata.files.length} attachment(s)`}>
                                <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60" />
                                <span className="text-[10px] font-bold">{t.metadata.files.length}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{t.application_number || "—"}</td>
                        <td className="px-5 py-4 text-xs text-muted-foreground max-w-[140px]">
                          <span className="line-clamp-1">{t.class || "—"}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground max-w-[200px]">
                          <span className="line-clamp-1">{t.goods_services || "—"}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground">{t.country || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_BADGE[t.status] || STATUS_BADGE.Pending}`}>
                            <StatusIcon className="h-3 w-3 shrink-0" />{t.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => toggleExpand(t.id)} title="View history"
                              className="p-1.5 rounded-lg hover:bg-[#c9a84c]/10 text-muted-foreground hover:text-[#c9a84c] transition-colors">
                              <History className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleEdit(t)} title="Edit"
                              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {user?.role === "Admin" && (
                              <button onClick={() => handleDelete(t.id, t.name)} title="Delete"
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            key={`${t.id}-expanded`}>
                            <td colSpan={8} className="bg-muted/5 px-6 py-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <History className="h-4 w-4 text-[#c9a84c]" />
                                  <h4 className="text-xs font-bold text-foreground/80 uppercase tracking-wider">Audit History</h4>
                                </div>
                                {history[t.id]?.length > 0 ? (
                                  <div className="space-y-2">
                                    {history[t.id].map((h, i) => (
                                      <div key={i} className="flex items-start gap-3 text-xs">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] mt-1.5 shrink-0" />
                                        <div className="flex-1">
                                          <span className="text-foreground/80">{h.action}</span>
                                          <span className="text-muted-foreground ml-2">by {h.performed_by}</span>
                                        </div>
                                        <span className="text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex gap-3 text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] mt-1.5 shrink-0" />
                                    <span className="text-muted-foreground">Created on {new Date(t.created_at).toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="pt-2">
                                  <p className="text-xs font-semibold text-foreground/70 mb-1">Goods & Services:</p>
                                  <p className="text-xs text-muted-foreground">{t.goods_services || "No description provided."}</p>
                                </div>
                                <div className="pt-3 border-t border-border/10">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                                      <Paperclip className="h-3.5 w-3.5 text-[#c9a84c]" />
                                      Attached Documents & Files ({(t.metadata?.files || []).length})
                                    </p>
                                  </div>
                                  {(t.metadata?.files || []).length === 0 ? (
                                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                      <p className="text-xs text-muted-foreground italic">No attached files.</p>
                                      <label htmlFor={`upload-inline-${t.id}`}
                                        className="border border-dashed border-[#c9a84c]/30 rounded-lg flex items-center justify-center gap-2 px-3 py-1.5 bg-card/10 cursor-pointer hover:border-[#c9a84c]/60 hover:bg-card/25 transition-all text-center">
                                        <Upload className="h-3.5 w-3.5 text-[#c9a84c]" />
                                        <span className="text-[10px] font-bold text-foreground/85">Upload Doc / Img / PDF</span>
                                        <input
                                          id={`upload-inline-${t.id}`}
                                          type="file"
                                          multiple
                                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                                          className="hidden"
                                          onChange={(e) => handleInlineUpload(t, e)}
                                        />
                                      </label>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {(t.metadata.files || []).map((file: any, index: number) => {
                                        const isImage = file.type?.startsWith("image/") || file.url.match(/\.(jpeg|jpg|gif|png|webp)/i);
                                        const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
                                        return (
                                          <div key={file.id || index} className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-card/20 hover:bg-card/50 transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                              {isImage ? (
                                                <div className="w-8 h-8 rounded overflow-hidden shrink-0 border border-border/40 bg-muted/10">
                                                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                </div>
                                              ) : (
                                                <div className="p-1.5 rounded bg-[#c9a84c]/10 text-[#c9a84c] shrink-0">
                                                  {isPdf ? (
                                                    <FileText className="h-4 w-4 text-red-400" />
                                                  ) : (
                                                    <File className="h-4 w-4 text-[#c9a84c]" />
                                                  )}
                                                </div>
                                              )}
                                              <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-foreground truncate max-w-[120px]" title={file.name}>
                                                  {file.name}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                  {formatFileSize(file.size)}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                              <a href={file.url} target="_blank" rel="noopener noreferrer" title="Download / View"
                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                                <Eye className="h-3.5 w-3.5" />
                                              </a>
                                              {user?.role !== "CEO" && (
                                                <button type="button" onClick={() => handleInlineDelete(t, file.id)} title="Remove attachment"
                                                  className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {/* Inline upload block */}
                                      <label htmlFor={`upload-inline-${t.id}`}
                                        className="border border-dashed border-[#c9a84c]/30 rounded-lg flex items-center justify-center gap-2 p-2 bg-card/10 cursor-pointer hover:border-[#c9a84c]/60 hover:bg-card/25 transition-all text-center min-h-[44px]">
                                        <Upload className="h-3.5 w-3.5 text-[#c9a84c]" />
                                        <span className="text-[10px] font-bold text-foreground/80">Add Doc / Img / PDF</span>
                                        <input
                                          id={`upload-inline-${t.id}`}
                                          type="file"
                                          multiple
                                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                                          className="hidden"
                                          onChange={(e) => handleInlineUpload(t, e)}
                                        />
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
