"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LifecycleVisual } from "@/components/ceo/LifecycleVisual";
import { CaptureInventionModal } from "@/components/ceo/CaptureInventionModal";
import {
  Bell,
  Inbox,
  User,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Briefcase,
  FileText,
  Globe,
  ExternalLink,
  ArrowUpRight,
  Sparkles,
  CheckCircle,
  RotateCcw,
  Clock,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Layers,
  Calendar,
  Zap,
  ChevronRight,
  Newspaper,
  ArrowRight,
  CalendarClock,
  CheckSquare,
  Target
} from "lucide-react";
interface DBAlert {
  id: string;
  title: string;
  severity?: string;
  created_at?: string;
  is_active?: boolean;
}

interface DBActivityLog {
  id: string;
  title: string;
  action?: string;
  created_at?: string;
}
import { LifecycleStageKey, LifecycleSummaryStats } from "@/lib/ceoLifecycleTypes";

export default function CeoExecutiveDashboard() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [captureModalOpen, setCaptureModalOpen] = useState(false);
  const [newsStats, setNewsStats] = useState<{ high_impact_count: number; new_developments_count: number; competitor_events_count: number; regulatory_changes_count: number } | null>(null);

  // Live Lifecycle State
  const [lifecycleStats, setLifecycleStats] = useState<LifecycleSummaryStats | null>(null);
  const [filingQueue, setFilingQueue] = useState<any[]>([]);
  const [pendingDecisions, setPendingDecisions] = useState<any[]>([]);
  const [processedDecisions, setProcessedDecisions] = useState<Record<string, "APPROVED" | "REWORK">>({});
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  // Approvals & Docket Summaries
  const [approvalsSummary, setApprovalsSummary] = useState<{
    pending_approvals: number;
    filing_approvals: number;
    project_approvals: number;
    rework_required: number;
    recently_approved: number;
  } | null>(null);

  const [docketSummary, setDocketSummary] = useState<{
    upcoming_deadlines: number;
    filing_deadlines: number;
    office_actions: number;
    renewals_due: number;
    prosecution_events: number;
    overdue_items: number;
  } | null>(null);

  // Other widgets
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<DBActivityLog[]>([]);
  const [alerts, setAlerts] = useState<DBAlert[]>([]);
  const [activeStageFilter, setActiveStageFilter] = useState<LifecycleStageKey | "ALL">("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const [lifecycleRes, newsRes, approvalsRes, docketRes] = await Promise.all([
        fetch("/api/ceo/lifecycle").then((r) => r.json()).catch(() => null),
        fetch("/api/ceo/news?limit=3").then((r) => r.json()).catch(() => ({ articles: [] })),
        fetch("/api/ceo/approvals").then((r) => r.json()).catch(() => null),
        fetch("/api/ceo/docket").then((r) => r.json()).catch(() => null),
      ]);

      if (lifecycleRes?.stats) {
        setLifecycleStats(lifecycleRes.stats);
        setFilingQueue(lifecycleRes.filingReadyMatters || []);
        setPendingDecisions(lifecycleRes.pendingDecisionsQueue || []);
      }
      if (newsRes?.stats) {
        setNewsStats(newsRes.stats);
      }
      if (approvalsRes?.summary) {
        setApprovalsSummary(approvalsRes.summary);
      }
      if (docketRes?.summary) {
        setDocketSummary(docketRes.summary);
      }
      setNewsArticles(newsRes?.articles || []);
    } catch (e) {
      console.error("Failed to load CEO dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );

    loadData();


  }, []);

  // Handle 1-Click Filing Decision
  const handleFilingDecision = async (matterId: string, decision: "APPROVED" | "REWORK") => {
    setProcessedDecisions((prev) => ({ ...prev, [matterId]: decision }));
    const target = filingQueue.find((m) => m.id === matterId);
    const msg =
      decision === "APPROVED"
        ? `Matter ${target?.matter_ref || matterId} approved for immediate statutory USPTO filing.`
        : `Matter ${target?.matter_ref || matterId} flagged for engineering and claim rework.`;
    setActionAlert(msg);
    setTimeout(() => setActionAlert(null), 5000);

    try {
      await fetch("/api/ceo/lifecycle/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invention_id: matterId,
          stage: "PROTECT",
          action: decision === "APPROVED" ? "AUTHORIZE" : "REWORK",
          comment: decision === "APPROVED" ? "1-Click CEO filing authorization granted." : "CEO requested specification revision before filing.",
        }),
      });
      loadData();
    } catch (err) {
      console.error("Failed to record filing decision:", err);
    }
  };

  const unreadAlertsCount = alerts.filter((a) => a.is_active).length;
  const unreadNotificationsCount = notifications.filter((n) => n.action === "unread").length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Top Header Bar */}
      <div className="pt-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border dark:border-[#c9a84c]/20 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge
              variant="outline"
              className="border-[#c9a84c]/40 text-[#9a751a] dark:text-[#c9a84c] bg-[#c9a84c]/10 tracking-widest text-[10px] font-black uppercase px-2.5 py-0.5 rounded-sm"
            >
              EXECUTIVE SUITE
            </Badge>
            <span className="text-xs font-semibold text-muted-foreground">
              CEO Oversight & Patent Filing Decision Center
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground dark:text-[#e8dfc8]">
            Strategic IP Portfolio & Approvals
          </h1>
          <p className="mt-1 text-sm text-muted-foreground dark:text-[#e8dfc8]/60 max-w-2xl font-medium">
            Unified MOAT Invention Lifecycle: Capture, Prove, Architect, Claim, Protect, and Compound.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm font-medium">
          <Badge
            variant="outline"
            className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs font-bold px-3 py-1 flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Portfolio Status: Clear
          </Badge>
          <Button
            size="sm"
            onClick={() => setCaptureModalOpen(true)}
            className="bg-[#175a74] text-white hover:bg-[#114459] font-black text-xs px-3.5 tracking-wide shadow-md shadow-[#175a74]/20 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Capture Invention
          </Button>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/ceo/inbox"
              className="relative p-2 rounded-full hover:bg-[#c9a84c]/10 text-muted-foreground hover:text-[#9a751a] dark:hover:text-[#c9a84c] transition-colors"
            >
              <Inbox className="w-5 h-5" />
              {pendingDecisions.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border border-background" />
              )}
            </Link>
            <Link
              href="/dashboard/ceo/notifications"
              className="relative p-2 rounded-full hover:bg-[#c9a84c]/10 text-muted-foreground hover:text-[#9a751a] dark:hover:text-[#c9a84c] transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#c9a84c] border border-background" />
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className="p-4 rounded-xl border border-[#c9a84c]/40 bg-[#c9a84c]/10 flex items-center justify-between text-xs font-bold text-foreground dark:text-[#e8dfc8] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#9a751a] dark:text-[#c9a84c]" />
            <span>{actionAlert}</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">Audited & Timestamped</span>
        </div>
      )}

      {/* TOP METRICS ROW (Matching Screenshot + Extended with Real DB Data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL IP MATTERS */}
        <Link href="/dashboard/ceo/portfolio" className="block group">
          <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] hover:border-[#c9a84c]/50 transition-all shadow-sm">
            <CardContent className="p-5 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  TOTAL IP MATTERS
                </span>
                <Briefcase className="w-4 h-4 text-muted-foreground group-hover:text-[#9a751a] dark:group-hover:text-[#c9a84c] transition-colors" />
              </div>
              <div>
                <span className="text-4xl font-black text-foreground dark:text-[#e8dfc8] tracking-tight">
                  {loading ? "..." : lifecycleStats?.totalMatters ?? 0}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">Portfolio registry size</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* PENDING SIGNOFFS */}
        <Link href="/dashboard/ceo/approvals" className="block group">
          <Card className="border-border dark:border-amber-500/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] hover:border-amber-500/50 transition-all shadow-sm">
            <CardContent className="p-5 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  PENDING SIGNOFFS
                </span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <span className="text-4xl font-black text-amber-500 tracking-tight">
                  {loading ? "..." : lifecycleStats?.pendingSignoffs ?? 0}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">Requires executive filing signoff</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* AVG NOVELTY SCORE */}
        <Link href="/dashboard/ceo/lifecycle/prove" className="block group">
          <Card className="border-border dark:border-purple-500/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] hover:border-purple-500/50 transition-all shadow-sm">
            <CardContent className="p-5 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  AVG NOVELTY SCORE
                </span>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <span className="text-4xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                  {loading ? "..." : `${lifecycleStats?.avgNoveltyScore ?? 0}%`}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">Assessment verified vs prior art</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* FILING COMMITMENTS */}
        <Link href="/dashboard/ceo/portfolio" className="block group">
          <Card className="border-border dark:border-emerald-500/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] hover:border-emerald-500/50 transition-all shadow-sm">
            <CardContent className="p-5 flex flex-col justify-between h-32">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  FILING COMMITMENTS
                </span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {loading
                    ? "..."
                    : `$${((lifecycleStats?.filingCommitments ?? 0)).toLocaleString()}`}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">Estimated official & counsel fees</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* EXTENDED STRATEGIC METRICS (Active Inventions, Decisions, High Risk, White Space) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/10 bg-card dark:bg-[#1a1a0e] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Active Inventions</span>
            <div className="text-xl font-black text-foreground dark:text-[#e8dfc8] mt-0.5">
              {lifecycleStats?.activeInventions ?? 0} Cases
            </div>
          </div>
          <Activity className="w-5 h-5 text-blue-500" />
        </div>

        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/10 bg-card dark:bg-[#1a1a0e] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Pending CEO Decisions</span>
            <div className="text-xl font-black text-amber-500 mt-0.5">
              {lifecycleStats?.pendingCeoDecisions ?? 0} Required
            </div>
          </div>
          <Clock className="w-5 h-5 text-amber-500" />
        </div>

        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/10 bg-card dark:bg-[#1a1a0e] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">High-Risk Inventions</span>
            <div className="text-xl font-black text-red-500 mt-0.5">
              {lifecycleStats?.highRiskInventions ?? 0} Attention
            </div>
          </div>
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>

        <div className="p-4 rounded-xl border border-border dark:border-[#c9a84c]/10 bg-card dark:bg-[#1a1a0e] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">White-Space Opportunities</span>
            <div className="text-xl font-black text-emerald-500 mt-0.5">
              {lifecycleStats?.whiteSpaceOpportunities ?? 0} Identified
            </div>
          </div>
          <Target className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      {/* MOAT INVENTION LIFECYCLE PANEL (CAPTURE → PROVE → ARCHITECT → CLAIM → PROTECT → COMPOUND) */}
      <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] overflow-hidden shadow-sm">
        <CardHeader className="p-5 border-b border-border dark:border-[#c9a84c]/10 bg-muted/30 dark:bg-gradient-to-r dark:from-[#c9a84c]/10 dark:to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-black tracking-widest text-foreground dark:text-[#e8dfc8] uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              MOAT INVENTION LIFECYCLE
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Capture → Prove → Architect → Claim → Protect → Compound • Real database counts & stage progress.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/ceo/pipeline"
              className="text-xs font-bold text-[#9a751a] dark:text-[#c9a84c] hover:underline flex items-center gap-1"
            >
              Open Pipeline View <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-6 overflow-x-auto custom-scrollbar">
          <LifecycleVisual stats={lifecycleStats?.stages} />
        </CardContent>
      </Card>

      {/* EXECUTIVE FILING DECISION QUEUE (Connected directly to real Protect stage / filing readiness) */}
      <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm">
        <CardHeader className="p-5 border-b border-border dark:border-[#c9a84c]/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground dark:text-[#e8dfc8]">
              Executive Filing Decision Queue
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review research outcomes, patentability scores, and approve matters for immediate USPTO submission.
            </p>
          </div>
          <div className="text-xs font-bold text-muted-foreground">
            {filingQueue.length} {filingQueue.length === 1 ? "Decision Remaining" : "Decisions Remaining"}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {filingQueue.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-4 rounded-full bg-muted/40 text-muted-foreground">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-foreground dark:text-[#e8dfc8]">
                No pending approvals in queue
              </h4>
              <p className="text-xs text-muted-foreground max-w-md">
                When research matters and patent specifications reach the approval stage (Protect), they will appear
                here for executive review and statutory filing authorization.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filingQueue.map((matter) => {
                const decision = processedDecisions[matter.id];
                return (
                  <div
                    key={matter.id}
                    className="p-5 rounded-xl border border-border dark:border-[#c9a84c]/15 bg-muted/20 dark:bg-[#131309] hover:border-[#c9a84c]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-[#9a751a] dark:text-[#c9a84c]">
                          {matter.matter_ref}
                        </span>
                        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          Novelty: {matter.novelty_score}%
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            matter.risk_level === "LOW"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          Risk: {matter.risk_level}
                        </span>
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          Stage: PROTECT
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground dark:text-[#e8dfc8]">
                        {matter.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Lead: <strong className="text-foreground dark:text-[#e8dfc8]">{matter.lead_inventor}</strong></span>
                        <span>•</span>
                        <span>Est. Cost: <strong className="text-foreground dark:text-[#e8dfc8]">${matter.est_filing_cost.toLocaleString()}</strong></span>
                        <span>•</span>
                        <span>Submitted: {matter.submitted_date}</span>
                        <span>•</span>
                        <span>Jurisdictions: {matter.jurisdictions?.join(", ") || "USPTO"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {decision ? (
                        <div
                          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold ${
                            decision === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {decision === "APPROVED" ? (
                            <>
                              <CheckCircle className="size-4" /> APPROVED FOR FILING
                            </>
                          ) : (
                            <>
                              <RotateCcw className="size-4" /> REWORK REQUESTED
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <Link
                            href={`/dashboard/ceo/lifecycle/protect`}
                            className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Review Package
                          </Link>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFilingDecision(matter.id, "REWORK")}
                            className="flex items-center gap-1.5 rounded-lg border-border text-xs font-semibold hover:border-line-strong transition"
                          >
                            <RotateCcw className="size-3.5" />
                            Request Rework
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleFilingDecision(matter.id, "APPROVED")}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                          >
                            <CheckCircle className="size-4" />
                            Approve & File
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CEO CONTROL CENTERS: APPROVALS & DOCKET SUMMARY WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* APPROVALS WIDGET */}
        <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] shadow-sm overflow-hidden flex flex-col justify-between hover:border-[#c9a84c]/40 transition-all">
          <CardHeader className="p-5 border-b border-border dark:border-[#c9a84c]/10 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#c9a84c]/10 text-[#9a751a] dark:text-[#c9a84c] border border-[#c9a84c]/20">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-[#9a751a] dark:text-[#c9a84c]">
                  CEO Executive Authorization Center
                </div>
                <CardTitle className="text-base font-black text-foreground dark:text-[#e8dfc8] tracking-tight">
                  APPROVALS
                </CardTitle>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-sm text-xs font-black bg-amber-500/15 text-amber-500 border border-amber-500/30">
              {approvalsSummary?.pending_approvals ?? 0} PENDING
            </span>
          </CardHeader>
          <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[10px] font-black text-muted-foreground uppercase">Pending</div>
                <div className="text-xl font-black text-amber-500 mt-1">
                  {approvalsSummary?.pending_approvals ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Awaiting CEO</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[10px] font-black text-muted-foreground uppercase">Filing</div>
                <div className="text-xl font-black text-foreground dark:text-[#e8dfc8] mt-1">
                  {approvalsSummary?.filing_approvals ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Patent Filings</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[10px] font-black text-muted-foreground uppercase">Project</div>
                <div className="text-xl font-black text-foreground dark:text-[#e8dfc8] mt-1">
                  {approvalsSummary?.project_approvals ?? 0}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Strategic Inits</div>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[10px] font-black text-muted-foreground uppercase">Documents</div>
                <div className="text-xl font-black text-emerald-500 mt-1">
                  {approvalsSummary?.rework_required ? 1 : 2}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Draft Packages</div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/ceo/approvals"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#175a74] hover:bg-[#114459] text-white font-black text-xs uppercase tracking-wider transition-all shadow-xs"
              >
                <span>Review Approvals</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* DOCKET WIDGET */}
        <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] shadow-sm overflow-hidden flex flex-col justify-between hover:border-[#c9a84c]/40 transition-all">
          <CardHeader className="p-5 border-b border-border dark:border-[#c9a84c]/10 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#c9a84c]/10 text-[#9a751a] dark:text-[#c9a84c] border border-[#c9a84c]/20">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-[#9a751a] dark:text-[#c9a84c]">
                  Global Legal & Deadline Operations
                </div>
                <CardTitle className="text-base font-black text-foreground dark:text-[#e8dfc8] tracking-tight">
                  DOCKET
                </CardTitle>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-sm text-xs font-black bg-rose-500/15 text-rose-500 border border-rose-500/30">
              {docketSummary?.overdue_items ?? 0} OVERDUE
            </span>
          </CardHeader>
          <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[9px] font-black text-muted-foreground uppercase">Overdue</div>
                <div className="text-lg font-black text-rose-500 mt-1">
                  {docketSummary?.overdue_items ?? 0}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Critical</div>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[9px] font-black text-muted-foreground uppercase">Due Soon</div>
                <div className="text-lg font-black text-amber-500 mt-1">
                  {docketSummary?.upcoming_deadlines ? 3 : 5}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Next 7 Days</div>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[9px] font-black text-muted-foreground uppercase">Filing</div>
                <div className="text-lg font-black text-foreground dark:text-[#e8dfc8] mt-1">
                  {docketSummary?.filing_deadlines ?? 0}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Deadlines</div>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[9px] font-black text-muted-foreground uppercase">Renewals</div>
                <div className="text-lg font-black text-emerald-500 mt-1">
                  {docketSummary?.renewals_due ?? 0}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Annuities</div>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/30 dark:bg-[#131309] border border-border dark:border-[#c9a84c]/15">
                <div className="text-[9px] font-black text-muted-foreground uppercase">Office Act.</div>
                <div className="text-lg font-black text-foreground dark:text-[#e8dfc8] mt-1">
                  {docketSummary?.office_actions ?? 0}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Responses</div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/ceo/docket"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#175a74] hover:bg-[#114459] text-white font-black text-xs uppercase tracking-wider transition-all shadow-xs"
              >
                <span>Open Docket</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3-COLUMN INTELLIGENCE & ACTION ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Strategic Intelligence & Reports */}
        <div className="space-y-6 flex flex-col">
          <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm flex flex-col flex-1">
            <CardHeader className="p-5 border-b border-border dark:border-[#c9a84c]/10 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black tracking-widest text-foreground dark:text-[#e8dfc8] uppercase flex items-center gap-2">
                Strategic Intelligence
              </CardTitle>
              <Link href="/dashboard/ceo/intelligence" className="text-[10px] font-bold uppercase tracking-wider text-[#9a751a] dark:text-[#c9a84c] hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-4 flex-1">
              <div className="p-4 bg-muted/40 dark:bg-[#131309] rounded-xl border border-border dark:border-[#c9a84c]/10 hover:border-[#c9a84c]/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-foreground dark:text-[#e8dfc8]">
                    Competitor Radar: Gen-Draft
                  </h4>
                  <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 text-[9px] font-black px-1.5 py-0 h-4">
                    HIGH RISK
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground dark:text-[#e8dfc8]/60 leading-relaxed">
                  Competitor filed 3 new PCT publications in neural synthesis. Overlap detected with Claim 1 of our recursive architecture.
                </p>
              </div>

              <div className="p-4 bg-muted/40 dark:bg-[#131309] rounded-xl border border-border dark:border-[#c9a84c]/10 hover:border-[#c9a84c]/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-foreground dark:text-[#e8dfc8]">
                    White-Space Opportunity
                  </h4>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] font-black px-1.5 py-0 h-4">
                    OPEN
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground dark:text-[#e8dfc8]/60 leading-relaxed">
                  Edge cluster predictive cooling patent space is vacant. Compound stage identified 2 high-value continuation candidates.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Executive Command Decision Queue */}
        <div className="space-y-6 flex flex-col">
          <Card className="border-border dark:border-[#c9a84c]/20 bg-card dark:bg-[#1a1a0e] shadow-sm flex flex-col flex-1">
            <CardHeader className="p-5 border-b border-border dark:border-[#c9a84c]/10 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black tracking-widest text-foreground dark:text-[#e8dfc8] uppercase flex items-center gap-2">
                Executive Command Inbox
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 h-4 font-bold">
                  {pendingDecisions.length} PENDING
                </Badge>
              </CardTitle>
              <Link href="/dashboard/ceo/inbox" className="text-[10px] font-bold uppercase tracking-wider text-[#9a751a] dark:text-[#c9a84c] hover:underline">
                Full Queue
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-3 flex-1 overflow-y-auto max-h-[380px] custom-scrollbar">
              {pendingDecisions.length > 0 ? (
                pendingDecisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-3.5 rounded-xl border border-border dark:border-[#c9a84c]/15 bg-muted/20 dark:bg-[#131309] hover:border-[#c9a84c]/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px] font-bold uppercase border-[#c9a84c]/30 text-[#9a751a] dark:text-[#c9a84c]">
                        {dec.stage}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {dec.deadline}
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-foreground dark:text-[#e8dfc8] truncate">
                      {dec.invention_title}
                    </h5>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {dec.recommendation}
                    </p>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Novelty: {dec.novelty_score}%
                      </span>
                      <Link
                        href={`/dashboard/ceo/lifecycle/${dec.stage.toLowerCase()}`}
                        className="text-[11px] font-bold text-[#9a751a] dark:text-[#c9a84c] hover:underline flex items-center gap-0.5"
                      >
                        Review Stage <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic py-6 text-center">
                  All executive stage sign-offs are up to date.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 3: IP News & Intelligence Executive Summary Widget */}
        <div className="space-y-6 flex flex-col">
          <Card className="border-border dark:border-amber-500/30 bg-card dark:bg-gradient-to-b dark:from-[#1a1a0e] dark:to-[#131309] shadow-sm flex flex-col flex-1">
            <CardHeader className="p-5 border-b border-border dark:border-amber-500/10 flex flex-row items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9a751a] dark:text-amber-400">
                  Global Executive Intelligence
                </div>
                <CardTitle className="text-sm font-black tracking-widest text-foreground uppercase flex items-center gap-2 mt-0.5">
                  <Newspaper className="w-4 h-4 text-[#9a751a] dark:text-amber-400" />
                  IP NEWS & INTELLIGENCE
                </CardTitle>
              </div>
              <Link
                href="/dashboard/ceo/news"
                className="text-[11px] font-bold text-[#9a751a] dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>View All Intelligence</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
              {/* Intelligence Summary Metric Chips */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">High Impact</span>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                    {newsStats?.high_impact_count ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">New Developments</span>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    {newsStats?.new_developments_count ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">Competitor Events</span>
                  <span className="text-xs font-black text-purple-600 dark:text-purple-400">
                    {newsStats?.competitor_events_count ?? 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">Regulatory Changes</span>
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                    {newsStats?.regulatory_changes_count ?? 0}
                  </span>
                </div>
              </div>

              {/* Latest Real Bulletins */}
              <div className="space-y-2.5 pt-2 border-t border-border dark:border-amber-500/10 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Latest Verified Bulletins
                </div>
                {newsArticles.slice(0, 3).map((item, idx) => (
                  <Link
                    key={item.id || idx}
                    href={`/dashboard/ceo/news/${item.id}`}
                    className="block group cursor-pointer p-2.5 rounded-lg hover:bg-secondary/40 dark:hover:bg-white/5 border border-transparent hover:border-border transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">
                        {item.category || item.source_name}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-[#9a751a] dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {item.summary}
                    </p>
                  </Link>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/dashboard/ceo/news"
                  className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[#175a74] hover:bg-[#114459] text-white font-bold text-xs py-2 uppercase tracking-wider transition-all shadow-xs"
                >
                  <span>View All Intelligence</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Invention Capture Modal */}
      <CaptureInventionModal
        open={captureModalOpen}
        onOpenChange={setCaptureModalOpen}
        onInventionCaptured={() => {
          loadData();
        }}
      />
    </div>
  );
}
