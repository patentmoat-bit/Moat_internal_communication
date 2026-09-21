"use client";

import * as React from "react";
import {
  TrendingUp,
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
} from "lucide-react";

interface PendingApproval {
  id: string;
  matter_ref: string;
  title: string;
  lead_inventor: string;
  novelty_score: number;
  est_filing_cost: number;
  risk_level: "LOW" | "MODERATE" | "HIGH";
  submitted_date: string;
}

export default function CEOExecutiveDashboard() {
  const [approvals, setApprovals] = React.useState<PendingApproval[]>([]);
  const [processedIds, setProcessedIds] = React.useState<Record<string, "APPROVED" | "REWORK">>({});
  const [actionAlert, setActionAlert] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("moat_ceo_approvals");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setApprovals(parsed);
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleDecision = (id: string, decision: "APPROVED" | "REWORK") => {
    setProcessedIds((prev) => ({ ...prev, [id]: decision }));
    const item = approvals.find((a) => a.id === id);
    const msg =
      decision === "APPROVED"
        ? `Approved ${item?.matter_ref} for USPTO filing and financial disbursement!`
        : `Requested revision for ${item?.matter_ref} with notes dispatched to Drafter.`;
    setActionAlert(msg);
    setTimeout(() => setActionAlert(null), 5000);
  };

  const pendingCount = approvals.filter((a) => !processedIds[a.id]).length;
  const avgNovelty =
    approvals.length > 0
      ? Math.round(approvals.reduce((acc, a) => acc + a.novelty_score, 0) / approvals.length)
      : 0;
  const totalBudget = approvals.reduce((acc, a) => acc + a.est_filing_cost, 0);

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-8 space-y-8">
      {/* Top Banner / Notification */}
      {actionAlert && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4" />
            <span>{actionAlert}</span>
          </div>
          <span className="text-[11px] opacity-75">Broadcasted via Real-Time WebSocket Bus</span>
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
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-sm">
            <Zap className="size-3.5 text-amber-500" />
            <span>Portfolio Status: <strong>{approvals.length > 0 ? "Active Queue" : "Clear"}</strong></span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total IP Matters</span>
            <Shield className="size-4 text-accent" />
          </div>
          <div className="text-3xl font-black text-ink">{approvals.length}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted font-medium">
            <span>Portfolio registry size</span>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Signoffs</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">
            {pendingCount}
          </div>
          <div className="text-[11px] text-muted">Requires executive filing signoff</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
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

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Filing Commitments</span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-ink">${totalBudget.toLocaleString()}</div>
          <div className="text-[11px] text-muted">Estimated official & counsel fees</div>
        </div>
      </div>

      {/* CEO 1-Click Approval Center */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Executive Filing Decision Queue</h2>
            <p className="text-xs text-muted">
              Review research outcomes, patentability scores, and approve matters for immediate USPTO submission.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted">
            {pendingCount} Decisions Remaining
          </span>
        </div>

        <div className="divide-y divide-line rounded-xl border border-line bg-canvas overflow-hidden">
          {approvals.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted">
              <FolderCheck className="size-10 text-faint mb-2 opacity-40" />
              <p className="text-xs font-semibold text-ink">No pending approvals in queue</p>
              <p className="text-[11px] text-muted mt-1 max-w-sm">
                When research matters and patent specifications reach the approval stage, they will appear here for executive review and statutory filing authorization.
              </p>
            </div>
          ) : (
            approvals.map((matter) => {
              const decision = processedIds[matter.id];
              return (
                <div key={matter.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
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
                    </div>

                    <h3 className="text-sm font-bold text-ink">{matter.title}</h3>

                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>Lead: {matter.lead_inventor}</span>
                      <span>·</span>
                      <span>Est. Cost: ${matter.est_filing_cost.toLocaleString()}</span>
                      <span>·</span>
                      <span>Submitted: {matter.submitted_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
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
    </div>
  );
}

