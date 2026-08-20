"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Sparkles, Loader2, ChevronRight, CheckCircle2, Clock, 
  ShieldAlert, RefreshCw, Plus, Edit2, Save, X, FileText, Upload, 
  Download, Image as ImageIcon, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "./FileUpload";
import { LoadingState } from "./LoadingState";

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  drafting:    { label: "Draft",         color: "#9ca3af", icon: Clock },
  in_progress: { label: "In Progress",   color: "#3b82f6", icon: Clock },
  review:      { label: "Under Review",  color: "#f59e0b", icon: Clock },
  approved:    { label: "Approved",      color: "#10b981", icon: CheckCircle2 },
  filed:       { label: "Filed",         color: "#06b6d4", icon: Sparkles },
  registered:  { label: "Registered",    color: "#8b5cf6", icon: CheckCircle2 },
  completed:   { label: "Completed",     color: "#8b5cf6", icon: CheckCircle2 },
  rejected:    { label: "Rejected",      color: "#ef4444", icon: ShieldAlert },
  expired:     { label: "Expired",       color: "#ef4444", icon: ShieldAlert },
};

const TRACKER_STAGES = [
  "drafting", "in_progress", "review", "approved", "filed", "registered", "completed"
];

export function SharedCopyrightDashboard({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  const [copyrights, setCopyrights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal state
  const [selectedCopyright, setSelectedCopyright] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("details"); // details, documents, tracker, history
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  
  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Create state
  const [createForm, setCreateForm] = useState({ product_name: "", description: "", copyright_type: "Software" });

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/copyrights?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        setCopyrights(json.data || []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleCreate = async () => {
    if (!createForm.product_name) return;
    try {
      const res = await fetch("/api/copyrights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, status: "drafting" })
      });
      if (res.ok) {
        setIsCreating(false);
        setCreateForm({ product_name: "", description: "", copyright_type: "Software" });
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedCopyright) return;
    try {
      const res = await fetch(`/api/copyrights/${selectedCopyright.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedCopyright(updated.data);
        setIsEditing(false);
        fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocuments = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/copyrights/${id}/documents`);
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!selectedCopyright) return;
    
    try {
      // Calculate next version (simplistic: highest version + 1)
      const nextVer = documents.length > 0 ? Math.max(...documents.map(d => d.version || 1)) + 1 : 1;

      // Create FormData to send the file to our robust server-side API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("version", nextVer.toString());

      const res = await fetch(`/api/copyrights/${selectedCopyright.id}/documents/upload`, {
        method: "POST",
        body: formData
      });
      
      if (res.ok) {
        await fetchDocuments(selectedCopyright.id);
      } else {
        const errJson = await res.json();
        throw new Error(errJson.error || "Upload failed");
      }
    } catch (e: any) {
      console.error("Upload failed", e);
      throw e;
    }
  };

  const summary = useMemo(() => {
    const c = { total: copyrights.length, inProgress: 0, review: 0, approved: 0, filed: 0, registered: 0, completed: 0 };
    copyrights.forEach(p => {
      const s = p.status?.toLowerCase();
      if (s === "in_progress") c.inProgress++;
      else if (s === "review" || s === "under_review") c.review++;
      else if (s === "approved") c.approved++;
      else if (s === "filed") c.filed++;
      else if (s === "registered") c.registered++;
      else if (s === "completed") c.completed++;
    });
    return c;
  }, [copyrights]);

  if (loading) return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <LoadingState message="Loading Copyrights..." />
    </div>
  );

  return (
    <div className="relative pb-16">
      <div className="space-y-5 pt-2">
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          className="relative rounded-3xl overflow-hidden border border-border/60 bg-gradient-to-br from-[#c9a84c]/10 via-card/90 to-emerald-500/5 p-6 sm:p-8 backdrop-blur-md">
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-muted-foreground/60 hover:text-foreground">
                <Link href={backHref}><ArrowLeft className="h-4 w-4 mr-1.5" />{backLabel}</Link>
              </Button>
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 rounded-2xl flex items-center justify-center border border-[#c9a84c]/30 bg-[#c9a84c]/10">
                  <Sparkles className="h-7 w-7 text-[#c9a84c]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight"
                    style={{ background: "linear-gradient(135deg, #e8dfc8, #c9a84c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                    Copyright Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground/60 mt-0.5">
                    Manage and monitor copyright-protected products, creative assets, and review workflows.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Total", val: summary.total, color: "#c9a84c" },
                { label: "Registered", val: summary.registered, color: "#8b5cf6" },
                { label: "Approved", val: summary.approved, color: "#10b981" },
                { label: "In Review", val: summary.review, color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="px-4 py-2 rounded-xl border text-center min-w-[70px]"
                  style={{ borderColor: `${s.color}30`, background: `${s.color}0d` }}>
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Table ─────────────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}
          className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <div>
              <p className="text-sm font-bold text-foreground">Copyright Products</p>
              <p className="text-[10px] text-muted-foreground/60">All records sync live</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchAll} disabled={refreshing} className="text-[#c9a84c] text-xs font-bold flex items-center gap-1 hover:text-[#e8c97a]">
                <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
              <Button onClick={() => setIsCreating(true)} size="sm" className="bg-[#c9a84c] text-black hover:bg-[#e8c97a] font-bold">
                <Plus className="h-4 w-4 mr-1" /> New Copyright
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20">
                  {["Asset Name","Type","Status","Registration Date","Updated",""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {copyrights.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-xs text-muted-foreground/60">No copyrights found. Click "New Copyright" to begin. (Ensure SQL migration is run)</td></tr>
                  ) : copyrights.map((p, i) => {
                    const s = STATUS_CFG[p.status?.toLowerCase()] ?? STATUS_CFG.drafting;
                    return (
                      <motion.tr key={p.id}
                        initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: 0.1 + i*0.03 }}
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => {
                          setSelectedCopyright(p);
                          setEditForm(p);
                          setIsEditing(false);
                          setActiveTab("details");
                          fetchDocuments(p.id);
                        }}>
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <p className="font-semibold text-foreground group-hover:text-[#c9a84c] transition-colors leading-tight truncate">{p.product_name}</p>
                          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{p.description}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground/80">
                          {p.copyright_type || "General"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                            style={{ color: s.color, borderColor: `${s.color}30`, background: `${s.color}10` }}>
                            <s.icon className="h-3 w-3" />{s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[11px] text-muted-foreground/60">
                          {p.registration_date ? new Date(p.registration_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-[11px] text-muted-foreground/60">
                          {new Date(p.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5">
                          <button className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[11px] font-bold text-[#c9a84c] hover:text-[#e8c97a] transition-all">
                            View <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* ── Create Modal ──────────────────────────────────────────────────────── */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setIsCreating(false)}>
          <div className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border/60 flex justify-between items-center">
              <h2 className="text-lg font-bold">New Copyright Asset</h2>
              <button onClick={() => setIsCreating(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Product / Asset Name</label>
                <input type="text" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={createForm.product_name} onChange={e => setCreateForm({...createForm, product_name: e.target.value})} placeholder="e.g. MOAT AI Engine" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Copyright Type</label>
                <select className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                  value={createForm.copyright_type} onChange={e => setCreateForm({...createForm, copyright_type: e.target.value})}>
                  <option>Software</option><option>Source Code</option><option>UI/UX Design</option>
                  <option>Documentation</option><option>Graphics</option><option>Literary Work</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Description</label>
                <textarea className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm h-24"
                  value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} placeholder="Asset description..." />
              </div>
            </div>
            <div className="p-5 bg-muted/20 border-t border-border/60 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!createForm.product_name} className="bg-[#c9a84c] text-black hover:bg-[#e8c97a]">Create Asset</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {selectedCopyright && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setSelectedCopyright(null)}>
          <div className="bg-card border border-border/60 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border/60 flex justify-between items-center bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#c9a84c]/10 border border-[#c9a84c]/30">
                  <Sparkles className="h-5 w-5 text-[#c9a84c]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">{selectedCopyright.product_name}</h2>
                  <p className="text-xs text-muted-foreground">Copyright ID: {selectedCopyright.id.split("-")[0]} • Created {new Date(selectedCopyright.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {STATUS_CFG[selectedCopyright.status?.toLowerCase()] && (
                  <Badge variant="outline" style={{ color: STATUS_CFG[selectedCopyright.status.toLowerCase()].color, borderColor: STATUS_CFG[selectedCopyright.status.toLowerCase()].color }}>
                    {STATUS_CFG[selectedCopyright.status.toLowerCase()].label}
                  </Badge>
                )}
                <button onClick={() => setSelectedCopyright(null)} className="p-2 hover:bg-muted rounded-full text-muted-foreground"><X className="h-5 w-5"/></button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border/60 px-6 bg-muted/5">
              {[
                { id: "details", label: "Product Details" },
                { id: "documents", label: "Documents & Evidence" },
                { id: "tracker", label: "Workflow Tracker" },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab.id ? "border-[#c9a84c] text-[#c9a84c]" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              
              {/* DETAILS TAB */}
              {activeTab === "details" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Asset Information</h3>
                    {!isEditing ? (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit2 className="h-3.5 w-3.5 mr-1.5"/> Edit Details</Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditForm(selectedCopyright); }}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveEdit} className="bg-[#c9a84c] text-black hover:bg-[#e8c97a]"><Save className="h-3.5 w-3.5 mr-1.5"/> Save Changes</Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Product / Asset Name</label>
                        {isEditing ? <input className="w-full mt-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm" value={editForm.product_name || ""} onChange={e => setEditForm({...editForm, product_name: e.target.value})} /> : <p className="text-sm font-medium mt-1">{selectedCopyright.product_name}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Description</label>
                        {isEditing ? <textarea className="w-full mt-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm h-20" value={editForm.description || ""} onChange={e => setEditForm({...editForm, description: e.target.value})} /> : <p className="text-sm font-medium mt-1">{selectedCopyright.description || "—"}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Copyright Type</label>
                        {isEditing ? <input className="w-full mt-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm" value={editForm.copyright_type || ""} onChange={e => setEditForm({...editForm, copyright_type: e.target.value})} /> : <p className="text-sm font-medium mt-1">{selectedCopyright.copyright_type || "—"}</p>}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Owner / Creator</label>
                        {isEditing ? <input className="w-full mt-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm" value={editForm.owner || ""} onChange={e => setEditForm({...editForm, owner: e.target.value})} /> : <p className="text-sm font-medium mt-1">{selectedCopyright.owner || "—"}</p>}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Status</label>
                        {isEditing ? (
                          <select className="w-full mt-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm" value={editForm.status || "drafting"} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        ) : (
                          <p className="text-sm font-medium mt-1">{STATUS_CFG[selectedCopyright.status?.toLowerCase()]?.label || selectedCopyright.status}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Filing Date</label>
                          {isEditing ? <input type="date" className="w-full mt-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm" value={editForm.filing_date || ""} onChange={e => setEditForm({...editForm, filing_date: e.target.value})} /> : <p className="text-sm font-medium mt-1">{selectedCopyright.filing_date ? new Date(selectedCopyright.filing_date).toLocaleDateString() : "—"}</p>}
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Registration Date</label>
                          {isEditing ? <input type="date" className="w-full mt-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm" value={editForm.registration_date || ""} onChange={e => setEditForm({...editForm, registration_date: e.target.value})} /> : <p className="text-sm font-medium mt-1">{selectedCopyright.registration_date ? new Date(selectedCopyright.registration_date).toLocaleDateString() : "—"}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCUMENTS TAB */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Supporting Evidence & Files</h3>
                  </div>
                  
                  <div className="mb-6">
                    <FileUpload onUpload={handleFileUpload} />
                  </div>
                  
                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr className="border-b border-border/60">
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">File Name</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Version</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Date</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <AnimatePresence>
                          {documents.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-12 text-center text-xs text-muted-foreground">No documents uploaded yet.</td>
                            </tr>
                          ) : documents.map((doc, i) => (
                            <motion.tr key={doc.id}
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                              className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  {doc.file_type?.includes('image') ? <ImageIcon className="h-4 w-4 text-[#c9a84c]" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
                                  <div>
                                    <p className="font-semibold text-foreground max-w-[200px] truncate">{doc.file_name}</p>
                                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{(doc.file_size / 1024).toFixed(1)} KB</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <Badge variant="outline" className="text-[10px]">v{doc.version}</Badge>
                              </td>
                              <td className="px-4 py-3.5 text-[11px] text-muted-foreground">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {doc.download_url ? (
                                  <Button variant="ghost" size="sm" asChild className="h-8 text-[#3b82f6] hover:text-[#2563eb] hover:bg-[#3b82f6]/10">
                                    <a href={doc.download_url} target="_blank" rel="noreferrer" download><Download className="h-3.5 w-3.5 mr-1" /> Download</a>
                                  </Button>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/50">Processing...</span>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TRACKER TAB */}
              {activeTab === "tracker" && (
                <div className="space-y-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Workflow Progress</h3>
                  
                  <div className="relative">
                    {/* Connecting line */}
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-border/60 -z-10"></div>
                    
                    <div className="flex justify-between">
                      {TRACKER_STAGES.map((stage, idx) => {
                        const currentStageIdx = TRACKER_STAGES.indexOf(selectedCopyright.status?.toLowerCase() || "drafting");
                        const isCompleted = idx < currentStageIdx;
                        const isCurrent = idx === currentStageIdx;
                        const stg = STATUS_CFG[stage];
                        
                        return (
                          <div key={stage} className="flex flex-col items-center gap-2 relative">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                              isCompleted ? "bg-[#10b981] border-[#10b981] text-white" :
                              isCurrent ? "bg-background border-[#3b82f6] text-[#3b82f6] ring-4 ring-[#3b82f6]/20" :
                              "bg-background border-border text-muted-foreground"
                            }`}>
                              {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <stg.icon className="h-4 w-4" />}
                            </div>
                            <div className="text-center">
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>{stg.label}</p>
                              {isCompleted && <p className="text-[9px] text-muted-foreground/60 mt-0.5">Done</p>}
                              {isCurrent && <p className="text-[9px] text-[#3b82f6] mt-0.5">Active</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
