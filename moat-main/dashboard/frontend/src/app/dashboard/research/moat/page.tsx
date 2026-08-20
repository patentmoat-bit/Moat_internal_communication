"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, Calendar, Tag, Star, StarOff, X, Check,
  Search, Sparkles, Edit, Loader2, User, Clock, Activity, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  NEW:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  ASSIGNED: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  RESEARCH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ANALYSIS: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  DRAFTING: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  REVIEW:   "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "CEO REVIEW": "bg-rose-500/15 text-rose-400 border-rose-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  COMPLETED:"bg-emerald-600/15 text-emerald-500 border-emerald-600/30",
};

const EMPTY_IDEA = {
  title:       "",
  description: "",
  technical_field: "",
  business_objective: "",
  priority:    "Medium",
  due_date:    "",
  assigned_to: "",
};

export default function AnalystMoatPage() {
  const [projects, setProjects]         = useState<any[]>([]);
  const [analysts, setAnalysts]         = useState<any[]>([]);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState<any>(EMPTY_IDEA);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/ceo/projects`);
      const json = await res.json();
      setProjects(Array.isArray(json) ? json : (json.data || []));
    } catch (err) {
      console.error("fetchProjects error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnalysts = useCallback(async () => {
    // For now we can fetch from an endpoint or just mock.
    // In a real app we'd fetch users with role 'Patent Analyst'
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        // filter analysts if possible, or just show all for demo
        setAnalysts(data.data?.filter((u:any) => u.roles?.role_name?.includes('Analyst') || u.role?.includes('Analyst')) || [
          { id: '1', name: 'Alice (Analyst)', email: 'alice@moat.ai' },
          { id: 'ba7452ce-02b4-498d-9459-44ca41ed3c95', name: 'Default Analyst', email: 'analyst@moat.ai' }
        ]);
      } else {
        setAnalysts([{ id: 'ba7452ce-02b4-498d-9459-44ca41ed3c95', name: 'Default Analyst', email: 'analyst@moat.ai' }]);
      }
    } catch {
      setAnalysts([{ id: 'ba7452ce-02b4-498d-9459-44ca41ed3c95', name: 'Default Analyst', email: 'analyst@moat.ai' }]);
    }
  }, []);

  useEffect(() => { 
    fetchProjects(); 
    fetchAnalysts();
  }, [fetchProjects, fetchAnalysts]);

  const saveProject = async () => {
    if (!form.title.trim()) {
      setSaveError("Please enter a project name.");
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        technical_field: form.technical_field,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        assigned_to: form.assigned_to,
        status: "NEW", // project starts as NEW
        metadata: {
          business_objective: form.business_objective,
          priority: form.priority
        }
      };

      const res = await fetch("/api/ceo/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create project");

      setProjects(prev => [json, ...prev]);
      setShowForm(false);
      setForm(EMPTY_IDEA);
    } catch (err: any) {
      setSaveError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id: string) => {
    setProjects(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/moat/${id}`, { method: "DELETE" });
    } catch (err) {
      fetchProjects(); 
    }
  };

  const getProgress = (status: string) => {
    const s = status?.toUpperCase() || "NEW";
    const map: any = { "NEW": 5, "ASSIGNED": 10, "RESEARCH": 30, "ANALYSIS": 50, "DRAFTING": 70, "REVIEW": 85, "CEO REVIEW": 90, "APPROVED": 100, "COMPLETED": 100 };
    return map[s] || 0;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2 mb-2">
            <Link href="/dashboard/research"><ArrowLeft className="h-4 w-4 mr-1" />Back to Research Workspace</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#c9a84c]/10">
              <Sparkles className="h-6 w-6 text-[#c9a84c]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My MOAT — Patent Analyst View</h1>
              <p className="text-sm text-muted-foreground">
                Enterprise Patent Intelligence · {projects.length} Active Projects
              </p>
            </div>
          </div>
        </div>
        {!showForm && (
          <Button size="sm" className="gap-2 bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />Create MOAT Project
          </Button>
        )}
      </div>

      {/* ── New Project Form ── */}
      {showForm && (
        <Card className="border-[#c9a84c]/30 bg-card shadow-xl shadow-[#c9a84c]/5">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-[#c9a84c]" />
                Create MOAT Project
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project Name *</label>
                <input
                  value={form.title}
                  onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Smart Battery Cooling"
                  className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief summary of the invention..."
                  className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Technology / Invention</label>
                <input
                  value={form.technical_field}
                  onChange={e => setForm((f: any) => ({ ...f, technical_field: e.target.value }))}
                  placeholder="e.g. Lithium-Ion Thermal Management"
                  className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Objective</label>
                <input
                  value={form.business_objective}
                  onChange={e => setForm((f: any) => ({ ...f, business_objective: e.target.value }))}
                  placeholder="e.g. Core defensive patent for Q4 launch"
                  className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Patent Analyst</label>
                <select
                  value={form.assigned_to}
                  onChange={e => setForm((f: any) => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50"
                >
                  <option value="">Select an Analyst...</option>
                  {analysts.map(a => (
                    <option key={a.id} value={a.id}>{a.name || a.email}</option>
                  ))}
                </select>
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
                ⚠ {saveError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold gap-2 min-w-[140px]"
                onClick={saveProject}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Project Cards ── */}
      {!showForm && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border/40 rounded-2xl bg-muted/5">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No active projects found.</p>
              <Button size="sm" className="mt-4 bg-[#c9a84c] text-black hover:bg-[#b8943d]" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />Create MOAT Project
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.map(proj => {
                const prog = getProgress(proj.status);
                const statStr = (proj.status || 'NEW').toUpperCase();
                return (
                  <Card key={proj.id} className="border-border/60 bg-card/90 hover:border-[#c9a84c]/50 transition-all shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg hover:text-[#c9a84c] transition-colors line-clamp-1">{proj.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground font-mono">ID: {proj.id.split('-')[0]}</span>
                            <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_COLORS[statStr] || STATUS_COLORS['NEW']}`}>
                              {statStr}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-400" onClick={() => deleteProject(proj.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Meta Grid */}
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wider">Assigned Analyst</p>
                          <div className="flex items-center gap-1.5 text-foreground">
                            <User className="h-3.5 w-3.5 text-[#c9a84c]" />
                            <span className="truncate">{analysts.find(a => a.id === proj.assigned_to)?.name || proj.assigned_to || 'Unassigned'}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground text-xs uppercase tracking-wider">Due Date</p>
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Clock className="h-3.5 w-3.5 text-[#c9a84c]" />
                            <span>{proj.due_date ? new Date(proj.due_date).toLocaleDateString() : 'No date set'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Project Progress</span>
                          <span className="font-medium text-[#c9a84c]">{prog}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                          <div className="h-full bg-[#c9a84c] rounded-full transition-all duration-500" style={{ width: `${prog}%` }} />
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-2 border-t border-border/40 flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Activity className="h-3.5 w-3.5" />
                          <span>Last updated: {new Date(proj.updated_at).toLocaleDateString()}</span>
                        </div>
                        <Button variant="outline" size="sm" asChild className="text-xs h-7 px-3 border-[#c9a84c]/30 hover:bg-[#c9a84c]/10 hover:text-[#c9a84c]">
                          <Link href={`/dashboard/research/moat/${proj.id}`}>View Details &rarr;</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
