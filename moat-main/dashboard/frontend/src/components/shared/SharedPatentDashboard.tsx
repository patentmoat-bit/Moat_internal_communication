"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BarChart3, CheckCircle2, Clock, AlertCircle, Globe, Loader2,
  ChevronRight, Search, RefreshCw, Bell, Mail, ShieldAlert, Activity,
  TrendingUp, FileText, Zap, CheckCheck, X, Wifi, WifiOff,
} from "lucide-react";
import { LoadingState } from "./LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { PatentKPIGrid } from "@/components/ceo/PatentKPIGrid";
import { PatentCharts } from "@/components/ceo/PatentCharts";
import { PatentDocumentsModal } from "@/components/ceo/PatentDocumentsModal";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DBInvention {
  id: string; user_id: string; title: string; description: string;
  status: string; tags: string[]; metadata: Record<string, any>;
  created_at: string; updated_at: string; assigned_to?: string;
  patent_number?: string; due_date?: string; technical_field?: string;
}
interface ActivityLog {
  id: string; entity_type: string; entity_id?: string; action: string;
  message: string; metadata: Record<string, any>; created_at: string;
}
interface AlertItem {
  id: string; name: string; alert_type: string; description?: string;
  is_active: boolean; created_at: string;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  drafting:   { label: "Drafting",   color: "#f59e0b", icon: Clock },
  pending:    { label: "Pending",    color: "#3b82f6", icon: Clock },
  filed:      { label: "Filed",      color: "#06b6d4", icon: Globe },
  rejected:   { label: "Rejected",  color: "#ef4444", icon: AlertCircle },
  approved:   { label: "Approved",  color: "#10b981", icon: CheckCircle2 },
  completed:  { label: "Completed", color: "#8b5cf6", icon: CheckCircle2 },
  pfs_search: { label: "PFS Search",color: "#8b5cf6", icon: Search },
};

const ACTION_CFG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  CREATE:          { color: "#10b981", icon: FileText, label: "Created" },
  UPDATE:          { color: "#3b82f6", icon: Activity, label: "Updated" },
  APPROVE:         { color: "#10b981", icon: CheckCircle2, label: "Approved" },
  REJECT:          { color: "#ef4444", icon: X, label: "Rejected" },
  EMAIL_SENT:      { color: "#c9a84c", icon: Mail, label: "Email Sent" },
  STATUS_CHANGED:  { color: "#8b5cf6", icon: Zap, label: "Status Changed" },
  CEO_APPROVED:    { color: "#10b981", icon: CheckCircle2, label: "CEO Approved" },
  CEO_REJECTED:    { color: "#ef4444", icon: X, label: "CEO Rejected" },
  NOTIFICATION:    { color: "#06b6d4", icon: Bell, label: "Notification" },
  read:            { color: "#6b7280", icon: CheckCheck, label: "Read" },
};

function timeAgo(ts: string) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Live Feed Item ─────────────────────────────────────────────────────────────
function FeedItem({ log }: { log: ActivityLog }) {
  const cfg = ACTION_CFG[log.action] ?? ACTION_CFG.NOTIFICATION;
  const Icon = cfg.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 px-4 py-3 border-b border-border/30 hover:bg-muted/20 transition-colors"
    >
      <div className="mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
        <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-[9px] text-muted-foreground/50 shrink-0">{timeAgo(log.created_at)}</span>
        </div>
        <p className="text-xs text-foreground/80 leading-snug mt-0.5 truncate">{log.message}</p>
        {log.entity_type && (
          <span className="text-[9px] text-muted-foreground/50 capitalize">{log.entity_type}</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
interface Props { backHref: string; backLabel: string; }

export function SharedPatentDashboard({ backHref, backLabel }: Props) {
  const [projects, setProjects] = useState<DBInvention[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [live, setLive] = useState(true);
  const [selectedProject, setSelectedProject] = useState<DBInvention | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [newEvent, setNewEvent] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [pr, no, al] = await Promise.all([
        fetch(`/api/ceo/projects?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/ceo/notifications?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
        fetch(`/api/ceo/alerts?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
      ]);
      if (Array.isArray(pr)) setProjects(pr);
      if (Array.isArray(no)) setLogs(no);
      if (Array.isArray(al)) setAlerts(al);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + realtime subscription
  useEffect(() => {
    fetchAll();
    const supabase = createClient();
    const channel = supabase.channel("patent-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventions" }, () => {
        setNewEvent(true); fetchAll(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => {
        setNewEvent(true); fetchAll(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        fetchAll(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  // Auto-refresh polling every 15s
  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(() => fetchAll(true), 15000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [live, fetchAll]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const c = { total: projects.length, drafting:0, pending:0, filed:0, rejected:0, approved:0, completed:0 };
    projects.forEach(p => { const s = p.status?.toLowerCase(); if (s && s in c) (c as any)[s]++; });
    return c;
  }, [projects]);

  const statusData = useMemo(() => [
    { name:"Drafting",  value: summary.drafting,  color:"#f59e0b" },
    { name:"Pending",   value: summary.pending,   color:"#3b82f6" },
    { name:"Filed",     value: summary.filed,     color:"#06b6d4" },
    { name:"Rejected",  value: summary.rejected,  color:"#ef4444" },
    { name:"Approved",  value: summary.approved,  color:"#10b981" },
    { name:"Completed", value: summary.completed, color:"#8b5cf6" },
  ].filter(d => d.value > 0), [summary]);

  const trendData = useMemo(() => {
    const m: Record<string,{year:string;filed:number;approved:number}> = {};
    projects.forEach(p => {
      const y = new Date(p.created_at).getFullYear().toString();
      if (!m[y]) m[y] = {year:y,filed:0,approved:0};
      m[y].filed++;
      if (["approved","completed"].includes(p.status?.toLowerCase())) m[y].approved++;
    });
    return Object.values(m).sort((a,b) => +a.year - +b.year);
  }, [projects]);

  const monthlyData = useMemo(() => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const yr = new Date().getFullYear();
    const data = months.map(m => ({ month: m, count: 0 }));
    projects.forEach(p => {
      const d = new Date(p.created_at);
      if (d.getFullYear() === yr) data[d.getMonth()].count++;
    });
    return data;
  }, [projects]);

  const radarData = useMemo(() => {
    const t: Record<string,number> = {};
    projects.forEach(p => (p.tags||[]).forEach(tag => { t[tag] = (t[tag]||0)+1; }));
    return Object.entries(t).map(([subject, A]) => ({ subject, A, fullMark: projects.length })).slice(0,8);
  }, [projects]);

  const growthData = useMemo(() => {
    let n = 0;
    return [...projects]
      .sort((a,b) => +new Date(a.created_at) - +new Date(b.created_at))
      .map(p => ({ date: new Date(p.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}), growth: ++n }));
  }, [projects]);

  const activeAlerts = useMemo(() => alerts.filter(a => a.is_active), [alerts]);
  const unreadLogs = useMemo(() => logs.filter(l => l.action !== "read").length, [logs]);

  if (loading) return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <LoadingState message="Loading Live Data..." />
    </div>
  );

  return (
    <div className="relative pb-16">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full opacity-[0.04] blur-3xl"
          style={{ background: "radial-gradient(circle, #c9a84c, transparent)" }} />
        <div className="absolute top-1/2 -right-60 h-[600px] w-[600px] rounded-full opacity-[0.03] blur-3xl"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
      </div>

      <div className="space-y-5 pt-2">

        {/* ── Hero Header ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
          className="relative rounded-3xl overflow-hidden border border-border/60 bg-gradient-to-br from-[#c9a84c]/10 via-card/90 to-emerald-500/5 p-6 sm:p-8 backdrop-blur-md">
          <div className="absolute inset-0 opacity-[0.015]"
            style={{ backgroundImage: "linear-gradient(rgba(201,168,76,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-muted-foreground/60 hover:text-foreground">
                <Link href={backHref}><ArrowLeft className="h-4 w-4 mr-1.5" />{backLabel}</Link>
              </Button>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))", border: "1px solid rgba(201,168,76,0.3)" }}>
                    <BarChart3 className="h-7 w-7 text-[#c9a84c]" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${live ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight"
                    style={{ background: "linear-gradient(135deg, #e8dfc8, #c9a84c)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                    Patent Portfolio
                  </h1>
                  <p className="text-sm text-muted-foreground/60 mt-0.5">
                    Live intelligence · Updated {timeAgo(lastUpdated.toISOString())}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-3">
              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLive(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${live ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-muted border-border text-muted-foreground"}`}>
                  {live ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                  {live ? "Live" : "Paused"}
                </button>
                <button
                  onClick={() => { setNewEvent(false); fetchAll(); }}
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-semibold hover:bg-muted transition-all relative">
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                  {newEvent && <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
                </button>
              </div>
              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Total", val: summary.total,    color: "#c9a84c" },
                  { label: "Approved", val: summary.approved, color: "#10b981" },
                  { label: "At Risk", val: summary.rejected + summary.pending, color: "#ef4444" },
                  { label: "Alerts", val: activeAlerts.length, color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} className="px-4 py-2 rounded-xl border text-center min-w-[70px]"
                    style={{ borderColor: `${s.color}30`, background: `${s.color}0d` }}>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── KPI Grid ──────────────────────────────────────────────────────────── */}
        <PatentKPIGrid summary={summary} />

        {/* ── Main Grid ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Charts */}
          <div className="xl:col-span-2">
            <PatentCharts statusData={statusData} trendData={trendData} monthlyData={monthlyData} radarData={radarData} growthData={growthData} />
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Executive Alerts */}
            <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#c9a84c]" />
                  <span className="text-sm font-bold">Executive Alerts</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20">
                  {activeAlerts.length} Active
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                <AnimatePresence>
                  {activeAlerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 text-center py-6">No active alerts</p>
                  ) : activeAlerts.map((a, i) => (
                    <motion.div key={a.id}
                      initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
                      className="flex items-start gap-3 p-3 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/05">
                      <AlertCircle className="h-3.5 w-3.5 text-[#f59e0b] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground/90 truncate">{a.name}</p>
                        {a.description && <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">{a.description}</p>}
                        <p className="text-[9px] text-muted-foreground/50 mt-1">{timeAgo(a.created_at)}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Activity className="h-4 w-4 text-[#c9a84c]" />
                    {live && <span className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  </div>
                  <span className="text-sm font-bold">Live Activity Feed</span>
                </div>
                {unreadLogs > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {unreadLogs} new
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-8">No activity yet</p>
                ) : logs.slice(0, 20).map(log => <FeedItem key={log.id} log={log} />)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Projects Table ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
          className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <div>
              <p className="text-sm font-bold text-foreground">Active Patent Projects</p>
              <p className="text-[10px] text-muted-foreground/60">All records sync live · {projects.length} total</p>
            </div>
            <div className="flex items-center gap-2">
              {live && <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  {["Title","Tech Field","Status","Due Date","Updated",""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {projects.map((p, i) => {
                    const s = STATUS_CFG[p.status?.toLowerCase()] ?? STATUS_CFG.drafting;
                    const isOverdue = p.due_date && new Date(p.due_date) < new Date();
                    return (
                      <motion.tr key={p.id}
                        initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay: 0.1 + i*0.03 }}
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => setSelectedProject(p)}>
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <p className="font-semibold text-foreground group-hover:text-[#c9a84c] transition-colors leading-tight truncate">{p.title}</p>
                          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{p.description}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground/80">
                          {p.technical_field || (p.metadata as any)?.technology_area || "General"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                            style={{ color: s.color, borderColor: `${s.color}30`, background: `${s.color}10` }}>
                            <s.icon className="h-3 w-3" />{s.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[11px]">
                          {p.due_date ? (
                            <span className={isOverdue ? "text-red-500 font-bold" : "text-muted-foreground/60"}>
                              {isOverdue ? "⚠ " : ""}{new Date(p.due_date).toLocaleDateString()}
                            </span>
                          ) : <span className="text-muted-foreground/30">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-[11px] text-muted-foreground/60">
                          {timeAgo(p.updated_at)}
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

      <PatentDocumentsModal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
      />
    </div>
  );
}
