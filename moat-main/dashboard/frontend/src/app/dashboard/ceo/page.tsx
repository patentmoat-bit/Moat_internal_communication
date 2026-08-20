"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExecutiveDashboardCard } from "@/components/dashboard/ExecutiveDashboardCard";
import { 
  Award, ShieldAlert, Sparkles, Building2, 
  Layers, CheckCircle, Scale, Users,
  ShieldCheck, Stamp, Bell, Loader2, FlaskConical, Copyright
} from "lucide-react";
import { ceoPatentService, DBInvention, DBActivityLog, DBAlert } from "@/services/ceoPatentService";

export default function CeoWorkspacePage() {
  const [projects, setProjects] = useState<DBInvention[]>([]);
  const [trademarks, setTrademarks] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<DBAlert[]>([]);
  const [notifications, setNotifications] = useState<DBActivityLog[]>([]);
  const [copyrights, setCopyrights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [p, tRes, cRes, a, n] = await Promise.all([
          ceoPatentService.getProjects(),
          fetch("/api/trademarks").then(res => res.json()),
          fetch("/api/copyrights").then(res => res.ok ? res.json() : { data: [] }).catch(() => ({ data: [] })),
          ceoPatentService.getAlerts(),
          ceoPatentService.getNotifications()
        ]);
        setProjects(p);
        setTrademarks(tRes.data || []);
        setCopyrights(cRes.data || []);
        setAlerts(a);
        setNotifications(n);
      } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const pStats = useMemo(() => {
    let granted = 0, pending = 0, drafting = 0, filed = 0, rejected = 0;
    projects.forEach(p => {
      const s = p.status.toLowerCase();
      if (s === "approved" || s === "completed" || s === "granted") granted++;
      else if (s === "pending") pending++;
      else if (s === "drafting") drafting++;
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
      if (s === "registered" || s === "active" || s === "granted") registered++;
      else if (s === "pending" || s === "filed" || s === "published") tmPending++;
    });
    return { total: trademarks.length, wordMarks, logoMarks, registered, tmPending };
  }, [trademarks]);

  const notifStats = useMemo(() => {
    const unread = notifications.filter(n => n.action === "unread").length;
    const activeAlerts = alerts.filter(a => a.is_active).length;
    return { unread, activeAlerts, total: unread + activeAlerts };
  }, [notifications, alerts]);

  const copyStats = useMemo(() => {
    let registered = 0, pending = 0;
    copyrights.forEach(c => {
      const s = c.status?.toLowerCase() || "";
      if (s === "registered" || s === "completed") registered++;
      else if (s === "filed" || s === "pending") pending++;
    });
    return { total: copyrights.length, registered, pending };
  }, [copyrights]);

  const topLevelMetrics = useMemo(() => {
    if (loading) {
      return [
        { label: "Global Patents", value: <Skeleton className="h-8 w-16" />, icon: Layers, desc: <Skeleton className="h-3 w-32" />, colorClass: "text-[#c9a84c]", bgClass: "bg-[#c9a84c]/10 border-[#c9a84c]/20" },
        { label: "Trademark Status", value: <Skeleton className="h-8 w-16" />, icon: Stamp, desc: <Skeleton className="h-3 w-32" />, colorClass: "text-[#c9a84c]", bgClass: "bg-[#c9a84c]/10 border-[#c9a84c]/20" },
        { label: "Copyrights Status", value: <Skeleton className="h-8 w-16" />, icon: Copyright, desc: <Skeleton className="h-3 w-32" />, colorClass: "text-[#c9a84c]", bgClass: "bg-[#c9a84c]/10 border-[#c9a84c]/20" },
        { label: "Notification Center", value: <Skeleton className="h-8 w-16" />, icon: Bell, desc: <Skeleton className="h-3 w-32" />, colorClass: "text-blue-500", bgClass: "bg-blue-500/10 border-blue-500/20", href: "/dashboard/ceo/notifications" }
      ];
    }
    return [
      { label: "Global Patents", value: pStats.total.toString(), icon: Layers, desc: `${pStats.granted} Approved • ${pStats.pending + pStats.filed} Pending/Filed • ${pStats.drafting} Drafting`, colorClass: "text-[#c9a84c]", bgClass: "bg-[#c9a84c]/10 border-[#c9a84c]/20" },
      { label: "Trademark Status", value: tmStats.total.toString(), icon: Stamp, desc: `${tmStats.registered} Registered • ${tmStats.tmPending} Pending`, colorClass: "text-[#c9a84c]", bgClass: "bg-[#c9a84c]/10 border-[#c9a84c]/20" },
      { label: "Copyrights Status", value: copyStats.total.toString(), icon: Copyright, desc: `${copyStats.registered} Registered • ${copyStats.pending} Pending`, colorClass: "text-[#c9a84c]", bgClass: "bg-[#c9a84c]/10 border-[#c9a84c]/20" },
      { label: "Notification Center", value: notifStats.total.toString(), icon: Bell, desc: `${notifStats.unread} Unread Messages • ${notifStats.activeAlerts} Action Required`, colorClass: "text-blue-500", bgClass: "bg-blue-500/10 border-blue-500/20", href: "/dashboard/ceo/notifications" }
    ];
  }, [pStats, tmStats, notifStats, copyStats, loading]);

  const patentStatsArray = useMemo(() => [
    { label: "Total Patents", value: loading ? <Skeleton className="h-7 w-12" /> : pStats.total.toString(), subValue: loading ? <Skeleton className="h-3 w-24 mt-1" /> : "Global filings", colorClass: "text-[#c9a84c]" },
    { label: "Granted / Pending", value: loading ? <Skeleton className="h-7 w-20" /> : `${pStats.granted} / ${pStats.pending + pStats.filed}`, subValue: loading ? <Skeleton className="h-3 w-28 mt-1" /> : `${((pStats.granted / (pStats.total || 1)) * 100).toFixed(1)}% conversion rate`, colorClass: "text-emerald-400" },
    { label: "At Risk / Rejected", value: loading ? <Skeleton className="h-7 w-12" /> : (pStats.rejected + pStats.pending).toString(), subValue: loading ? <Skeleton className="h-3 w-24 mt-1" /> : `${pStats.rejected} rejected cases`, colorClass: "text-red-400" }
  ], [pStats, loading]);

  const trademarkStatsArray = useMemo(() => [
    { label: "Active Marks", value: loading ? <Skeleton className="h-7 w-12" /> : tmStats.total.toString(), subValue: loading ? <Skeleton className="h-3 w-24 mt-1" /> : "Registered brands", colorClass: "text-[#c9a84c]" },
    { label: "Registered / Pending", value: loading ? <Skeleton className="h-7 w-20" /> : `${tmStats.registered} / ${tmStats.tmPending}`, subValue: loading ? <Skeleton className="h-3 w-28 mt-1" /> : `${((tmStats.registered / (tmStats.total || 1)) * 100).toFixed(1)}% success rate`, colorClass: "text-emerald-400" },
    { label: "Opposition Cases", value: loading ? <Skeleton className="h-7 w-8" /> : "0", subValue: loading ? <Skeleton className="h-3 w-24 mt-1" /> : "Under legal review", colorClass: "text-amber-500" }
  ], [tmStats, loading]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-14 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pt-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[#c9a84c]/40 bg-[#c9a84c]/10 text-[#c9a84c] font-semibold px-3 py-1">
              Dashboard
            </Badge>
            <Badge variant="outline" className="text-muted-foreground font-medium px-3 py-1">
              Executive Control Plane
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-foreground">
            Intellectual Property
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground/80 max-w-3xl">
            Real-time strategic oversight of your organization's global intellectual property assets, brand protection, and legal defense systems.
          </p>
        </div>
      </div>

      {/* Top-Level Quick Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {topLevelMetrics.map((metric, idx) => {
          const cardContent = (
            <Card className="border-border/60 bg-card/60 glass-card hover:border-blue-500/30 transition-colors h-full">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl border shadow-inner ${metric.bgClass || "bg-[#c9a84c]/10 border-[#c9a84c]/20"}`}>
                  {loading ? <Loader2 className={`h-5 w-5 animate-spin ${metric.colorClass || "text-[#c9a84c]"}`} /> : <metric.icon className={`h-5 w-5 ${metric.colorClass || "text-[#c9a84c]"}`} />}
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider">{metric.label}</div>
                  <div className="text-2xl font-black mt-0.5 text-foreground">{metric.value}</div>
                  <div className="text-[9px] text-muted-foreground/60 mt-0.5">{metric.desc}</div>
                </div>
              </CardContent>
            </Card>
          );
          
          return metric.href ? (
            <a key={idx} href={metric.href} className="block">
              {cardContent}
            </a>
          ) : (
            <div key={idx}>{cardContent}</div>
          );
        })}
      </div>

      {/* The Large Cards */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
        <ExecutiveDashboardCard
          title="Patent Dashboard"
          description="Access detailed utility and design patent analytics, check pending application status, track regional filings, and review estimated market valuation."
          icon={Award}
          stats={patentStatsArray}
          lastUpdated="just now"
          href="/ceo/patent"
        />

        <ExecutiveDashboardCard
          title="Trademark Dashboard"
          description="Monitor brand registrations, watchlists, nice classifications, opposition filings, and maintain automatic protection checklists for active trademarks."
          icon={ShieldAlert}
          stats={trademarkStatsArray}
          lastUpdated="just now"
          href="/ceo/trademark"
        />

        <ExecutiveDashboardCard
          title="My MOAT"
          description="Access your exclusive strategic intelligence, competitive moats, and personalized insights."
          icon={FlaskConical}
          stats={[{ label: "Active Intelligence", value: "Enabled", subValue: "Live data", colorClass: "text-[#c9a84c]" }]}
          lastUpdated="just now"
          href="/dashboard/ceo/moat"
        />
      </div>
    </div>
  );
}
