"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, ScrollText, Globe, Clock, CheckCircle2, 
  Search, Filter, Plus, Trash2, Loader2, AlertCircle,
  RefreshCw, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatentDocumentsModal } from "@/components/ceo/PatentDocumentsModal";

interface PatentProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  filing_region: string;
  created_at: string;
  updated_at: string;
}

export default function PatentFilingPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<PatentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Create Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newRegion, setNewRegion] = useState("US");
  const [newStatus, setNewStatus] = useState("filed");
  const [submitting, setSubmitting] = useState(false);

  // Quick Action feedback toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Selected patent for document view/upload
  const [selectedProject, setSelectedProject] = useState<PatentProject | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/patents/projects");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setProjects(json.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load patent projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Create handler
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/patents/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          status: newStatus,
          filing_region: newRegion
        })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setProjects(prev => [json.data, ...prev]);
      setModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewRegion("US");
      setNewStatus("filed");
      triggerToast("Patent project initialized and listed successfully!");
      
      // Redirect to Patent Portfolio upon successful creation
      setTimeout(() => {
        router.push("/dashboard/ceo/portfolio");
      }, 1500);
    } catch (err: any) {
      alert(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  // Status handler
  const handleStatusChange = async (id: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/patents/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: nextStatus } : p));
      triggerToast(`Status set to ${nextStatus.toUpperCase()}. Patent Analyst has been notified.`);
    } catch (err: any) {
      alert(err.message || "Failed to update project status");
    }
  };

  // Deletion handler
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this patent project?")) return;
    try {
      const res = await fetch(`/api/patents/projects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      setProjects(prev => prev.filter(p => p.id !== id));
      triggerToast("Patent project deleted.");
    } catch (err: any) {
      alert(err.message || "Failed to delete project");
    }
  };

  // Filtered lists
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description || "").toLowerCase().includes(search.toLowerCase());
      const matchRegion = regionFilter === "All" || p.filing_region === regionFilter;
      const matchStatus = statusFilter === "All" || p.status === statusFilter;
      return matchSearch && matchRegion && matchStatus;
    });
  }, [projects, search, regionFilter, statusFilter]);

  const kpis = useMemo(() => {
    const total = projects.length;
    const filed = projects.filter(p => p.status === "filed").length;
    const published = projects.filter(p => p.status === "published").length;
    const granted = projects.filter(p => p.status === "granted").length;
    const us = projects.filter(p => p.filing_region === "US").length;
    const ind = projects.filter(p => p.filing_region === "IND").length;
    const pct = projects.filter(p => p.filing_region === "PCT").length;
    return { total, filed, published, granted, us, ind, pct };
  }, [projects]);

  return (
    <div className="relative pb-16 min-h-screen">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-[0.04] blur-3xl"
          style={{ background: "radial-gradient(circle, #c9a84c, transparent)" }} />
        <div className="absolute top-1/2 -right-60 h-[600px] w-[600px] rounded-full opacity-[0.03] blur-3xl"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
      </div>

      <div className="mx-auto max-w-7xl space-y-6 pt-4 px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden border border-border/60 bg-gradient-to-br from-[#c9a84c]/10 via-card/90 to-emerald-500/5 p-6 backdrop-blur-md"
        >
          <div className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: "linear-gradient(rgba(201,168,76,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2 text-muted-foreground/60 hover:text-foreground">
                <Link href="/dashboard/ceo">
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> CEO Workspace
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-[#c9a84c]/10 border border-[#c9a84c]/30">
                  <ScrollText className="h-6 w-6 text-[#c9a84c]" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight"
                    style={{ background: "linear-gradient(135deg, #e8dfc8, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Patent Filings Workspace
                  </h1>
                  <p className="text-xs text-muted-foreground/60">Manage regional utilities, status progression (filed, published, granted), and analyst feeds.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setModalOpen(true)} className="bg-[#c9a84c] hover:bg-[#b0913b] text-[#131309] font-bold gap-1 rounded-xl">
                <Plus className="h-4 w-4" /> New Patent Project
              </Button>
              <Button variant="outline" size="icon" onClick={fetchProjects} className="rounded-xl border-border/60">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="border-border/60 bg-card/60 glass-card">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">Total Filings</p>
              <p className="text-2xl font-black mt-1 text-foreground">{kpis.total}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] text-[#c9a84c] font-semibold">US:{kpis.us}</span>
                <span className="text-[9px] text-[#c9a84c] font-semibold">IND:{kpis.ind}</span>
                <span className="text-[9px] text-[#c9a84c] font-semibold">PCT:{kpis.pct}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60 glass-card">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">Filed Patents</p>
              <p className="text-2xl font-black mt-1 text-blue-400">{kpis.filed}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">Newly submitted applications</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60 glass-card">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">Published Patents</p>
              <p className="text-2xl font-black mt-1 text-[#c9a84c]">{kpis.published}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">Open to public inspections</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60 glass-card">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">Granted Patents</p>
              <p className="text-2xl font-black mt-1 text-emerald-400">{kpis.granted}</p>
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">Successfully secured certificates</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card/40 border border-border/40 rounded-2xl p-3 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input 
              type="text" 
              placeholder="Search patent filings..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:border-[#c9a84c] transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Region Dropdown */}
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-[#c9a84c]" />
              <select 
                value={regionFilter} 
                onChange={e => setRegionFilter(e.target.value)}
                className="bg-background border border-border/60 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#c9a84c] text-foreground"
              >
                <option value="All">All Territories</option>
                <option value="US">US Options</option>
                <option value="IND">IND Options</option>
                <option value="PCT">PCT Options</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-[#c9a84c]" />
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-background border border-border/60 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#c9a84c] text-foreground"
              >
                <option value="All">All Statuses</option>
                <option value="filed">Filed</option>
                <option value="published">Published</option>
                <option value="granted">Granted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">Syncing database...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center border border-dashed border-red-500/20 bg-red-500/5 rounded-2xl">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">{error}</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={fetchProjects}>Try Again</Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-border/60 bg-card/25 rounded-2xl">
            <ScrollText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No patent filings found.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try modifying your search or create a new patent project.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20">
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/75">Project Details</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/75">Territory Option</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/75">Filing Status</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/75">Change Status (Indicate Analyst)</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground/75">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => (
                    <tr 
                      key={p.id} 
                      className="border-b border-border/40 hover:bg-muted/15 transition-colors group cursor-pointer"
                      onClick={() => setSelectedProject(p)}
                    >
                      <td className="px-6 py-4 max-w-sm">
                        <p className="font-semibold text-foreground group-hover:text-[#c9a84c] transition-colors leading-snug">{p.title}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">{p.description || "No description provided."}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#c9a84c]/10 border border-[#c9a84c]/20 text-[#c9a84c]">
                          <Globe className="h-3.5 w-3.5" /> {p.filing_region}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          p.status === "granted"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : p.status === "published"
                            ? "bg-[#c9a84c]/10 border-[#c9a84c]/20 text-[#c9a84c]"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                        }`}>
                          {p.status === "granted" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select 
                            value={p.status} 
                            onClick={e => e.stopPropagation()}
                            onChange={e => handleStatusChange(p.id, e.target.value)}
                            className={`bg-background border rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[#c9a84c] text-foreground cursor-pointer transition-colors ${
                              p.status === "granted"
                                ? "border-emerald-500/30 text-emerald-400"
                                : p.status === "published"
                                ? "border-[#c9a84c]/30 text-[#c9a84c]"
                                : "border-blue-500/30 text-blue-400"
                            }`}
                          >
                            <option value="filed">Filed</option>
                            <option value="published">Published</option>
                            <option value="granted">Granted</option>
                          </select>
                          <span className="text-[10px] text-muted-foreground/60 font-semibold italic">(Auto Notifies Analyst)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                          className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground/60 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Floating custom Toast Feedback */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#131309] border border-[#c9a84c]/40 rounded-2xl px-5 py-3.5 shadow-2xl max-w-sm"
          >
            <div className="h-7 w-7 rounded-full bg-[#c9a84c]/10 border border-[#c9a84c]/30 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-[#c9a84c]" />
            </div>
            <p className="text-xs text-[#e8dfc8] font-medium leading-normal">{toastMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Form Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border/80 bg-[#131309] p-6 shadow-2xl z-10"
            >
              <h3 className="text-lg font-black tracking-tight"
                style={{ background: "linear-gradient(135deg, #e8dfc8, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Add New Patent Filing
              </h3>
              <p className="text-xs text-muted-foreground/60 mt-1">Specify project scope and territory settings below.</p>

              <form onSubmit={handleCreate} className="space-y-4 mt-5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground/80 mb-1.5">Project Title</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Adaptive Encryption Protocol" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:border-[#c9a84c]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground/80 mb-1.5">Description</label>
                  <textarea 
                    placeholder="Write a brief overview of the patent specifications..." 
                    value={newDesc} 
                    onChange={e => setNewDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 text-sm bg-background border border-border/60 rounded-xl focus:outline-none focus:border-[#c9a84c] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground/80 mb-1.5">Filing Region</label>
                    <select 
                      value={newRegion} 
                      onChange={e => setNewRegion(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#131309] border border-border/60 rounded-xl focus:outline-none focus:border-[#c9a84c]"
                    >
                      <option value="US">US</option>
                      <option value="IND">IND</option>
                      <option value="PCT">PCT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground/80 mb-1.5">Overall Status</label>
                    <select 
                      value={newStatus} 
                      onChange={e => setNewStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#131309] border border-border/60 rounded-xl focus:outline-none focus:border-[#c9a84c]"
                    >
                      <option value="filed">Filed</option>
                      <option value="published">Published</option>
                      <option value="granted">Granted</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3.5 pt-4 border-t border-border/40">
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-[#c9a84c] hover:bg-[#b0913b] text-[#131309] font-bold rounded-xl px-5">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Project"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PatentDocumentsModal 
        isOpen={!!selectedProject} 
        onClose={() => setSelectedProject(null)} 
        project={selectedProject ? {
          id: selectedProject.id,
          title: selectedProject.title,
          description: selectedProject.description || "",
          status: selectedProject.status,
          tags: []
        } : null} 
      />
    </div>
  );
}

