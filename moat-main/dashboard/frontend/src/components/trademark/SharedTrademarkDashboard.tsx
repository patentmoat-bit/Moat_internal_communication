"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Stamp, Shield, CheckCircle2, Clock, Globe, ShieldCheck, AlertTriangle,
  ArrowLeft, Download, Filter, Plus, FileText, ImageIcon, TrendingUp,
  BarChart3, Activity, RefreshCw, ArrowRight
} from "lucide-react";
import { LoadingState } from "../shared/LoadingState";
import {
  AreaChart, Area, PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, BarChart, Bar
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const TOOLTIP_STYLE = {
  backgroundColor: "#1a1a0e",
  borderColor: "#c9a84c20",
  borderRadius: "12px",
  color: "#e8dfc8",
  fontSize: "12px",
};

const GEOGRAPHY_DATA = [
  { name: "United States (USPTO)", value: 62, color: "#c9a84c" },
  { name: "European Union (EUIPO)", value: 42, color: "#3b82f6" },
  { name: "China (CNIPA)", value: 24, color: "#10b981" },
  { name: "Japan (JPO)", value: 12, color: "#8b5cf6" },
  { name: "Others", value: 8, color: "#64748b" },
];

const PROTECTION_TIMELINE = [
  { month: "Jan", phishing: 4, squatting: 8, counterfeiting: 2 },
  { month: "Feb", phishing: 6, squatting: 11, counterfeiting: 3 },
  { month: "Mar", phishing: 5, squatting: 9, counterfeiting: 1 },
  { month: "Apr", phishing: 8, squatting: 15, counterfeiting: 4 },
  { month: "May", phishing: 12, squatting: 18, counterfeiting: 5 },
  { month: "Jun", phishing: 15, squatting: 22, counterfeiting: 6 },
];

const BRAND_ALERTS = [
  { id: "AL-109", type: "Domain Squatting", target: "moat-patents.net", risk: "high", status: "Blocked & Acquired", date: "2024-06-16" },
  { id: "AL-108", type: "Brand Impersonation", target: "Zyra Patent Copilot", risk: "medium", status: "Cease & Desist Sent", date: "2024-06-14" },
  { id: "AL-107", type: "Logo Copycat", target: "M-shaped emblem (app)", risk: "high", status: "App Store Taken Down", date: "2024-06-11" },
];

interface Trademark {
  id: string;
  type: string;
  name: string;
  application_number: string;
  status: string;
  class: string;
  goods_services: string;
  country: string;
  image_url: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  Approved: { label: "Approved", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  Pending: { label: "Pending", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: Clock },
  Rejected: { label: "Rejected", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertTriangle },
  Renewal: { label: "Renewal", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: RefreshCw },
};

export function SharedTrademarkDashboard({ basePath, backLink, backLabel }: { basePath: string, backLink: string, backLabel: string }) {
  const [trademarks, setTrademarks] = useState<Trademark[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0, renewal: 0, word: 0, logo: 0 });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trademarks");
      if (res.ok) {
        const json = await res.json();
        const data: Trademark[] = json.data || [];
        setTrademarks(data);
        setStats({
          total: data.length,
          approved: data.filter(t => t.status === "Approved").length,
          pending: data.filter(t => t.status === "Pending").length,
          rejected: data.filter(t => t.status === "Rejected").length,
          renewal: data.filter(t => t.status === "Renewal").length,
          word: data.filter(t => t.type === "word").length,
          logo: data.filter(t => t.type === "logo").length,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExport = () => {
    const csv = [
      ["Name", "Type", "App No", "Nice Class", "Status", "Country", "Filed"],
      ...trademarks.map(t => [t.name, t.type, t.application_number, t.class, t.status, t.country, new Date(t.created_at).toLocaleDateString()])
    ].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "trademark_portfolio.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const KPI_STATS = [
    { label: "Active Trademarks", value: stats.total, icon: ShieldCheck, color: "text-[#c9a84c]", bg: "bg-[#c9a84c]/10" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Renewal Due", value: stats.renewal, icon: RefreshCw, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  const byStatusData = [
    { name: "Approved", value: stats.approved, fill: "#10b981" },
    { name: "Pending", value: stats.pending, fill: "#3b82f6" },
    { name: "Rejected", value: stats.rejected, fill: "#ef4444" },
    { name: "Renewal", value: stats.renewal, fill: "#f59e0b" },
  ].filter(d => d.value > 0);

  const recentTrademarks = trademarks.slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
              <Link href={backLink}><ArrowLeft className="h-4 w-4 mr-1.5" />{backLabel}</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20">
              <Stamp className="h-6 w-6 text-[#c9a84c]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">Trademark Dashboard</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">Global brand registry, watchlists, and trademark protection</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`${basePath}/word`}>
            <Button variant="outline" size="sm" className="gap-2 border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/10 rounded-xl">
              <FileText className="h-4 w-4" /> Word Marks
            </Button>
          </Link>
          <Link href={`${basePath}/logo`}>
            <Button variant="outline" size="sm" className="gap-2 border-[#c9a84c]/30 text-[#c9a84c] hover:bg-[#c9a84c]/10 rounded-xl">
              <ImageIcon className="h-4 w-4" /> Logo Marks
            </Button>
          </Link>
          <Button size="sm" className="gap-2 bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold text-xs rounded-xl shadow-lg shadow-[#c9a84c]/10" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_STATS.map((s) => (
          <Card key={s.label} className="border-border/60 bg-card/60">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.bg}`}><s.icon className={`h-6 w-6 ${s.color}`} /></div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{s.label}</p>
                {loading ? <div className="h-8 w-16 bg-muted/50 rounded animate-pulse mt-1" /> : <p className={`text-3xl font-extrabold mt-0.5 ${s.color}`}>{s.value}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Quick Access */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`${basePath}/word`} className="block">
          <Card className="border-border/60 bg-card/60 hover:border-[#c9a84c]/40 hover:bg-[#c9a84c]/5 transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20">
                  <FileText className="h-6 w-6 text-[#c9a84c]" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Word Trademarks</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{loading ? "…" : stats.word} registered word marks</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#c9a84c] transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href={`${basePath}/logo`} className="block">
          <Card className="border-border/60 bg-card/60 hover:border-[#c9a84c]/40 hover:bg-[#c9a84c]/5 transition-all cursor-pointer group">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <ImageIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Logo Trademarks</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{loading ? "…" : stats.logo} registered logo marks</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground/80">Brand Abuse Infringements Blocked (2024)</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Phishing sites, domain squatting, and counterfeits resolved</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] pr-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PROTECTION_TIMELINE} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSquatting" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPhishing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a16" />
                <XAxis dataKey="month" stroke="#7a7460" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#7a7460" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="squatting" stroke="#c9a84c" fill="url(#gSquatting)" strokeWidth={2} name="Domain Squatting" />
                <Area type="monotone" dataKey="phishing" stroke="#3b82f6" fill="url(#gPhishing)" strokeWidth={2} name="Phishing Sites" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-foreground/80">Status Distribution</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Live data from your trademark portfolio</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            {byStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {byStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-12 w-12 opacity-20" />
                <p className="text-xs">No data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trademark Table + Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border/20 px-6 py-4">
            <div>
              <CardTitle className="text-sm font-bold text-foreground/80">Registered Trademarks</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Brand assets protected internationally</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{trademarks.length} active marks</span>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <LoadingState message="Loading trademarks..." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/5">
                      {["Brand Asset", "Type", "Nice Class", "Status", "Country", "Filed"].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {recentTrademarks.map(t => {
                      const s = STATUS_CONFIG[t.status] || STATUS_CONFIG["Pending"];
                      return (
                        <tr key={t.id} className="hover:bg-muted/5 transition-colors group">
                          <td className="px-5 py-4 font-bold text-foreground group-hover:text-[#c9a84c] transition-colors">{t.name}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.type === "word" ? "border-[#c9a84c]/30 text-[#c9a84c] bg-[#c9a84c]/10" : "border-purple-500/30 text-purple-400 bg-purple-500/10"}`}>
                              {t.type === "word" ? <FileText className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                              {t.type}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-muted-foreground">{t.class || "—"}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${s.color}`}>
                              <s.icon className="h-3 w-3 shrink-0" />{s.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">{t.country || "—"}</td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                    {trademarks.length === 0 && (
                      <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">No trademarks found. Add one from the Word or Logo modules.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader className="pb-2 border-b border-border/20 px-6 py-4">
            <CardTitle className="text-sm font-bold text-foreground/80">Brand Protection Watch</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Recently intercepted domain and copycat threats</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-6 space-y-4">
            {BRAND_ALERTS.map(alert => (
              <div key={alert.id} className="p-3.5 rounded-xl border border-border/20 bg-muted/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{alert.type}</span>
                  <Badge variant="outline" className={alert.risk === "high" ? "border-red-500/30 bg-red-500/10 text-red-400 font-bold text-[9px] uppercase tracking-wider" : "border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold text-[9px] uppercase tracking-wider"}>
                    {alert.risk} risk
                  </Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-mono text-muted-foreground truncate">{alert.target}</p>
                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{alert.status}</span>
                    <span className="text-muted-foreground/60">{alert.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
