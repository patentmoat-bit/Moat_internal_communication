"use client";
import Link from "next/link";
import { Bell, Search, Bookmark, FileText, Clock, ArrowRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function timeAgo(ts: string) {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// --- Recent Alerts ---
interface AlertItem { id: string; name: string; type: string; matchesCount: number; lastCheck: string; active: boolean; }
export function RecentAlerts({ alerts }: { alerts: AlertItem[] }) {
  const typeColor: Record<string, string> = {
    keyword: "bg-blue-500/15 text-blue-600",
    competitor: "bg-[#c9a84c]/15 text-[#b8921e]",
    citation: "bg-amber-500/15 text-amber-600",
    ipc: "bg-teal-500/15 text-teal-600",
  };
  if (!alerts.length) return (
    <div className="flex flex-col items-center py-10 text-center gap-2">
      <Bell className="h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">No active alerts yet.</p>
      <Button size="sm" variant="outline" asChild><Link href="/dashboard/alerts">Create Alert</Link></Button>
    </div>
  );
  return (
    <div className="space-y-2">
      {alerts.slice(0, 5).map(alert => (
        <Link key={alert.id} href="/dashboard/alerts" className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/40 transition-colors group">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className={`h-2 w-2 rounded-full shrink-0 ${alert.active ? "bg-amber-500" : "bg-muted-foreground"}`} />
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{alert.name}</p>
              <p className="text-[11px] text-muted-foreground">{alert.matchesCount} matches · {timeAgo(alert.lastCheck || new Date().toISOString())}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`text-[10px] px-1.5 py-0 border-0 ${typeColor[alert.type] || "bg-gray-500/15 text-gray-600"}`}>{alert.type}</Badge>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
        </Link>
      ))}
      <div className="pt-1">
        <Link href="/dashboard/alerts" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
          View all alerts <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// --- Recent Searches ---
interface SearchItem { id: string; query: string; type: string; timestamp: string; }
export function RecentSearches({ searches }: { searches: SearchItem[] }) {
  if (!searches.length) return (
    <div className="flex flex-col items-center py-10 text-center gap-2">
      <Search className="h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">No searches yet.</p>
      <Button size="sm" variant="outline" asChild><Link href="/dashboard/search">Start Searching</Link></Button>
    </div>
  );
  return (
    <div className="space-y-2">
      {searches.slice(0, 5).map(s => (
        <Link key={s.id} href={`/dashboard/search?q=${encodeURIComponent(s.query)}`}
          className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate max-w-[180px]">{s.query}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.type}</Badge>
            <span className="text-[10px] text-muted-foreground">{timeAgo(s.timestamp)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// --- Recent Saved Patents ---
interface PatentItem { id: string; patentNumber: string; title: string; assignee: string; date: string; ipc: string[]; }
export function RecentSavedPatents({ patents }: { patents: PatentItem[] }) {
  if (!patents.length) return (
    <div className="flex flex-col items-center py-10 text-center gap-2">
      <Bookmark className="h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">No saved patents yet.</p>
      <Button size="sm" variant="outline" asChild><Link href="/dashboard/search">Explore Patents</Link></Button>
    </div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {patents.slice(0, 4).map(p => (
        <Link key={p.id} href={`/dashboard/search?patentId=${p.id}`}
          className="rounded-lg border border-border/60 p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
          <p className="text-xs font-bold text-primary">{p.patentNumber}</p>
          <p className="text-sm font-semibold mt-1 line-clamp-2 leading-tight">{p.title}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{p.assignee} · {p.date}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {p.ipc.slice(0, 2).map(code => (
              <Badge key={code} variant="secondary" className="text-[9px] px-1 py-0 font-normal">{code}</Badge>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}

// --- Recent Reports ---
interface ReportItem { id: string; title: string; type: string; createdAt: string; }
const MOCK_REPORTS: ReportItem[] = [
  { id: "r1", title: "AI Patent Landscape Q2 2025", type: "Landscape", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "r2", title: "Semiconductor Prior Art Report", type: "Prior Art", createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: "r3", title: "Competitor Analysis – Samsung", type: "Competitor", createdAt: new Date(Date.now() - 172800000).toISOString() },
];
export function RecentReports() {
  return (
    <div className="space-y-2">
      {MOCK_REPORTS.map(r => (
        <Link key={r.id} href="/dashboard/reports"
          className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="rounded-md bg-orange-500/10 p-1.5 shrink-0">
              <FileText className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{r.title}</p>
              <p className="text-[11px] text-muted-foreground">{timeAgo(r.createdAt)}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{r.type}</Badge>
        </Link>
      ))}
      <Link href="/dashboard/reports" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium pt-1">
        View all reports <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// --- Activity Feed ---
interface ActivityItem { id: string; type: string; description: string; timestamp: string; }
const typeConfig: Record<string, { color: string; dot: string }> = {
  search: { color: "text-blue-500", dot: "bg-blue-500" },
  save: { color: "text-amber-500", dot: "bg-amber-500" },
  collect: { color: "text-[#c9a84c]", dot: "bg-[#c9a84c]" },
  report: { color: "text-orange-500", dot: "bg-orange-500" },
};
export function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  if (!activities.length) return (
    <div className="flex flex-col items-center py-10 text-center gap-2">
      <Clock className="h-9 w-9 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">No recent activity. Start searching!</p>
    </div>
  );
  return (
    <div className="relative border-l border-border ml-2 pl-4 space-y-5 py-2">
      {activities.slice(0, 8).map(a => {
        const cfg = typeConfig[a.type] || { color: "text-gray-500", dot: "bg-gray-400" };
        return (
          <div key={a.id} className="relative">
            <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background ${cfg.dot}`} />
            <p className="text-sm font-medium leading-snug">{a.description}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(a.timestamp)}</p>
          </div>
        );
      })}
    </div>
  );
}
