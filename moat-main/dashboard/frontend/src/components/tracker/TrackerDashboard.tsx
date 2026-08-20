"use client";

// ─────────────────────────────────────────────────────────────────────────────
// MOAT — Workflow Tracker Dashboard
// Real-time project lifecycle tracking with workflow stepper visualization.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Clock3,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  FileText,
  ArrowRight,
  Loader2,
  ChevronDown,
  Layers,
  Edit3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { WorkflowStepper } from "./WorkflowStepper";
import {
  WORKFLOW_STATUSES,
  STATUS_META,
  getCompletedStatuses,
  type WorkflowStatus,
} from "@/lib/events/workflowStateMachine";
import { createBrowserClient } from "@supabase/ssr";
import { useAuthStore } from "@/stores/authStore";

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  designer_id?: string;
  patent_number?: string;
  due_date?: string;
  metadata?: Record<string, any>;
}

interface WorkflowHistoryEntry {
  id: string;
  resource_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  created_at: string;
  metadata?: any;
}

export function TrackerDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, WorkflowHistoryEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { user } = useAuthStore();

  // ── Fetch Projects ──────────────────────────────────────────────────────────

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/ceo/projects");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (projectId: string) => {
    try {
      const res = await fetch(`/api/workflow/history?projectId=${projectId}`);
      if (!res.ok) return;
      const { data } = await res.json();
      setHistoryMap((prev) => ({ ...prev, [projectId]: data || [] }));
    } catch {
      // Non-critical
    }
  };

  const handleStatusUpdate = async (projectId: string, newStatus: WorkflowStatus) => {
    if (updating === projectId) return;
    
    // Optimistic UI update
    setProjects((prev) => 
      prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p)
    );
    setUpdating(projectId);

    try {
      const res = await fetch("/api/workflow/manual-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          status: newStatus,
          actorId: user?.email || "Admin",
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      // Fetch history again to show the update
      await fetchHistory(projectId);
    } catch (err) {
      console.error(err);
      // Revert on error
      fetchProjects();
    } finally {
      setUpdating(null);
    }
  };

  // ── Lifecycle & Realtime ────────────────────────────────────────────────────

  useEffect(() => {
    fetchProjects();
    const connectTimer = setTimeout(() => setIsConnected(true), 1500);

    // Supabase Realtime
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel("tracker_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventions" }, () => {
        fetchProjects();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workflow_history" }, (payload) => {
        const entry = payload.new as WorkflowHistoryEntry;
        setHistoryMap((prev) => ({
          ...prev,
          [entry.resource_id]: [...(prev[entry.resource_id] || []), entry],
        }));
      })
      .subscribe();

    return () => {
      clearTimeout(connectTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch history when a project is expanded
  useEffect(() => {
    if (expandedProject && !historyMap[expandedProject]) {
      fetchHistory(expandedProject);
    }
  }, [expandedProject]);

  // ── Filters ─────────────────────────────────────────────────────────────────

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  // ── Stats ───────────────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of WORKFLOW_STATUSES) counts[s] = 0;
    projects.forEach((p) => {
      if (counts[p.status] !== undefined) counts[p.status]++;
    });
    return counts;
  }, [projects]);

  const topStatuses = useMemo(() => {
    return WORKFLOW_STATUSES.filter((s) => statusCounts[s] > 0)
      .map((s) => ({ status: s, count: statusCounts[s], meta: STATUS_META[s] }))
      .slice(0, 6);
  }, [statusCounts]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "transition-colors",
                isConnected
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-700"
              )}
            >
              <span
                className={cn(
                  "mr-1.5 h-2 w-2 rounded-full inline-block",
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )}
              />
              {isConnected ? "Live Connection" : "Connecting..."}
            </Badge>
            <Badge variant="outline" className="border-[#c9a84c]/25 bg-[#c9a84c]/10 text-[#8a6a1e]">
              Workflow Engine
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Workflow Tracker</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Real-time project lifecycle tracking. Every status transition is automatically tracked, notified, and
            audited.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-[#c9a84c]/50 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c9a84c]/50"
          >
            <option value="all">All Statuses</option>
            {WORKFLOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label} ({statusCounts[s] || 0})
              </option>
            ))}
          </select>
          <button
            onClick={() => { setLoading(true); fetchProjects(); }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </header>

      {/* Pipeline Overview Cards */}
      {topStatuses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {topStatuses.map(({ status, count, meta }) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
              className={cn(
                "rounded-xl border bg-card p-4 transition-all hover:shadow-md text-left",
                meta.borderClass,
                statusFilter === status && "ring-2 ring-[#c9a84c]/50"
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {meta.label}
              </p>
              <p className={cn("text-2xl font-bold mt-1", meta.textClass)}>{count}</p>
            </button>
          ))}
        </div>
      )}

      {/* Projects List */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#c9a84c]" /> Project Workflows
              </CardTitle>
              <CardDescription>
                {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""} shown
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No projects match your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              <AnimatePresence initial={false}>
                {filteredProjects.map((project) => {
                  const currentStatus = (WORKFLOW_STATUSES.includes(project.status as WorkflowStatus)
                    ? project.status
                    : "New") as WorkflowStatus;
                  const history = historyMap[project.id] || [];
                  const completedStatuses = getCompletedStatuses(currentStatus, history);
                  const rejectedStatuses = history
                    .filter((h) => h.new_status === "Revision")
                    .map(() => "Revision" as WorkflowStatus);
                  const isExpanded = expandedProject === project.id;

                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="transition-colors hover:bg-muted/10"
                    >
                      {/* Project Row */}
                      <button
                        onClick={() => {
                          setExpandedProject(isExpanded ? null : project.id);
                        }}
                        className="w-full text-left p-4 md:p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold truncate">{project.title}</h3>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] shrink-0",
                                  STATUS_META[currentStatus]?.borderClass,
                                  STATUS_META[currentStatus]?.textClass
                                )}
                              >
                                {STATUS_META[currentStatus]?.label || project.status}
                              </Badge>
                            </div>
                            {project.patent_number && (
                              <p className="text-xs text-muted-foreground mb-2">
                                Patent: {project.patent_number}
                              </p>
                            )}
                            <WorkflowStepper
                              currentStatus={currentStatus}
                              completedStatuses={completedStatuses}
                              rejectedStatuses={rejectedStatuses}
                              compact
                              onStatusClick={(s) => handleStatusUpdate(project.id, s)}
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-muted-foreground">
                              {updating === project.id ? "Updating..." : new Date(project.updated_at).toLocaleDateString()}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-5 pb-5 border-t border-border/30"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                            {/* Full Stepper */}
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold uppercase text-muted-foreground">
                                  Workflow Progress
                                </h4>
                                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">
                                  <Edit3 className="w-3 h-3 mr-1" /> Click any step to update manually
                                </Badge>
                              </div>
                              <WorkflowStepper
                                currentStatus={currentStatus}
                                completedStatuses={completedStatuses}
                                rejectedStatuses={rejectedStatuses}
                                direction="vertical"
                                onStatusClick={(s) => handleStatusUpdate(project.id, s)}
                              />
                            </div>

                            {/* History Timeline */}
                            <div>
                              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">
                                Activity History
                              </h4>
                              {history.length === 0 ? (
                                <div className="text-xs text-muted-foreground/50 py-4">
                                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                  Loading history...
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                  {history.map((entry) => (
                                    <div
                                      key={entry.id}
                                      className="flex items-start gap-3 text-xs"
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] mt-1.5 shrink-0" />
                                      <div>
                                        <p className="font-medium text-foreground">
                                          {entry.old_status ? (
                                            <>
                                              {entry.old_status}{" "}
                                              <ArrowRight className="h-3 w-3 inline mx-0.5" />{" "}
                                              {entry.new_status}
                                            </>
                                          ) : (
                                            entry.new_status
                                          )}
                                        </p>
                                        <p className="text-muted-foreground mt-0.5">
                                          {new Date(entry.created_at).toLocaleString()}
                                          {entry.changed_by && entry.changed_by !== "System" && (
                                            <> · by {entry.changed_by}</>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
