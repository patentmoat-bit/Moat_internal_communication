"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Bell, Search, Filter, CheckCircle2, Clock, AlertTriangle, ArrowLeft,
  FileText, ShieldCheck, Download, Trash2, Eye, File, Settings, MessageSquare, MoreVertical, Check, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@supabase/supabase-js";
import { useAuthStore } from "@/stores/authStore";
import { ceoPatentService, DBActivityLog } from "@/services/ceoPatentService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseBrowser = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

type ModuleType = "All" | "Patent" | "Trademark" | "System";

interface NotificationItem {
  id: string;
  module: "Patent" | "Trademark" | "System";
  document_id: string;
  title: string;
  client: string;
  status: string;
  type: string;
  priority: "High" | "Medium" | "Low";
  analyst: string;
  designer: string;
  created_at: string;
  is_read: boolean;
}

// Mock data to demonstrate the UI
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1", module: "Patent", document_id: "PAT-2026-001", title: "AI Image Processing Method",
    client: "TechCorp Inc.", status: "Pending Approval", type: "New Approval Request",
    priority: "High", analyst: "Alice Johnson", designer: "Bob Smith",
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), is_read: false
  },
  {
    id: "notif-2", module: "Trademark", document_id: "TM-LG-045", title: "MOAT Logo Rebrand",
    client: "Internal", status: "Revision Requested", type: "Revision Uploaded",
    priority: "Medium", analyst: "Carol White", designer: "Dave Lee",
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), is_read: true
  },
  {
    id: "notif-3", module: "System", document_id: "SYS-001", title: "Weekly Backup Completed",
    client: "System", status: "Completed", type: "System Event",
    priority: "Low", analyst: "System", designer: "System",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), is_read: true
  }
];

export default function NotificationCenterPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ModuleType>("All");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await ceoPatentService.getNotifications();
      // Map DBActivityLog to NotificationItem
      const mapped = data.map((d: DBActivityLog) => {
        const metadata = d.metadata || {};
        return {
          id: d.id,
          module: metadata.module || (d.entity_id?.startsWith("PAT") ? "Patent" : d.entity_id?.startsWith("TM") ? "Trademark" : "System"),
          document_id: d.entity_id || "Unknown",
          title: metadata.title || "Workflow Update",
          client: metadata.client || "Internal",
          status: metadata.status || d.message || "Pending",
          type: metadata.type || "Update",
          priority: metadata.priority || "Medium",
          analyst: metadata.analyst || "System",
          designer: metadata.designer || "System",
          created_at: d.created_at,
          is_read: d.action === "read"
        };
      }) as NotificationItem[];
      setNotifications(mapped);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (supabaseBrowser) {
      const channel = supabaseBrowser
        .channel("ceo-notifications")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "activity_logs", filter: "entity_type=eq.notification" },
          (payload) => {
            console.log("New notification received", payload);
            fetchNotifications();
          }
        )
        .subscribe();
      return () => { supabaseBrowser.removeChannel(channel); };
    }
  }, []);

  const stats = useMemo(() => {
    return {
      totalPending: notifications.filter(n => n.status.includes("Pending")).length,
      patentPending: notifications.filter(n => n.module === "Patent" && n.status.includes("Pending")).length,
      tmPending: notifications.filter(n => n.module === "Trademark" && n.status.includes("Pending")).length,
      approvedToday: 1, // Mock value
      rejectedToday: 0, // Mock value
      revisions: notifications.filter(n => n.status.includes("Revision")).length,
      highPriority: notifications.filter(n => n.priority === "High" && !n.is_read).length,
      unread: notifications.filter(n => !n.is_read).length
    };
  }, [notifications]);

  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (activeTab !== "All" && n.module !== activeTab) return false;
      if (filterStatus !== "All" && n.status !== filterStatus && !(filterStatus === "Unread" && !n.is_read)) return false;
      if (search) {
        const q = search.toLowerCase();
        return n.title.toLowerCase().includes(q) || 
               n.document_id.toLowerCase().includes(q) || 
               n.client.toLowerCase().includes(q);
      }
      return true;
    });
  }, [notifications, activeTab, search, filterStatus]);

  const handleMarkRead = async (id: string) => {
    try {
      await ceoPatentService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await ceoPatentService.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({...n, is_read: true})));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      // Find the notification to get document ID
      const notif = notifications.find(n => n.id === id);
      if (!notif) return;
      
      let newStatus = "";
      if (action === "Approve") newStatus = "CEO Approved";
      else if (action === "Reject") newStatus = "CEO Rejected";
      else if (action === "Revise") newStatus = "Revision Requested by CEO";

      if (notif.module === "Patent") {
        await fetch(`/api/patents/projects/${notif.document_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
      } else if (notif.module === "Trademark") {
        await fetch(`/api/trademarks/${notif.document_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
      }
      
      // Update UI optimistically
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: newStatus } : n));
      alert(`Successfully triggered action: ${action} on ${notif.document_id}`);
    } catch (err) {
      console.error("Action failed", err);
      alert("Failed to process action");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2 mb-2">
            <Link href="/dashboard/ceo"><ArrowLeft className="h-4 w-4 mr-1.5" />Back to Dashboard</Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Notification Center</h1>
              <p className="text-sm text-muted-foreground">Centralized workflow notifications, alerts, and pending approvals.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl border-border/60" onClick={handleMarkAllRead}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark All Read
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Pending</p>
            <p className="text-2xl font-black mt-1">{stats.totalPending}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">High Priority</p>
            <p className="text-2xl font-black mt-1 text-red-500">{stats.highPriority}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Patent Pending</p>
            <p className="text-2xl font-black mt-1 text-blue-500">{stats.patentPending}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">TM Pending</p>
            <p className="text-2xl font-black mt-1 text-purple-500">{stats.tmPending}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/60 hidden lg:block">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Unread</p>
            <p className="text-2xl font-black mt-1 text-[#c9a84c]">{stats.unread}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/40 p-2 rounded-2xl border border-border/40">
        <div className="flex gap-1 p-1 bg-muted/20 rounded-xl w-full md:w-auto">
          {(["All", "Patent", "Trademark", "System"] as ModuleType[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === tab ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-9 rounded-xl bg-card border border-border/60 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Search notifications..." />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-9 rounded-xl bg-card border border-border/60 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <option value="All">All Status</option>
            <option value="Unread">Unread</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Revision Requested">Revision Requested</option>
          </select>
        </div>
      </div>

      {/* List */}
      <Card className="border-border/60 bg-card/40 overflow-hidden shadow-sm">
        <div className="divide-y divide-border/40">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin opacity-50 mb-3" />
              <p className="text-sm font-semibold">Loading notifications...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <Bell className="h-10 w-10 opacity-20 mb-3" />
              <p className="text-sm font-semibold">No notifications found.</p>
              <p className="text-xs mt-1">You're all caught up!</p>
            </div>
          ) : (
            filtered.map(n => (
              <div key={n.id} className={`p-4 flex flex-col md:flex-row gap-4 transition-colors hover:bg-muted/5 ${!n.is_read ? 'bg-blue-500/5' : ''}`}>
                <div className="flex-1 flex gap-4">
                  <div className="shrink-0 mt-1">
                    {n.module === "Patent" ? <FileText className={`h-5 w-5 ${!n.is_read ? 'text-blue-500' : 'text-muted-foreground'}`} /> :
                     n.module === "Trademark" ? <ShieldCheck className={`h-5 w-5 ${!n.is_read ? 'text-purple-500' : 'text-muted-foreground'}`} /> :
                     <Settings className={`h-5 w-5 ${!n.is_read ? 'text-emerald-500' : 'text-muted-foreground'}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider 
                        ${n.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                          n.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                        {n.priority}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">{n.document_id}</span>
                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-500"></span>}
                    </div>
                    <h3 className={`text-sm truncate pr-4 ${!n.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {n.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {n.type} • Client: {n.client} • Status: {n.status}
                    </p>
                    <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground/80">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(n.created_at).toLocaleString()}</span>
                      {n.analyst && <span className="flex items-center gap-1">Analyst: {n.analyst}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="shrink-0 flex items-center gap-2 border-t md:border-t-0 md:border-l border-border/40 pt-3 md:pt-0 md:pl-4">
                  {n.status.includes("Pending") && (
                    <>
                      <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(n.id, 'Approve')}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => handleAction(n.id, 'Reject')}>
                        Reject
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={() => handleAction(n.id, 'Revise')}>
                        Revise
                      </Button>
                    </>
                  )}
                  {n.module !== "System" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                      <Link href={`/dashboard/ceo/${n.module.toLowerCase()}?id=${n.document_id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {!n.is_read && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-blue-400" onClick={() => handleMarkRead(n.id)}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
