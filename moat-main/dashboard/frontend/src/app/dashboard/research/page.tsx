"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Folder, Activity, Zap, ShieldCheck, FileText, LayoutDashboard,
  CheckCircle, Clock, AlertCircle, TrendingUp, Search, FlaskConical
} from "lucide-react";
import { ceoPatentService, DBInvention, DBActivityLog, DBAlert } from "@/services/ceoPatentService";
import Link from "next/link";

export default function PatentDashboardEngine() {
  const [projects, setProjects] = useState<DBInvention[]>([]);
  const [searches, setSearches] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<DBActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [pData, sData, nData] = await Promise.all([
          ceoPatentService.getProjects(),
          fetch("/api/searches").then(res => res.ok ? res.json() : []),
          ceoPatentService.getNotifications()
        ]);
        if (mounted) {
          setProjects(pData || []);
          setSearches(sData || []);
          setNotifications(nData || []);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || "Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const unsubscribe = ceoPatentService.subscribeToDashboardChanges(load);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const stats = useMemo(() => {
    let total = projects.length;
    let active = 0;
    let newProjects = 0;
    let drafting = 0;
    let pendingReview = 0;
    let approved = 0;
    let filed = 0;
    let searches = 0;

    projects.forEach(p => {
      const s = (p.status || "").toLowerCase();
      if (s !== "completed" && s !== "archived") active++;
      if (s === "new" || s === "draft") newProjects++;
      if (s === "drafting") drafting++;
      if (s === "pending" || s === "review") pendingReview++;
      if (s === "approved") approved++;
      if (s === "filed") filed++;
      if (s === "search") searches++;
    });

    return { total, active, newProjects, drafting, pendingReview, approved, filed, searches };
  }, [projects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading Patent Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <p className="text-sm font-semibold text-rose-500">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#c9a84c] text-white rounded-md text-sm font-semibold hover:bg-[#b09342]"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-14 px-4 sm:px-6 lg:px-8 bg-[#fdfdfc] dark:bg-background min-h-screen">
      {/* Header Banner */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 rounded-none overflow-hidden shadow-sm mb-6 bg-gradient-to-r from-[#fdfbf7] to-[#f4ead5] dark:from-[#110e0a] dark:to-[#0a0805] border-b border-[#e8d5b5] dark:border-[#332b1a] relative">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/50 dark:bg-white/5 blur-3xl rounded-full z-0" />
        <div className="relative z-10 px-8 sm:px-10 lg:px-16 py-8 flex flex-col lg:flex-row items-center justify-between">
          <div className="w-full lg:w-auto mb-6 lg:mb-0">
            <h1 className="text-2xl font-bold tracking-tight mb-2 text-[#5a4315] dark:text-[#d6b77a]">
              Patent Dashboard Engine
            </h1>
            <p className="text-[13px] font-semibold text-[#8a6b2d] dark:text-[#a38a58]">
              Enterprise Patent Intelligence & Analytics
            </p>
          </div>
          <div className="flex gap-4">
             <Link href="/dashboard/research/moat" className="flex items-center gap-2 bg-gradient-to-r from-[#5746f3] to-[#a33df1] hover:from-[#4939d8] hover:to-[#892ccf] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all border-0">
               <FlaskConical className="w-4 h-4 text-white" />
               MOAT
             </Link>
             <Link href="/dashboard/search" className="flex items-center gap-2 bg-[#c9a84c] hover:bg-[#b09342] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all">
               <Search className="w-4 h-4" />
               New Search
             </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: "Total Patents", val: stats.total, icon: Folder },
          { label: "Active", val: stats.active, icon: Activity },
          { label: "New", val: stats.newProjects, icon: Zap },
          { label: "Searches", val: stats.searches, icon: Search },
          { label: "Drafts", val: stats.drafting, icon: FileText },
          { label: "Reviews", val: stats.pendingReview, icon: Clock },
          { label: "Approved", val: stats.approved, icon: CheckCircle },
          { label: "Filed", val: stats.filed, icon: ShieldCheck },
        ].map((m, i) => (
          <Card key={i} className="border border-border/40 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-card">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[#c9a84c] dark:text-[#c9a84c]">
                <m.icon className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{m.label}</p>
              <p className="text-xl font-black text-foreground">{m.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Active Patent Projects */}
        <Card className="lg:col-span-2 border border-border/40 shadow-sm bg-white dark:bg-card flex flex-col h-full min-h-[400px]">
          <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active Patent Workflow</CardTitle>
            <Link href="/dashboard/tracker" className="text-[11px] font-bold text-[#c9a84c] hover:underline flex items-center gap-1">
              View Tracker <span>→</span>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {projects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No patent projects found.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase font-bold text-muted-foreground bg-muted/30 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title / Ref</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.sort((a,b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()).slice(0, 15).map((p, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/patents/${p.id}`} className="font-bold text-foreground text-xs hover:text-[#c9a84c] hover:underline block truncate max-w-[300px]">
                          {p.title}
                        </Link>
                        <p className="text-[10px] text-muted-foreground">{p.id.split("-")[0].toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] uppercase bg-amber-50/50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-[#d6b77a] dark:border-[#d6b77a]/30">
                          {p.status || "New"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">
                        {new Date(p.updated_at || p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 flex flex-col h-full">
          {/* Search History & Research */}
          <Card className="border border-border/40 shadow-sm bg-white dark:bg-card">
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-500" />
                Previous Search History
              </CardTitle>
              <Link href="/dashboard/search" className="text-[11px] font-bold text-[#c9a84c] hover:underline flex items-center gap-1">
                View All
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-4 h-[166px] overflow-y-auto custom-scrollbar">
              {searches.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-4">No search history.</div>
              ) : (
                searches.map((s, i) => (
                  <div key={i} className="flex flex-col gap-1 border-l-2 border-blue-500 pl-3">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-foreground">{s.search_type} Search</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${s.search_status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : s.search_status === 'FAILED' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'}`}>{s.search_status}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate" title={s.project_title}>Project: {s.project_title}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border border-border/40 shadow-sm bg-white dark:bg-card flex flex-col flex-1 min-h-[300px]">
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#c9a84c]" />
                Recent Activity
              </CardTitle>
              <Link href="/dashboard/notifications" className="text-[11px] font-bold text-[#c9a84c] hover:underline flex items-center gap-1">
                View All
              </Link>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto relative custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-4">No recent activity.</div>
              ) : (
                <div className="relative pt-2 pb-2">
                  {/* Center Line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-border/50 -translate-x-1/2"></div>
                  
                  <div className="space-y-4">
                    {notifications.slice(0, 8).map((n, i) => {
                      const isLeft = i % 2 !== 0; // 0: Right, 1: Left, 2: Right...
                      return (
                        <div key={i} className={`relative flex items-center w-full ${isLeft ? 'justify-start' : 'justify-end'}`}>
                          {/* Timeline Dot */}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#fcf8f0] dark:bg-amber-900/20 border-2 border-[#e6d0a1] dark:border-[#c9a84c] flex items-center justify-center z-10">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]"></div>
                          </div>
                          
                          {/* Card */}
                          <div className={`w-[calc(50%-12px)] ${isLeft ? 'pr-2' : 'pl-2'}`}>
                            <div className="bg-white dark:bg-card border border-border/60 rounded-xl p-2.5 shadow-sm">
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <span className="text-[11px] font-bold text-foreground capitalize tracking-wide leading-tight">
                                  {n.action ? n.action.replace(/_/g, ' ') : "System Update"}
                                </span>
                                <span className="text-[9px] text-muted-foreground shrink-0">
                                  {new Date(n.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2" title={n.message}>
                                {n.message || "Workflow status was manually updated."}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
