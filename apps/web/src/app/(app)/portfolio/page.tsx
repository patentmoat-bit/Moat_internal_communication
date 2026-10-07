"use client";

import * as React from "react";
import Link from "next/link";
import {
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Building2,
  DollarSign,
  ArrowUpRight,
  Send,
  FileCheck,
  RotateCcw,
  Zap,
  FolderCheck,
  FileText,
  ChevronRight,
  Filter,
  Eye,
  CheckCheck,
  Flame,
  Cpu,
  Layers,
  HelpCircle,
  Newspaper,
} from "lucide-react";
import { LifecycleVisual } from "@/components/ceo/LifecycleVisual";
import { EvidenceModal } from "@/components/ceo/EvidenceModal";
import { DecisionDialog } from "@/components/ceo/DecisionDialog";
import {
  CeoMatter,
  LifecycleStage,
  LIFECYCLE_STAGES,
} from "@/lib/ceoLifecycleTypes";
import {
  getInitialMatters,
  saveMatters,
} from "@/lib/ceoLifecycleSeed";

export default function CEOExecutiveDashboard() {
  const [matters, setMatters] = React.useState<CeoMatter[]>([]);
  const [selectedStage, setSelectedStage] = React.useState<LifecycleStage | "ALL" | "APPROVALS">("ALL");
  const [evidenceMatter, setEvidenceMatter] = React.useState<CeoMatter | null>(null);
  const [decisionMatter, setDecisionMatter] = React.useState<CeoMatter | null>(null);
  const [actionAlert, setActionAlert] = React.useState<string | null>(null);
  const [processedIds, setProcessedIds] = React.useState<Record<string, "APPROVED" | "REWORK">>({});
  const [newsArticles, setNewsArticles] = React.useState<any[]>([]);
  const [newsStats, setNewsStats] = React.useState<{ high_impact_count: number; new_developments_count: number; competitor_events_count: number; regulatory_changes_count: number } | null>(null);

  // Initialize from backend API
  React.useEffect(() => {
    fetch("/api/ceo/lifecycle")
      .then(r => r.json())
      .then(d => {
        let loaded: CeoMatter[] = [];
        if (d && Array.isArray(d.items)) loaded = d.items;
        else if (Array.isArray(d)) loaded = d;
        setMatters(loaded);

        const processed: Record<string, "APPROVED" | "REWORK"> = {};
        loaded.forEach((m: any) => {
          if (m.status === "APPROVED" || m.status === "FILED") {
            processed[m.id] = "APPROVED";
          } else if (m.status === "REWORK_REQUESTED") {
            processed[m.id] = "REWORK";
          }
        });
        setProcessedIds(processed);
      })
      .catch(() => setMatters([]));

    // Fetch live news intelligence
    fetch("/api/ip-news?limit=3")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNewsArticles(data.articles || []);
          if (data.stats) setNewsStats(data.stats);
        }
      })
      .catch((e) => console.warn("Failed to load news for widget:", e));
  }, []);

  // Handle 1-click filing decision from queue
  const handleDecision = (id: string, decision: "APPROVED" | "REWORK") => {
    setProcessedIds((prev) => ({ ...prev, [id]: decision }));
    const updated = matters.map((m) => {
      if (m.id === id) {
        return {
          ...m,
          status: decision === "APPROVED" ? ("APPROVED" as const) : ("REWORK_REQUESTED" as const),
          next_action:
            decision === "APPROVED"
              ? "Official filing docket approved. Dispatched to counsel."
              : "Rework notes dispatched to Drafter.",
        };
      }
      return m;
    });

    setMatters(updated);
    saveMatters(updated);

    const item = matters.find((a) => a.id === id);
    const msg =
      decision === "APPROVED"
        ? `Approved ${item?.matter_ref} for USPTO filing and financial disbursement!`
        : `Requested revision for ${item?.matter_ref} with notes dispatched to Drafter.`;
    setActionAlert(msg);
    setTimeout(() => setActionAlert(null), 5000);
  };

  // Handle detailed modal decision
  const handleModalDecision = (
    matterId: string,
    decision: "APPROVED" | "REWORK" | "REJECTED" | "ESCALATED",
    rationale: string,
    statutoryAuthority: string
  ) => {
    const updated = matters.map((m) => {
      if (m.id === matterId) {
        let nextStage = m.stage;
        let newStatus = m.status;
        let nextAct = m.next_action;

        if (decision === "APPROVED") {
          const currIdx = LIFECYCLE_STAGES.findIndex((s) => s.key === m.stage);
          if (currIdx < LIFECYCLE_STAGES.length - 1) {
            nextStage = LIFECYCLE_STAGES[currIdx + 1].key;
            nextAct = `Advanced to ${LIFECYCLE_STAGES[currIdx + 1].label} stage.`;
          } else {
            newStatus = "FILED";
            nextAct = "Portfolio defensive moat locked.";
          }
          if (m.stage === "PROTECT") {
            newStatus = "APPROVED";
            setProcessedIds((prev) => ({ ...prev, [m.id]: "APPROVED" }));
          }
        } else if (decision === "REWORK") {
          newStatus = "REWORK_REQUESTED";
          nextAct = "Technical rework required.";
          setProcessedIds((prev) => ({ ...prev, [m.id]: "REWORK" }));
        } else if (decision === "REJECTED") {
          newStatus = "REJECTED";
          nextAct = "Matter archived.";
        }

        const newRecord = {
          id: `dec-${Date.now()}`,
          matterId: m.id,
          stage: m.stage,
          decision,
          rationale,
          statutoryAuthority,
          decidedBy: "Dr. Marcus Vance (CEO)",
          decidedAt: new Date().toISOString().split("T")[0],
          nextAction: nextAct,
        };

        return {
          ...m,
          stage: nextStage,
          status: newStatus,
          next_action: nextAct,
          decision_history: [newRecord, ...m.decision_history],
        };
      }
      return m;
    });

    setMatters(updated);
    saveMatters(updated);

    const item = matters.find((m) => m.id === matterId);
    setActionAlert(`Executive Decision recorded for ${item?.matter_ref}: ${decision}`);
    setTimeout(() => setActionAlert(null), 5000);
  };

  // Filing queue items (Protect stage matters)
  const filingQueue = matters.filter((m) => m.stage === "PROTECT");
  const pendingSignoffs = filingQueue.filter((a) => !processedIds[a.id]).length;

  // KPI Calculations
  const totalMatters = matters.length;
  const avgNovelty =
    totalMatters > 0
      ? Math.round(matters.reduce((acc, a) => acc + a.novelty_score, 0) / totalMatters)
      : 0;
  const totalBudget = matters.reduce((acc, a) => acc + a.est_filing_cost, 0);

  // Filtered matters
  const filteredMatters = matters.filter((m) => {
    if (selectedStage === "ALL") return true;
    if (selectedStage === "APPROVALS") return m.stage === "PROTECT";
    return m.stage === selectedStage;
  });

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-6 md:p-8 space-y-8">
      {/* Top Banner / Real-Time WebSocket Notification */}
      {actionAlert && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 shrink-0 text-emerald-600" />
            <span>{actionAlert}</span>
          </div>
          <span className="text-[11px] opacity-75 hidden sm:inline">
            Broadcasted via Real-Time Executive Event Stream
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
              Executive Suite
            </span>
            <span className="text-xs text-muted">CEO Oversight & Patent Filing Decision Center</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
            Strategic IP Portfolio & Approvals
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-xs">
            <Zap className="size-3.5 text-amber-500" />
            <span>
              Portfolio Status: <strong>{pendingSignoffs > 0 ? "Active Queue" : "Clear"}</strong>
            </span>
          </div>

          <Link
            href="/portfolio/opportunities"
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-600 hover:bg-purple-500/20 transition"
          >
            <Sparkles className="size-3.5" />
            <span>Opportunities Radar</span>
          </Link>
        </div>
      </div>

      {/* MOAT 6-Stage Lifecycle Visual Rail */}
      <LifecycleVisual
        matters={matters}
        selectedStage={selectedStage === "APPROVALS" ? "PROTECT" : selectedStage}
        onSelectStage={(st) => setSelectedStage(st)}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total IP Matters</span>
            <Shield className="size-4 text-accent" />
          </div>
          <div className="text-3xl font-black text-ink">{totalMatters}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted font-medium">
            <span>Portfolio registry size across 6 stages</span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Signoffs</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">{pendingSignoffs}</div>
          <div className="text-[11px] text-muted">Requires executive filing signoff</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Novelty Score</span>
            <Sparkles className="size-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-600">
            {avgNovelty > 0 ? `${avgNovelty}%` : "—"}
          </div>
          <div className="text-[11px] text-muted font-medium">
            {avgNovelty > 75 ? "Low 102/103 rejection risk" : "Assessment pending"}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Filing Commitments</span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-ink">${totalBudget.toLocaleString()}</div>
          <div className="text-[11px] text-muted">Estimated official & counsel fees</div>
        </div>
      </div>

      {/* IP News & Intelligence Executive Summary Widget */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-600">
                Global Executive Intelligence
              </span>
              <span className="text-xs text-muted">Authoritative Feeds: USPTO, WIPO, EPO, UK IPO</span>
            </div>
            <h2 className="mt-1 text-base font-bold text-ink flex items-center gap-2">
              <Newspaper className="size-4 text-accent" />
              <span>IP News & Intelligence Feed</span>
            </h2>
          </div>

          <Link
            href="/dashboard/ceo/news"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-accent hover:border-accent transition shadow-2xs"
          >
            <span>View All Intelligence</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>

        {/* Intelligence Category Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-between">
            <span className="text-xs text-muted font-medium">High Impact</span>
            <span className="text-sm font-black text-rose-600">{newsStats?.high_impact_count ?? 0}</span>
          </div>
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
            <span className="text-xs text-muted font-medium">New Developments</span>
            <span className="text-sm font-black text-amber-600">{newsStats?.new_developments_count ?? 0}</span>
          </div>
          <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Competitor Events</span>
            <span className="text-sm font-black text-purple-600">{newsStats?.competitor_events_count ?? 0}</span>
          </div>
          <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
            <span className="text-xs text-muted font-medium">Regulatory Changes</span>
            <span className="text-sm font-black text-blue-600">{newsStats?.regulatory_changes_count ?? 0}</span>
          </div>
        </div>

        {/* Latest Real Bulletins */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {newsArticles.slice(0, 3).map((item, idx) => (
            <Link
              key={item.id || idx}
              href={`/dashboard/ceo/news/${item.id}`}
              className="p-3.5 rounded-xl border border-line bg-canvas space-y-2 hover:border-accent transition shadow-2xs group flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-accent uppercase">{item.category || item.source_name}</span>
                  <span className="font-mono text-muted">{new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </div>
                <h4 className="text-xs font-bold text-ink group-hover:text-accent transition-colors line-clamp-2">
                  {item.title}
                </h4>
                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[10px]">
                <span className="text-faint">{item.source_name}</span>
                <span className="font-bold text-accent group-hover:underline flex items-center gap-0.5">
                  Read Intelligence &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CEO 1-Click Filing Decision Queue */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink">Executive Filing Decision Queue</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                1-Click Approvals
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Review research outcomes, patentability scores, and approve matters for immediate USPTO submission.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted">
            {pendingSignoffs} Decisions Remaining
          </span>
        </div>

        <div className="divide-y divide-line rounded-xl border border-line bg-canvas overflow-hidden">
          {filingQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted">
              <FolderCheck className="size-10 text-faint mb-2 opacity-40" />
              <p className="text-xs font-semibold text-ink">No pending approvals in queue</p>
              <p className="text-[11px] text-muted mt-1 max-w-sm">
                When research matters and patent specifications reach the Protect stage, they appear here for statutory filing authorization.
              </p>
            </div>
          ) : (
            filingQueue.map((matter) => {
              const decision = processedIds[matter.id];
              return (
                <div key={matter.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded bg-line px-2 py-0.5 font-mono text-xs font-bold text-ink">
                        {matter.matter_ref}
                      </span>
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                        Novelty: {matter.novelty_score}%
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          matter.risk_level === "LOW"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        Risk: {matter.risk_level}
                      </span>
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                        Confidence: {matter.confidence_score}%
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-ink">{matter.title}</h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span>Lead: {matter.lead_inventor}</span>
                      <span>&middot;</span>
                      <span>Est. Cost: ${matter.est_filing_cost.toLocaleString()}</span>
                      <span>&middot;</span>
                      <span>Submitted: {matter.submitted_date}</span>
                    </div>

                    <p className="text-xs text-muted leading-relaxed line-clamp-2 pt-1 font-medium">
                      {matter.conclusion}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setEvidenceMatter(matter)}
                      className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-accent hover:border-accent transition"
                    >
                      <Eye className="size-3.5" />
                      <span>Why?</span>
                    </button>

                    {decision ? (
                      <div
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold ${
                          decision === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
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
                        <button
                          onClick={() => handleDecision(matter.id, "REWORK")}
                          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted hover:border-line-strong hover:text-ink transition"
                        >
                          <RotateCcw className="size-3.5" />
                          Request Rework
                        </button>

                        <button
                          onClick={() => handleDecision(matter.id, "APPROVED")}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                        >
                          <FileCheck className="size-4" />
                          Approve & File
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Complete MOAT Stage Matters & Evidentiary Command View */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Invention Portfolio Decisions & Evidence Trace</h2>
            <p className="text-xs text-muted">
              Deep dive into reduction to practice, examiner counterarguments, and stage gating criteria.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setSelectedStage("ALL")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                selectedStage === "ALL"
                  ? "bg-ink text-canvas shadow-xs"
                  : "border border-line bg-canvas text-muted hover:text-ink"
              }`}
            >
              All ({matters.length})
            </button>
            {LIFECYCLE_STAGES.map((st) => (
              <button
                key={st.key}
                onClick={() => setSelectedStage(st.key)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  selectedStage === st.key
                    ? "bg-ink text-canvas shadow-xs"
                    : "border border-line bg-canvas text-muted hover:text-ink"
                }`}
              >
                {st.label} ({matters.filter((m) => m.stage === st.key).length})
              </button>
            ))}
          </div>
        </div>

        {/* Matters Cards */}
        <div className="grid grid-cols-1 gap-4">
          {filteredMatters.map((matter) => (
            <div
              key={matter.id}
              className="rounded-xl border border-line bg-canvas p-5 space-y-4 shadow-xs hover:border-line-strong transition"
            >
              {/* Matter Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                    {matter.matter_ref}
                  </span>
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-600">
                    Stage: {matter.stage}
                  </span>
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-bold text-purple-600">
                    Novelty: {matter.novelty_score}%
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      matter.risk_level === "LOW"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    Risk: {matter.risk_level}
                  </span>
                  <span className="text-xs text-faint">
                    Lead: <strong className="text-ink">{matter.lead_inventor}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-ink">
                    Est. ${matter.est_filing_cost.toLocaleString()}
                  </span>
                  <button
                    onClick={() => setEvidenceMatter(matter)}
                    className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-accent hover:border-accent transition"
                  >
                    <Eye className="size-3.5" />
                    <span>Evidence ("Why?")</span>
                  </button>
                  <button
                    onClick={() => setDecisionMatter(matter)}
                    className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1 text-xs font-bold text-white shadow-xs hover:brightness-110 transition"
                  >
                    <Shield className="size-3.5" />
                    <span>Decision</span>
                  </button>
                </div>
              </div>

              {/* Title & Evidentiary Conclusion */}
              <div>
                <h3 className="text-sm font-bold text-ink">{matter.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-xs">
                  <div className="p-3 rounded-lg border border-line bg-surface/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                      Conclusion
                    </span>
                    <p className="text-ink font-medium leading-relaxed">{matter.conclusion}</p>
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                      Action Recommendation
                    </span>
                    <p className="text-ink font-medium leading-relaxed">{matter.recommendation}</p>
                  </div>
                </div>
              </div>

              {/* Micro-Telemetry & Next Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-line/60 text-xs text-muted">
                <div className="flex items-center gap-3">
                  <span>Confidence: <strong className="text-ink">{matter.confidence_score}%</strong></span>
                  <span>&middot;</span>
                  <span>Evidence Points: <strong className="text-ink">{matter.evidence.length}</strong></span>
                  {matter.counterarguments.length > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>Counterarguments: <strong className="text-ink">{matter.counterarguments.length}</strong></span>
                    </>
                  )}
                </div>
                <div>
                  Next Action: <strong className="text-ink">{matter.next_action}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <EvidenceModal matter={evidenceMatter} onClose={() => setEvidenceMatter(null)} />
      <DecisionDialog
        matter={decisionMatter}
        onClose={() => setDecisionMatter(null)}
        onDecision={handleModalDecision}
      />
    </div>
  );
}
