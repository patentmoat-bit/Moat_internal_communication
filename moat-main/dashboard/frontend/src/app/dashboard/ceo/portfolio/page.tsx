"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Filter, Upload,
  FileText, CheckCircle2, Clock, AlertCircle, BarChart3, Globe, Plus, Trash2, Edit
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  granted: { label: "Granted", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  pending: { label: "Pending", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: Clock },
  "at-risk": { label: "At Risk", color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: AlertCircle },
  draft: { label: "Draft", color: "bg-slate-500/15 text-slate-400 border-slate-500/30", icon: FileText },
  expired: { label: "Expired", color: "bg-zinc-700/30 text-zinc-500 border-zinc-600/30", icon: FileText },
};

const TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg, #ffffff)",
  borderColor: "var(--tooltip-border, #e2e8f0)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--tooltip-text, #1e293b)",
};

export default function PortfolioPage() {
  const [patents, setPatents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [timeline, setTimeline] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [page, filterStatus, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio?page=${page}&limit=10&status=${filterStatus}&query=${search}`);
      const json = await res.json();
      if (json.data) setPatents(json.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/portfolio/stats`);
      const json = await res.json();
      if (json.stats) {
        setStats(json.stats);
        setTimeline(json.timeline || []);
        setCategories(json.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Patent ID", "Title", "Category", "Status", "Filed", "Region"],
      ...patents.map((p) => [p.patent_number, `"${p.title}"`, p.patent_metadata?.category || "", p.status, p.filing_date, p.region]),
    ].map((r) => r.join(",")).join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patent_portfolio.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const PIE_DATA = [
    { name: "Granted", value: stats.granted || 0, color: "#10b981" },
    { name: "Pending", value: stats.pending || 0, color: "#3b82f6" },
    { name: "At Risk", value: stats.atRisk || 0, color: "#f43f5e" },
  ].filter(d => d.value > 0);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
              <Link href="/dashboard/ceo"><ArrowLeft className="h-4 w-4 mr-1" />Back to CEO Workspace</Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#c9a84c]/10">
              <BarChart3 className="h-6 w-6 text-[#c9a84c]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Patent Portfolio</h1>
              <p className="text-sm text-muted-foreground">Complete lifecycle view · Live Data</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 border-border/70">
            <Filter className="h-4 w-4" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-2 border-border/70">
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button size="sm" className="gap-2 bg-[#c9a84c] hover:bg-[#b8943d] text-black font-semibold" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Patents", value: stats.total || 0, icon: FileText, color: "text-[#c9a84c]", bg: "bg-[#c9a84c]/10" },
          { label: "Granted", value: stats.granted || 0, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Pending", value: stats.pending || 0, icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
          { label: "At Risk", value: stats.atRisk || 0, icon: AlertCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" }
        ].map((s) => (
          <Card key={s.label} className="border-border/60 bg-card/90">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.bg}`}>
                <s.icon className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">{s.label}</p>
                <p className={`text-3xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline + Pie */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground/80">Patent Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] pr-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFiled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGranted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis dataKey="year" stroke="currentColor" strokeOpacity={0.4} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" strokeOpacity={0.4} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="filed" stroke="#c9a84c" fill="url(#gFiled)" strokeWidth={2} name="Filed" />
                <Area type="monotone" dataKey="granted" stroke="#10b981" fill="url(#gGranted)" strokeWidth={2} name="Granted" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground/80">Portfolio Status Mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px] flex items-center justify-center">
            {PIE_DATA.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {PIE_DATA.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patent Records Table */}
      <Card className="border-border/60 bg-card/90">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground/80">Patent Records</CardTitle>
          <div className="flex items-center gap-4">
            <select className="bg-background border border-border rounded px-2 py-1 text-xs" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="granted">Granted</option>
              <option value="pending">Pending</option>
              <option value="at-risk">At Risk</option>
            </select>
            <input 
              type="text" 
              placeholder="Search..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="bg-background border border-border rounded px-2 py-1 text-xs w-48"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/20">
                  {["Patent Number", "Title", "Category", "Status", "Filed", "Region", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {patents.map((p) => {
                  const s = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
                  return (
                    <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{p.patent_number}</td>
                      <td className="px-5 py-4 font-medium max-w-[260px]">
                        <span className="group-hover:text-[#c9a84c] transition-colors">{p.title}</span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="outline" className="border-border/50 text-xs">{p.patent_metadata?.category || "Unknown"}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.color}`}>
                          <s.icon className="h-3 w-3" />{s.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground text-xs">{p.filing_date}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />{p.region || "US"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-[#c9a84c]"><Edit className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {patents.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">No patents found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-border/40 flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
            <span className="text-xs text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={patents.length < 10}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
