"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Flame,
  ShieldAlert,
  Cpu,
  FileCode,
  Shield,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  LIFECYCLE_STAGES,
  LifecycleStage,
  CeoMatter,
} from "@/lib/ceoLifecycleTypes";
import {
  getInitialMatters,
  saveMatters,
} from "@/lib/ceoLifecycleSeed";
import { EvidenceModal } from "@/components/ceo/EvidenceModal";
import { DecisionDialog } from "@/components/ceo/DecisionDialog";

const STAGE_ICONS: Record<LifecycleStage, React.ComponentType<{ className?: string }>> = {
  CAPTURE: Flame,
  PROVE: ShieldAlert,
  ARCHITECT: Cpu,
  CLAIM: FileCode,
  PROTECT: Shield,
  COMPOUND: Sparkles,
};

export default function CEOLifecycleStagePage() {
  const params = useParams();
  const rawStage = (params?.stage as string)?.toUpperCase() as LifecycleStage;
  const stageInfo = LIFECYCLE_STAGES.find((s) => s.key === rawStage) || LIFECYCLE_STAGES[0];
  const stageKey = stageInfo.key;

  const [matters, setMatters] = React.useState<CeoMatter[]>([]);
  const [evidenceMatter, setEvidenceMatter] = React.useState<CeoMatter | null>(null);
  const [decisionMatter, setDecisionMatter] = React.useState<CeoMatter | null>(null);

  React.useEffect(() => {
    setMatters(getInitialMatters());
  }, []);

  const stageMatters = matters.filter((m) => m.stage === stageKey);
  const Icon = STAGE_ICONS[stageKey];

  const handleDecision = (
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
        } else if (decision === "REWORK") {
          newStatus = "REWORK_REQUESTED";
          nextAct = "Technical rework required.";
        }

        return {
          ...m,
          stage: nextStage,
          status: newStatus,
          next_action: nextAct,
        };
      }
      return m;
    });

    setMatters(updated);
    saveMatters(updated);
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-6 md:p-8 space-y-6">
      {/* Back Link */}
      <div>
        <Link
          href="/portfolio"
          className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Executive Portfolio</span>
        </Link>
      </div>

      {/* Stage Banner */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent shrink-0">
            <Icon className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-line px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                Stage {stageInfo.order} of 6
              </span>
              <span className="text-xs text-muted">Statutory Lifecycle Gate</span>
            </div>
            <h1 className="mt-1 text-2xl font-black text-ink">{stageInfo.label} Stage Governance</h1>
            <p className="text-xs text-muted mt-1 max-w-xl">{stageInfo.shortDesc}</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-canvas p-4 text-xs space-y-1.5 shrink-0 max-w-xs">
          <div className="font-bold text-ink flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-accent" />
            <span>Gating Requirement</span>
          </div>
          <div className="text-[11px] text-muted">{stageInfo.gatingRule}</div>
          <div className="text-[10px] text-faint border-t border-line/60 pt-1">
            Deliverable: <strong>{stageInfo.deliverable}</strong>
          </div>
        </div>
      </div>

      {/* Matters List in this Stage */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">
            Matters Pending in {stageInfo.label} ({stageMatters.length})
          </h2>
          <span className="text-xs text-muted">Executive Signoff Authority Required</span>
        </div>

        {stageMatters.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted border border-dashed border-line rounded-2xl bg-surface/30">
            <Icon className="size-8 text-faint mb-2 opacity-30" />
            <p className="text-xs font-semibold text-ink">No matters currently in {stageInfo.label}</p>
            <p className="text-[11px] text-muted mt-1 max-w-sm">
              When preceding stage criteria are fulfilled, matters advance here for executive review.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stageMatters.map((matter) => (
              <div
                key={matter.id}
                className="rounded-2xl border border-line bg-surface p-5 space-y-3 shadow-xs hover:border-line-strong transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEvidenceMatter(matter)}
                      className="flex items-center gap-1 rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-accent hover:border-accent transition"
                    >
                      <Eye className="size-3.5" />
                      <span>View Evidence Trace</span>
                    </button>

                    <button
                      onClick={() => setDecisionMatter(matter)}
                      className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:brightness-110 transition"
                    >
                      <Shield className="size-3.5" />
                      <span>CEO Decision</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-ink">{matter.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-xs">
                    <div className="p-3 rounded-xl border border-line bg-canvas">
                      <span className="text-[10px] font-bold uppercase text-muted block mb-1">
                        Conclusion
                      </span>
                      <p className="text-ink font-medium leading-relaxed">{matter.conclusion}</p>
                    </div>

                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 block mb-1">
                        Recommendation
                      </span>
                      <p className="text-ink font-medium leading-relaxed">{matter.recommendation}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-line/60 pt-2.5 text-xs text-muted">
                  <div>
                    Lead: <strong className="text-ink">{matter.lead_inventor}</strong> &middot; Est. Filing:{" "}
                    <strong className="text-ink">${matter.est_filing_cost.toLocaleString()}</strong>
                  </div>
                  <div>
                    Next Action: <strong className="text-ink">{matter.next_action}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EvidenceModal matter={evidenceMatter} onClose={() => setEvidenceMatter(null)} />
      <DecisionDialog
        matter={decisionMatter}
        onClose={() => setDecisionMatter(null)}
        onDecision={handleDecision}
      />
    </div>
  );
}
