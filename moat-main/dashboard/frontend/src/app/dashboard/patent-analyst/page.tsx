"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutiveDashboardCard } from "@/components/dashboard/ExecutiveDashboardCard";
import { 
  Award, ShieldAlert, Sparkles, Building2, 
  Layers, CheckCircle, Scale, Users,
  ShieldCheck, Stamp, Bell, Loader2, Copyright,
  Activity, Search, Upload, FileText, Target, MoreHorizontal, Plus, Trash2, StickyNote, Save, X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ceoPatentService, DBInvention, DBActivityLog, DBAlert } from "@/services/ceoPatentService";
import { apiFetch } from "@/lib/apiFetch";

export default function PatentAnalystWorkspacePage() {
  const [projects, setProjects] = useState<DBInvention[]>([]);
  const [trademarks, setTrademarks] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<DBAlert[]>([]);
  const [notifications, setNotifications] = useState<DBActivityLog[]>([]);
  const [copyrights, setCopyrights] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"All" | "Patent" | "Trademark" | "Copyright">("All");
  const [loading, setLoading] = useState(true);
  
  const [priorities, setPriorities] = useState<any[]>([]);
  const [newPriorityText, setNewPriorityText] = useState('');
  const [newPriorityLevel, setNewPriorityLevel] = useState<'High'|'Medium'|'Low'>('Medium');
  const [savingPriorities, setSavingPriorities] = useState(false);
  const [stickyNotes, setStickyNotes] = useState<any[]>([]);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [p, tRes, aRes, cRes, nRes, prRes, snRes] = await Promise.all([
          ceoPatentService.getProjects(),
          apiFetch("/api/trademarks").then(res => res.json()),
          apiFetch("/api/alerts").then(res => res.json()),
          apiFetch("/api/copyrights").then(res => res.ok ? res.json() : { data: [] }).catch(() => ({ data: [] })),
          ceoPatentService.getNotifications().catch(() => []),
          fetch("/api/priorities").then(res => res.json()).catch(() => ({ priorities: [] })),
          fetch(`/api/sticky-notes?t=${Date.now()}`, { cache: 'no-store' }).then(res => res.json()).catch(() => ({ notes: [] }))
        ]);
        setProjects(p);
        setTrademarks(tRes.data || []);
        setPriorities(prRes.priorities || []);
        setStickyNotes(snRes.notes || []);
        
        const liveAlerts = aRes.data || [];
        setAlerts(liveAlerts); 
        setNotifications(nRes || []); 
        
        setCopyrights(cRes.data || []);
      } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    const unsubscribe = ceoPatentService.subscribeToDashboardChanges(() => {
      fetchStats();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-save sticky notes when they change
  const initialNotesLoaded = useRef(false);
  useEffect(() => {
    if (!initialNotesLoaded.current) {
      if (stickyNotes.length > 0 || !loading) {
        initialNotesLoaded.current = true;
      }
      return;
    }
    const timer = setTimeout(() => {
      setSavingNotes(true);
      fetch("/api/sticky-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: stickyNotes })
      }).finally(() => setSavingNotes(false)).catch(console.error);
    }, 1000);
    return () => clearTimeout(timer);
  }, [stickyNotes, loading]);

  const handleSavePriorities = async (newPriorities: any[]) => {
    setSavingPriorities(true);
    try {
      await fetch("/api/priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priorities: newPriorities })
      });
      setNewPriorityText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPriorities(false);
    }
  };

  const handleAddPriority = () => {
    if (!newPriorityText.trim()) return;
    const newP = [{ id: Date.now().toString(), text: newPriorityText, level: newPriorityLevel }, ...priorities];
    setPriorities(newP);
    setNewPriorityText('');
    handleSavePriorities(newP);
  };

  const handleRemovePriority = (id: string) => {
    const newP = priorities.filter(p => p.id !== id);
    setPriorities(newP);
    handleSavePriorities(newP);
  };

  const unifiedStats = useMemo(() => {
    let total = projects.length + trademarks.length + copyrights.length;
    let inProgress = 0, newProjects = 0, research = 0, drafting = 0, pendingReview = 0, awaitingApproval = 0, completed = 0;
    
    const processStatus = (status: string) => {
      const s = (status || "").toLowerCase();
      if (s.includes("review")) pendingReview++;
      else if (s.includes("approval") || s.includes("ceo")) awaitingApproval++;
      else if (s.includes("approved") || s.includes("completed") || s.includes("filed") || s.includes("registered")) completed++;
      else if (s.includes("research") || s.includes("search")) { research++; inProgress++; }
      else if (s.includes("draft")) { drafting++; inProgress++; }
      else { newProjects++; inProgress++; } // New or fallback goes here
    };
    
    projects.forEach(p => processStatus(p.status));
    trademarks.forEach(t => processStatus(t.status));
    copyrights.forEach(c => processStatus(c.status));
    
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, inProgress, newProjects, research, drafting, pendingReview, awaitingApproval, completed, completionPercentage };
  }, [projects, trademarks, copyrights]);

  const recentWork = useMemo(() => {
    let all = [
      ...projects.map(p => ({ ...p, ipType: "Patent", sortDate: new Date(p.updated_at || p.created_at).getTime(), href: `/dashboard/patents/${p.id}` })),
      ...trademarks.map(t => ({ ...t, ipType: "Trademark", title: t.brand_name || t.name, sortDate: new Date(t.updated_at || t.created_at).getTime(), href: `/dashboard/trademark/${t.id}` })),
      ...copyrights.map(c => ({ ...c, ipType: "Copyright", title: c.title, sortDate: new Date(c.updated_at || c.created_at).getTime(), href: `/dashboard/copyright/${c.id}` }))
    ];
    if (activeTab !== "All") {
      all = all.filter(item => item.ipType === activeTab);
    }
    return all.sort((a, b) => b.sortDate - a.sortDate).slice(0, 5);
  }, [projects, trademarks, copyrights, activeTab]);

  const pStats = useMemo(() => {
    let granted = 0, pending = 0, drafting = 0, filed = 0, rejected = 0;
    projects.forEach(p => {
      const s = (p.status || "").toLowerCase();
      if (s === "approved" || s === "completed" || s === "granted") granted++;
      else if (s === "pending" || s.includes("review")) pending++;
      else if (s === "drafting" || s.includes("draft")) drafting++;
      else if (s === "filed") filed++;
      else if (s === "rejected") rejected++;
    });
    return { total: projects.length, granted, pending, drafting, filed, rejected };
  }, [projects]);

  const tmStats = useMemo(() => {
    let wordMarks = 0, logoMarks = 0, registered = 0, tmPending = 0;
    trademarks.forEach(t => {
      const ty = t.type?.toLowerCase() || "";
      if (ty.includes("word") || ty.includes("standard character")) wordMarks++;
      else if (ty.includes("logo") || ty.includes("design") || ty.includes("device") || ty.includes("combined")) logoMarks++;
      else wordMarks++; // Default fallback
      
      const s = t.status?.toLowerCase() || "";
      if (s === "registered" || s === "active" || s === "granted" || s === "completed") registered++;
      else if (s === "pending" || s === "filed" || s === "published" || s.includes("review")) tmPending++;
    });
    return { total: trademarks.length, wordMarks, logoMarks, registered, tmPending };
  }, [trademarks]);

  const notifStats = useMemo(() => {
    // Both alerts and notifications are coming from the live EventBus now via /api/alerts
    const unread = alerts.filter((a: any) => a.status === 'Pending').length;
    const activeAlerts = alerts.filter((a: any) => a.priority === 'High' || a.priority === 'critical').length;
    return { unread, activeAlerts, total: unread + activeAlerts };
  }, [alerts]);

  const copyStats = useMemo(() => {
    let registered = 0, pending = 0, inReview = 0;
    copyrights.forEach(c => {
      const s = c.status?.toLowerCase() || "";
      if (s === "registered" || s === "completed") registered++;
      else if (s === "filed" || s === "pending") pending++;
      else if (s === "review" || s === "under_review" || s.includes("review")) inReview++;
    });
    return { total: copyrights.length, registered, pending, inReview };
  }, [copyrights]);

  const upcomingDeadlines = useMemo(() => {
    const all = [
      ...projects.filter(p => p.due_date && !p.status?.toLowerCase().includes("completed") && !p.status?.toLowerCase().includes("granted")).map(p => ({ title: p.title, type: "Patent", dueDate: new Date(p.due_date!).getTime(), status: p.status, href: `/dashboard/research/moat/${p.id}` })),
      ...trademarks.filter(t => t.due_date && !t.status?.toLowerCase().includes("registered") && !t.status?.toLowerCase().includes("completed")).map(t => ({ title: t.brand_name || t.name, type: "Trademark", dueDate: new Date(t.due_date!).getTime(), status: t.status, href: `/dashboard/trademark/${t.id}` })),
      ...copyrights.filter(c => c.due_date && !c.status?.toLowerCase().includes("registered") && !c.status?.toLowerCase().includes("completed")).map(c => ({ title: c.title, type: "Copyright", dueDate: new Date(c.due_date!).getTime(), status: c.status, href: `/dashboard/copyright/${c.id}` }))
    ];
    
    // Sort ascending by due date (closest first)
    return all.sort((a, b) => a.dueDate - b.dueDate).slice(0, 3);
  }, [projects, trademarks, copyrights]);

  const handleAddNote = () => {
    setStickyNotes([...stickyNotes, { id: crypto.randomUUID(), content: "", color: "yellow" }]);
  };

  const handleRemoveNote = (id: string) => {
    setStickyNotes(stickyNotes.filter(n => n.id !== id));
  };

  const handleUpdateNote = (id: string, content: string) => {
    setStickyNotes(stickyNotes.map(n => n.id === id ? { ...n, content } : n));
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await fetch("/api/sticky-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: stickyNotes })
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (loading) {
      return [
        { label: "Total Projects", value: "-", icon: Layers, desc: "Across all IP functions", colorClass: "text-blue-500", bgClass: "bg-blue-500/10 border-blue-500/20" },
        { label: "In Progress", value: "-", icon: Activity, desc: "Currently active", colorClass: "text-amber-500", bgClass: "bg-amber-500/10 border-amber-500/20" },
        { label: "Pending Review", value: "-", icon: Search, desc: "Requires attention", colorClass: "text-orange-500", bgClass: "bg-orange-500/10 border-orange-500/20" },
        { label: "Awaiting Approval", value: "-", icon: ShieldAlert, desc: "Pending CEO approval", colorClass: "text-purple-500", bgClass: "bg-purple-500/10 border-purple-500/20" },
        { label: "Completed / Filed", value: "-", icon: CheckCircle, desc: "Successfully closed", colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10 border-emerald-500/20" },
      ];
    }
    return [
      { label: "Total Projects", value: unifiedStats.total.toString(), icon: Layers, desc: "Across all IP functions", colorClass: "text-blue-500", bgClass: "bg-blue-500/10 border-blue-500/20" },
      { label: "In Progress", value: unifiedStats.inProgress.toString(), icon: Activity, desc: "Currently active", colorClass: "text-amber-500", bgClass: "bg-amber-500/10 border-amber-500/20" },
      { label: "Pending Review", value: unifiedStats.pendingReview.toString(), icon: Search, desc: "Requires attention", colorClass: "text-orange-500", bgClass: "bg-orange-500/10 border-orange-500/20" },
      { label: "Awaiting Approval", value: unifiedStats.awaitingApproval.toString(), icon: ShieldAlert, desc: "Pending CEO approval", colorClass: "text-purple-500", bgClass: "bg-purple-500/10 border-purple-500/20" },
      { label: "Completed / Filed", value: unifiedStats.completed.toString(), icon: CheckCircle, desc: "Successfully closed", colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10 border-emerald-500/20" },
    ];
  }, [unifiedStats, loading]);

  // Removing unused workflowStates since we are rendering directly now

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-14 px-4 sm:px-6 lg:px-8 bg-[#fdfdfc] dark:bg-background min-h-screen">
      {/* Light/Dark Header Banner */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 rounded-none overflow-hidden shadow-sm mb-6 bg-gradient-to-r from-[#fdfbf7] to-[#f4ead5] dark:from-[#110e0a] dark:to-[#0a0805] border-b border-[#e8d5b5] dark:border-[#332b1a] relative">
        {/* Light glow and graphic accents */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/50 dark:bg-white/5 blur-3xl rounded-full z-0" />
        <div className="absolute right-40 bottom-[-50px] w-64 h-64 bg-[#af8f3d]/10 dark:bg-[#c9a84c]/10 blur-2xl rounded-full z-0" />
        
        <div className="relative z-10 px-8 sm:px-10 lg:px-16 py-8 flex flex-col lg:flex-row items-center justify-between">
          <div className="w-full lg:w-auto mb-6 lg:mb-0">
            <h1 className="text-2xl font-bold tracking-tight mb-4 text-[#5a4315] dark:text-[#d6b77a]">
              Drive Innovation. Protect Ideas. Create Impact.
            </h1>
            <div className="flex items-center gap-4 text-[13px] font-semibold text-[#8a6b2d] dark:text-[#a38a58]">
              <div className="flex items-center gap-1.5">
                <Search className="w-4 h-4" />
                <span>Analyze</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#c2a670] dark:bg-[#c9a84c]" />
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                <span>Search</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-[#c2a670] dark:bg-[#c9a84c]" />
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Protect</span>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-6 opacity-90 pr-8">
            <div className="w-14 h-14 rounded-full border border-[#af8f3d]/30 dark:border-[#c9a84c]/30 flex items-center justify-center bg-white/40 dark:bg-black/40 shadow-sm backdrop-blur-sm">
              <FileText className="w-6 h-6 text-[#8a6b2d] dark:text-[#c9a84c]" />
            </div>
            <div className="w-24 h-24 rounded-full border border-[#af8f3d]/40 dark:border-[#c9a84c]/40 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md shadow-lg relative">
               <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-[#af8f3d]/50 dark:border-[#c9a84c]/50 animate-[spin_10s_linear_infinite]" />
               <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-[#af8f3d]/30 dark:border-[#c9a84c]/30 animate-[spin_15s_linear_infinite_reverse]" />
               <div className="w-16 h-16 bg-gradient-to-br from-[#d9b873] to-[#a38031] dark:from-[#9c7a2d] dark:to-[#5c4514] rounded-full flex items-center justify-center shadow-inner">
                 <span className="font-black text-sm tracking-widest text-white dark:text-[#f7ebd4]">MOAT</span>
               </div>
            </div>
            <div className="w-14 h-14 rounded-full border border-[#af8f3d]/30 dark:border-[#c9a84c]/30 flex items-center justify-center bg-white/40 dark:bg-black/40 shadow-sm backdrop-blur-sm">
              <Users className="w-6 h-6 text-[#8a6b2d] dark:text-[#c9a84c]" />
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((metric, idx) => (
          <Card key={idx} className="border border-border/40 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-card rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-3xl font-black text-foreground">{metric.value}</p>
                  <p className="text-[10px] font-medium text-emerald-600 mt-2 flex items-center gap-1">
                    ▲ {((idx * 7) % 20) + 1}% vs last month
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl border ${metric.bgClass}`}>
                  {loading ? <Loader2 className={`h-4 w-4 animate-spin ${metric.colorClass}`} /> : <metric.icon className={`h-5 w-5 ${metric.colorClass}`} />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Middle Row: Recent Work & Workflow Overview */}
      <div className="grid gap-6 grid-cols-12">
        {/* Left Col: Recent Work */}
        <div className="col-span-12 xl:col-span-8">
          <Card className="h-full border border-border/40 shadow-sm bg-white dark:bg-card rounded-xl flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold tracking-tight text-foreground">My Recent Work</h2>
                <a href="/dashboard/research" className="text-[11px] font-bold text-[#c9a84c] hover:underline flex items-center gap-1">
                  View All <span>→</span>
                </a>
              </div>
              <div className="flex items-center gap-6 border-b pb-2 mb-4">
                {["All", "Patent", "Trademark", "Copyright"].map((tab) => (
                  <span 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`text-xs cursor-pointer transition-colors ${
                      activeTab === tab 
                        ? "font-bold text-foreground border-b-2 border-[#c9a84c] pb-2 -mb-[10px]" 
                        : "font-medium text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </span>
                ))}
              </div>
              
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="text-muted-foreground text-xs border-b">
                    <tr>
                      <th className="pb-3 font-medium">Title / Project</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Stage</th>
                      <th className="pb-3 font-medium">Due Date</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {loading ? (
                      <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">Loading...</td></tr>
                    ) : recentWork.length === 0 ? (
                      <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No recent work found.</td></tr>
                    ) : (
                      recentWork.map((rw, i) => {
                        const isPatent = rw.ipType === "Patent";
                        const isTM = rw.ipType === "Trademark";
                        const isCopy = rw.ipType === "Copyright";
                        const typeColors = isPatent ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                                         : isTM ? "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30"
                                         : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30";
                        const statusText = rw.status || "New";
                        const isPending = statusText.toLowerCase().includes("pending");
                        const statusColor = isPending ? "bg-rose-50 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400" : "bg-blue-50 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400";

                        return (
                          <tr key={i} className="hover:bg-muted/20 transition-colors group">
                            <td className="py-3 pr-4">
                              <p className="font-bold text-foreground text-[13px]">{rw.title || rw.name || "Unnamed"}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{isPatent ? "P" : isTM ? "T" : "C"}-2024-{String(i+1).padStart(5,'0')}</p>
                            </td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 ${typeColors}`}>{rw.ipType}</Badge>
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground text-[12px]">
                              {rw.stage || (isPatent ? "Drafting" : isTM ? "Opposition Check" : "Registration")}
                            </td>
                            <td className="py-3 pr-4 text-foreground text-[12px]">
                              {new Date(rw.sortDate + 86400000 * 7).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{statusText}</span>
                            </td>
                            <td className="py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground group-hover:text-foreground">
                                  <MoreHorizontal className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <a href={rw.href} className="cursor-pointer w-full">View Details</a>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer">Edit Project</DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer text-rose-500 dark:text-rose-400">Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center text-[11px] text-muted-foreground">
                <span>Showing 1 to {recentWork.length} of {unifiedStats.total} entries</span>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-[#c9a84c] text-white font-bold">1</div>
                  <div className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted cursor-pointer">2</div>
                  <div className="w-6 h-6 rounded flex items-center justify-center hover:bg-muted cursor-pointer">→</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Workflow Overview + Activity */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6">
          {/* Workflow Overview */}
          <Card className="border border-border/40 shadow-sm bg-white dark:bg-card rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold tracking-tight text-foreground">Workflow Overview</h2>
                <a href="/dashboard/tracker" className="text-[11px] font-bold text-[#c9a84c] hover:underline flex items-center gap-1">
                  View Details <span>→</span>
                </a>
              </div>
              <div className="relative flex justify-between items-end mb-4">
                <div className="absolute left-[5%] right-[5%] top-[15px] h-0.5 bg-muted z-0" />
                <div className="absolute left-[5%] top-[15px] h-0.5 bg-[#c9a84c] z-0 transition-all" style={{ width: `${unifiedStats.completionPercentage}%` }} />
                
                {[ 
                  { icon: FileText, label: "New", val: unifiedStats.newProjects },
                  { icon: Search, label: "Research", val: unifiedStats.research },
                  { icon: FileText, label: "Drafting", val: unifiedStats.drafting },
                  { icon: Search, label: "Review", val: unifiedStats.pendingReview },
                  { icon: CheckCircle, label: "Approval", val: unifiedStats.awaitingApproval },
                  { icon: FileText, label: "Filed", val: unifiedStats.completed }
                ].map((st, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white dark:bg-card ${idx <= 2 && st.val > 0 ? 'border-[#c9a84c] text-[#c9a84c]' : (idx > 2 && st.val > 0) ? 'border-emerald-500 text-emerald-500' : 'border-muted text-muted-foreground'}`}>
                      <st.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground font-medium">{st.label}</p>
                      <p className="text-xs font-black text-foreground">{st.val}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-right text-[10px] font-bold text-[#c9a84c] mt-2">{unifiedStats.completionPercentage}% Completed</div>
            </CardContent>
          </Card>

          {/* Sticky Notes */}
          <Card className="flex-1 border border-[#e8d5b5]/60 shadow-sm bg-[#fffcf0] dark:bg-[#1f1a0f] rounded-xl flex flex-col min-h-[300px]">
            <CardHeader className="border-b border-[#e8d5b5]/50 dark:border-[#e8d5b5]/10 pb-3 pt-4 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-[#c9a84c]" />
                Sticky Notes
              </CardTitle>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleAddNote} 
                  className="text-[11px] font-bold text-[#c9a84c] hover:bg-[#c9a84c]/10 px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-[#c9a84c]/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Note
                </button>
                <button 
                  onClick={handleSaveNotes} 
                  disabled={savingNotes} 
                  className="text-[11px] font-bold bg-[#c9a84c] text-white hover:bg-[#b09342] px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingNotes ? "Saving..." : "Save"}
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 relative overflow-y-auto custom-scrollbar">
              {stickyNotes.length === 0 ? (
                <div className="text-center text-[#8a6b2d]/60 text-sm py-12 italic">No notes yet. Click 'Add Note' to create one.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4 auto-rows-max">
                  {stickyNotes.map((note) => (
                    <div key={note.id} className="relative group bg-[#fdfbf7] dark:bg-[#2a2416] border border-[#e8d5b5]/70 shadow-md hover:shadow-lg transition-shadow aspect-square flex flex-col pt-6 pb-2 px-3">
                      {/* Pin */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 w-3 h-3 rounded-full bg-red-600 shadow-sm border border-red-800">
                         <div className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white/50"></div>
                      </div>
                      
                      {/* Folded Corner Effect (bottom right) */}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-gradient-to-tl from-[#d6b77a]/40 to-transparent rounded-tl-sm"></div>
                      
                      {/* Delete button (shows on hover) */}
                      <button 
                        onClick={() => handleRemoveNote(note.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-[#8a6b2d] hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      
                      <textarea
                        value={note.content}
                        onChange={(e) => handleUpdateNote(note.id, e.target.value)}
                        placeholder="Type a note..."
                        className="flex-1 w-full bg-transparent border-none outline-none resize-none text-[11px] text-[#5c4a1e] dark:text-[#d6b77a] placeholder-[#c9a84c]/50 custom-scrollbar leading-relaxed"
                        style={{ boxShadow: 'none' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: IP Summary, Priorities, Deadlines */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* IP Summary */}
        <Card className="border border-border/40 shadow-sm bg-white dark:bg-card rounded-xl">
          <CardContent className="p-6">
            <h2 className="text-base font-bold tracking-tight text-foreground mb-4">IP Summary</h2>
            <div className="bg-gray-50/50 dark:bg-muted/30 rounded-xl p-4 flex gap-4 h-[240px]">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-100/50 text-amber-600">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Patent</p>
                    <p className="text-[9px] text-muted-foreground">{pStats.total} Projects</p>
                  </div>
                </div>
                <div className="space-y-2 text-[11px] border-t border-border/50 pt-2">
                  <div className="flex justify-between"> <span className="text-muted-foreground">In Progress</span> <span className="font-bold">{pStats.drafting}</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Pending Review</span> <span className="font-bold">{pStats.pending}</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Awaiting Approval</span> <span className="font-bold">4</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Filed / Completed</span> <span className="font-bold">{pStats.granted}</span> </div>
                </div>
                <a href="/dashboard/research" className="block pt-2 text-[10px] font-bold text-[#c9a84c] hover:underline">Go to Patent Hub →</a>
              </div>
              <div className="w-px bg-border/50" />
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100/50 text-purple-600">
                    <Stamp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Trademark</p>
                    <p className="text-[9px] text-muted-foreground">{tmStats.total} Projects</p>
                  </div>
                </div>
                <div className="space-y-2 text-[11px] border-t border-border/50 pt-2">
                  <div className="flex justify-between"> <span className="text-muted-foreground">In Progress</span> <span className="font-bold">9</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Pending Review</span> <span className="font-bold">{tmStats.tmPending}</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Awaiting Approval</span> <span className="font-bold">3</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Registered</span> <span className="font-bold">{tmStats.registered}</span> </div>
                </div>
                <a href="/dashboard/trademark" className="block pt-2 text-[10px] font-bold text-[#c9a84c] hover:underline">Go to Trademark Hub →</a>
              </div>
              <div className="w-px bg-border/50" />
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100/50 text-emerald-600">
                    <Copyright className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Copyright</p>
                    <p className="text-[9px] text-muted-foreground">{copyStats.total} Projects</p>
                  </div>
                </div>
                <div className="space-y-2 text-[11px] border-t border-border/50 pt-2">
                  <div className="flex justify-between"> <span className="text-muted-foreground">In Progress</span> <span className="font-bold">5</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Pending Review</span> <span className="font-bold">{copyStats.inReview}</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Awaiting Approval</span> <span className="font-bold">2</span> </div>
                  <div className="flex justify-between"> <span className="text-muted-foreground">Registered</span> <span className="font-bold">{copyStats.registered}</span> </div>
                </div>
                <a href="/dashboard/copyright" className="block pt-2 text-[10px] font-bold text-[#c9a84c] hover:underline">Go to Copyrights Hub →</a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Priorities */}
        <Card className="border border-border/40 shadow-sm bg-white dark:bg-card rounded-xl">
          <CardContent className="p-6 h-[310px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold tracking-tight text-foreground">Top Priorities</h2>
              {savingPriorities && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Saving</span>}
            </div>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newPriorityText}
                onChange={(e) => setNewPriorityText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPriority()}
                placeholder="Add a priority..." 
                className="flex-1 text-xs px-3 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50"
              />
              <select 
                value={newPriorityLevel}
                onChange={(e) => setNewPriorityLevel(e.target.value as any)}
                className="text-xs px-2 py-1.5 rounded-md border border-input bg-background w-24 focus:outline-none focus:ring-1 focus:ring-[#c9a84c]/50"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <button 
                onClick={handleAddPriority}
                className="bg-[#c9a84c] text-white p-1.5 rounded-md hover:bg-[#b09342] transition-colors flex items-center justify-center w-8 shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading priorities...</p>
              ) : priorities.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">No top priorities right now.</p>
              ) : (
                priorities.map((p: any) => {
                  let color = "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400"; // Medium
                  if (p.level === "High") color = "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400";
                  if (p.level === "Low") color = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400";
                  
                  return (
                    <div key={p.id} className="flex gap-3 justify-between items-center group bg-gray-50/50 dark:bg-gray-800/30 p-2.5 rounded-lg border border-border/40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex flex-col flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate" title={p.text}>{p.text}</p>
                      </div>
                      <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 shrink-0 ${color}`}>{p.level}</Badge>
                      <button 
                        onClick={() => handleRemovePriority(p.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 shrink-0 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="border border-border/40 shadow-sm bg-white dark:bg-card rounded-xl">
          <CardContent className="p-6 h-[310px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold tracking-tight text-foreground">Upcoming Deadlines</h2>
              <a href="/dashboard/tracker" className="text-[11px] font-bold text-[#c9a84c] hover:underline flex items-center gap-1">
                View Calendar <span>→</span>
              </a>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {upcomingDeadlines.length === 0 && <p className="text-xs text-muted-foreground italic">No upcoming deadlines.</p>}
              {upcomingDeadlines.map((d, i) => {
                const date = new Date(d.dueDate);
                const isOverdue = date.getTime() < Date.now();
                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center w-10 shrink-0">
                      <span className={`text-[9px] font-bold uppercase ${isOverdue ? 'text-rose-500' : 'text-amber-600'}`}>{date.toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-lg font-black text-foreground leading-tight">{date.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={d.href} className="text-xs font-bold text-foreground truncate block hover:underline" title={d.title}>{d.title}</a>
                      <p className="text-[11px] text-muted-foreground truncate">{d.type} • {d.status || "Action Required"}</p>
                    </div>
                    {isOverdue ? (
                      <span className="text-[10px] font-bold text-rose-500 shrink-0 pt-0.5">Overdue</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 shrink-0 pt-0.5">Upcoming</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t text-center">
              <a href="/dashboard/tracker" className="text-[11px] font-bold text-[#c9a84c] hover:underline">
                View All Deadlines →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
