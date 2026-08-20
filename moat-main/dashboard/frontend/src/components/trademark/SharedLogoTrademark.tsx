"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ImageIcon, Plus, Search, Trash2, Edit2, X, Save, ArrowLeft,
  Download, Upload, History, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  Paperclip, File, Eye, FileText
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const STATUSES = ["Pending", "Approved", "Rejected", "Renewal"];
const NICE_CLASSES = [
  "Class 9 – Electronics & Software", "Class 16 – Paper Goods",
  "Class 35 – Advertising & Business", "Class 38 – Telecommunications",
  "Class 41 – Education & Entertainment", "Class 42 – Software & IT",
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
const EMPTY_FORM = { name: "", application_number: "", class: "", country: "", status: "Pending", image_url: "", metadata: { files: [] } };

interface Trademark {
  id: string; type: string; name: string; application_number: string;
  status: string; class: string; country: string; image_url: string;
  goods_services: string; created_at: string; updated_at: string; metadata: any;
}

export function SharedLogoTrademark({ backLink }: { backLink: string }) {
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
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, any[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);

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
      const params = new URLSearchParams({ type: "logo" });
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
      .channel("logo-trademarks-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trademarks", filter: "type=eq.logo" },
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
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadLogo = async (): Promise<string> => {
    if (!file) return form.image_url;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logos/${Date.now()}.${ext}`;
    try {
      const url = await UploadService.uploadFile("trademarks", path, file);
      setUploading(false);
      return url;
    } catch (e) {
      setUploading(false);
      console.error("UploadService failed, falling back to base64", e);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string || "");
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const imageUrl = await uploadLogo();
      const payload = { ...form, type: "logo", image_url: imageUrl };
      const url = editingId ? `/api/trademarks/${editingId}` : "/api/trademarks";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Save failed");
      showToast(editingId ? "Logo trademark updated" : "Logo trademark saved to database");
      resetForm();
      fetchTrademarks();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleEdit = (t: Trademark) => {
    setEditingId(t.id);
    setForm({ name: t.name, application_number: t.application_number, class: t.class, country: t.country, status: t.status, image_url: t.image_url, metadata: t.metadata || { files: [] } });
    setPreviewUrl(t.image_url || "");
    setFile(null);
    setFormTab("details");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete logo trademark "${name}"?`)) return;
    const res = await fetch(`/api/trademarks/${id}`, { method: "DELETE" });
    if (res.ok) { showToast("Trademark deleted"); fetchTrademarks(); }
    else showToast("Delete failed", "error");
  };

  const resetForm = () => {
    setShowForm(false); setEditingId(null);
    setForm(EMPTY_FORM); setErrors({});
    setFile(null); setPreviewUrl("");
    setFormTab("details");
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
    const res = await fetch(`/api/trademarks/${id}`);
    if (res.ok) {
      const json = await res.json();
      setHistory(prev => ({ ...prev, [id]: json.data?.history || [] }));
    }
  };

  const handleExport = () => {
    const csv = [
      ["Name", "App No", "Class", "Country", "Status", "Filed"],
      ...trademarks.map(t => [t.name, t.application_number, t.class, t.country, t.status, new Date(t.created_at).toLocaleDateString()])
    ].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "logo_trademarks.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl font-semibold text-sm shadow-lg border ${toast.type === "success" ? "bg-emerald-900/90 text-emerald-300 border-emerald-700/50" : "bg-red-900/90 text-red-300 border-red-700/50"}`}>
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
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <ImageIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Logo Trademarks</h1>
              <p className="text-sm text-muted-foreground">Manage image-based brand assets, logo uploads, and approvals</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input ref={importRef} type="file" accept=".csv" className="hidden" />
          <Button variant="outline" size="sm" className="gap-2 rounded-xl border-border/60 text-xs" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl">
            <Plus className="h-4 w-4" /> New Logo Mark
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground">
                  {editingId ? "✏️ Edit Logo Trademark" : "➕ New Logo Trademark"}
                </CardTitle>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </CardHeader>
              <CardContent>
                {/* Form Tabs */}
                <div className="flex border-b border-border/20 mb-4">
                  <button type="button" onClick={() => setFormTab("details")}
                    className={`pb-2.5 px-4 text-xs font-bold transition-all relative ${formTab === "details" ? "text-purple-400" : "text-muted-foreground hover:text-foreground"}`}>
                    General Details
                    {formTab === "details" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500" />}
                  </button>
                  <button type="button" onClick={() => setFormTab("files")}
                    className={`pb-2.5 px-4 text-xs font-bold transition-all relative ${formTab === "files" ? "text-purple-400" : "text-muted-foreground hover:text-foreground"}`}>
                    Files & Attachments ({(form.metadata?.files || []).length})
                    {formTab === "files" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500" />}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {formTab === "details" ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Logo Upload Zone */}
                      <div className="md:col-span-1">
                        <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Logo Image</label>
                        <div
                          className="border-2 border-dashed border-purple-500/30 rounded-xl flex flex-col items-center justify-center p-6 bg-card cursor-pointer hover:border-purple-500/60 transition-all min-h-[180px]"
                          onClick={() => fileInputRef.current?.click()}>
                          {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="max-h-36 object-contain mb-3 rounded-lg" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <ImageIcon className="h-12 w-12 opacity-20" />
                              <p className="text-xs font-medium">Click to upload logo</p>
                              <p className="text-[10px] opacity-60">PNG, JPG, SVG up to 5MB</p>
                            </div>
                          )}
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </div>
                        {previewUrl && (
                          <button type="button" onClick={() => { setFile(null); setPreviewUrl(""); setForm((f: any) => ({ ...f, image_url: "" })); }}
                            className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                            <X className="h-3 w-3" /> Remove image
                          </button>
                        )}
                      </div>

                      {/* Metadata Fields */}
                      <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Trademark Name *</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                              className={`w-full h-10 rounded-xl bg-card border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${errors.name ? "border-red-500" : "border-border/60"}`}
                              placeholder="e.g. MOAT Logo v3" />
                            {errors.name && <p className="text-red-400 text-[11px] mt-1">{errors.name}</p>}
                          </div>
                          <div>
                            <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Application Number</label>
                            <input value={form.application_number} onChange={e => setForm({ ...form, application_number: e.target.value })}
                              className="w-full h-10 rounded-xl bg-card border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                              placeholder="e.g. TM-LG-001" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Trademark Class</label>
                            <select value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}
                              className="w-full h-10 rounded-xl bg-card border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                              <option value="">Select a class…</option>
                              {NICE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Country / Jurisdiction</label>
                            <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                              className="w-full h-10 rounded-xl bg-card border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                              placeholder="e.g. US, EU, Global" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-foreground/70 mb-1.5 block uppercase tracking-wider">Status</label>
                            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                              className="w-full h-10 rounded-xl bg-card border border-border/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                              {STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        className="border-2 border-dashed border-purple-500/30 rounded-xl flex flex-col items-center justify-center p-8 bg-card cursor-pointer hover:border-purple-500/60 transition-all min-h-[160px]"
                        onClick={() => formFileInputRef.current?.click()}>
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          {uploadingFile ? (
                            <RefreshCw className="h-10 w-10 animate-spin text-purple-400" />
                          ) : (
                            <Upload className="h-10 w-10 opacity-30 text-purple-400" />
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
                                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
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
                    <Button type="submit" disabled={saving || uploading}
                      className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl">
                      {(saving || uploading) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {uploading ? "Uploading…" : saving ? "Saving…" : editingId ? "Update Logo Mark" : "Save Logo Mark"}
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
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 rounded-xl bg-card border border-border/60 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="Search logo trademarks…" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["All", ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 h-10 rounded-xl text-xs font-bold border transition-all ${filterStatus === s ? "bg-purple-500/20 border-purple-500/40 text-purple-400" : "bg-card border-border/60 text-muted-foreground hover:border-purple-500/30"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-muted-foreground gap-3">
          <RefreshCw className="h-5 w-5 animate-spin" /><span>Loading logo trademarks…</span>
        </div>
      ) : trademarks.length === 0 ? (
        <div className="border-2 border-dashed border-border/40 rounded-2xl p-16 text-center text-muted-foreground">
          <ImageIcon className="h-14 w-14 opacity-15 mx-auto mb-3" />
          <p className="font-semibold">No logo trademarks found.</p>
          <p className="text-xs mt-1">Upload your first logo mark using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {trademarks.map(t => {
            const StatusIcon = STATUS_ICONS[t.status] || Clock;
            const isExpanded = expandedId === t.id;
            return (
              <motion.div key={t.id} layout
                className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col group relative hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/5 transition-all">
                {/* Action buttons */}
                <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setExpandedId(isExpanded ? null : t.id); if (!isExpanded) loadHistory(t.id); }}
                    className="p-1.5 bg-card/90 backdrop-blur-sm rounded-lg shadow border border-border/40 hover:text-purple-400 transition-colors">
                    <History className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleEdit(t)}
                    className="p-1.5 bg-card/90 backdrop-blur-sm rounded-lg shadow border border-border/40 hover:text-blue-400 transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {user?.role === "Admin" && (
                    <button onClick={() => handleDelete(t.id, t.name)}
                      className="p-1.5 bg-card/90 backdrop-blur-sm rounded-lg shadow border border-border/40 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Logo preview */}
                <div className="h-32 bg-muted/20 flex items-center justify-center border-b border-border/40 p-4">
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-muted-foreground opacity-20" />
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-foreground truncate" title={t.name}>{t.name}</h3>
                    {t.metadata?.files?.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground shrink-0" title={`${t.metadata.files.length} attachment(s)`}>
                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="text-[10px] font-bold">{t.metadata.files.length}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{t.application_number || "No app number"}</p>
                  {t.class && <p className="text-[10px] text-muted-foreground truncate">{t.class}</p>}
                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_BADGE[t.status] || STATUS_BADGE.Pending}`}>
                      <StatusIcon className="h-2.5 w-2.5" />{t.status}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{t.country || "Global"}</span>
                  </div>
                </div>

                {/* Expanded history */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/40 bg-muted/10 overflow-hidden">
                      <div className="p-3 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-1">
                            <History className="h-3 w-3 text-purple-400" /> History
                          </p>
                          {(history[t.id] || []).length > 0 ? (
                            history[t.id].slice(0, 3).map((h, i) => (
                              <p key={i} className="text-[10px] text-muted-foreground">{h.action}</p>
                            ))
                          ) : (
                            <p className="text-[10px] text-muted-foreground">
                              Created {new Date(t.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {/* Attached files */}
                        <div className="pt-2 border-t border-border/10">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-1">
                              <Paperclip className="h-3.5 w-3.5 text-purple-400" /> Attachments ({(t.metadata?.files || []).length})
                            </p>
                          </div>
                          {(t.metadata?.files || []).length === 0 ? (
                            <div className="flex flex-col gap-2">
                              <p className="text-[10px] text-muted-foreground italic">No attached files.</p>
                              <label htmlFor={`upload-inline-${t.id}`}
                                className="border border-dashed border-purple-500/30 rounded-lg flex items-center justify-center gap-1.5 p-1.5 bg-card/10 cursor-pointer hover:border-purple-500/60 hover:bg-card/25 transition-all text-center">
                                <Upload className="h-3 w-3 text-purple-400" />
                                <span className="text-[9px] font-bold text-foreground/80">Upload Attachment</span>
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
                            <div className="space-y-1">
                              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                {(t.metadata.files || []).map((file: any, index: number) => {
                                  const isImage = file.type?.startsWith("image/") || file.url.match(/\.(jpeg|jpg|gif|png|webp)/i);
                                  const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
                                  return (
                                    <div key={file.id || index} className="flex items-center justify-between p-1 rounded border border-border/30 bg-card/40 text-[10px]">
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        {isImage ? (
                                          <div className="w-5 h-5 rounded overflow-hidden shrink-0 border border-border/40 bg-muted/10">
                                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                          </div>
                                        ) : (
                                          <div className="p-0.5 rounded bg-purple-500/10 text-purple-400 shrink-0">
                                            {isPdf ? (
                                              <FileText className="h-3 w-3 text-red-400" />
                                            ) : (
                                              <File className="h-3 w-3 text-purple-400" />
                                            )}
                                          </div>
                                        )}
                                        <span className="truncate max-w-[100px] font-medium text-foreground" title={file.name}>
                                          {file.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" title="View/Download"
                                          className="text-purple-400 hover:text-purple-300 p-0.5">
                                          <Eye className="h-3 w-3" />
                                        </a>
                                        {user?.role !== "CEO" && (
                                          <button type="button" onClick={() => handleInlineDelete(t, file.id)} title="Remove attachment"
                                            className="text-red-400 hover:text-red-300 p-0.5">
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <label htmlFor={`upload-inline-${t.id}`}
                                className="border border-dashed border-purple-500/30 rounded-lg flex items-center justify-center gap-1.5 p-1 bg-card/10 cursor-pointer hover:border-purple-500/60 hover:bg-card/25 transition-all text-center mt-1.5">
                                <Upload className="h-3 w-3 text-purple-400" />
                                <span className="text-[9px] font-bold text-foreground/80">Add Attachment</span>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
