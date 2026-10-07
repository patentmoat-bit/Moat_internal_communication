"use client";

import * as React from "react";
import Link from "next/link";
import {
  Flame,
  ShieldAlert,
  Cpu,
  FileCode,
  Shield,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Eye,
  CheckCircle,
  RotateCcw,
  Zap,
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

const STAGE_ICONS: Record<LifecycleStage, React.ComponentType<{ className?: string }>> = {
  CAPTURE: Flame,
  PROVE: ShieldAlert,
  ARCHITECT: Cpu,
  CLAIM: FileCode,
  PROTECT: Shield,
  COMPOUND: Sparkles,
};

export default function CEOPipelinePage() {
  const [matters, setMatters] = React.useState<CeoMatter[]>([]);
  const [evidenceMatter, setEvidenceMatter] = React.useState<CeoMatter | null>(null);
  const [alert, setAlert] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMatters(getInitialMatters());
  }, []);

  const advanceStage = (id: string) => {
    const updated = matters.map((m) => {
      if (m.id === id) {
        const currIdx = LIFECYCLE_STAGES.findIndex((s) => s.key === m.stage);
        if (currIdx < LIFECYCLE_STAGES.length - 1) {
          const nextStage = LIFECYCLE_STAGES[currIdx + 1].key;
          return {
            ...m,
            stage: nextStage,
            next_action: `Advanced to ${LIFECYCLE_STAGES[currIdx + 1].label} stage by CEO.`,
          };
        }
      }
      return m;
    });
    setMatters(updated);
    saveMatters(updated);
    setAlert("Stage Gate cleared: Matter advanced to next lifecycle stage.");
    setTimeout(() => setAlert(null), 4000);
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-6 md:p-8 space-y-6">
      {/* Top Banner */}
      {alert && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="size-4 text-emerald-600" />
          <span>{alert}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/portfolio"
              className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Executive Portfolio</span>
            </Link>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
            Executive Innovation Pipeline Kanban
          </h1>
          <p className="text-xs text-muted">
            End-to-End Governance: Capture &rarr; Prove &rarr; Architect &rarr; Claim &rarr; Protect &rarr; Compound
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-surface border border-line px-3 py-1.5 text-xs font-semibold text-ink shadow-xs">
            Total Pipeline Volume: <strong>{matters.length} Matters</strong>
          </span>
        </div>
      </div>

      {/* 6-Column Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="grid grid-flow-col auto-cols-[300px] gap-4 min-h-[600px]">
          {LIFECYCLE_STAGES.map((st, idx) => {
            const Icon = STAGE_ICONS[st.key];
            const stageMatters = matters.filter((m) => m.stage === st.key);

            return (
              <div
                key={st.key}
                className="flex flex-col rounded-2xl border border-line bg-surface/40 p-3.5 shadow-xs"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-accent/10 text-accent font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-ink">{st.label}</div>
                      <div className="text-[10px] text-faint truncate max-w-[170px]">{st.shortDesc}</div>
                    </div>
                  </div>
                  <span className="flex size-5 items-center justify-center rounded-full bg-line text-[11px] font-bold text-muted">
                    {stageMatters.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {stageMatters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-muted border border-dashed border-line rounded-xl">
                      <Icon className="size-6 text-faint mb-1 opacity-30" />
                      <span className="text-[11px] font-medium">No matters in stage</span>
                    </div>
                  ) : (
                    stageMatters.map((matter) => (
                      <div
                        key={matter.id}
                        className="rounded-xl border border-line bg-canvas p-3.5 space-y-2.5 shadow-xs hover:border-line-strong transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] font-bold text-accent">
                            {matter.matter_ref}
                          </span>
                          <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-600">
                            {matter.novelty_score}%
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-ink line-clamp-2">
                          {matter.title}
                        </h3>

                        <div className="text-[11px] text-muted space-y-0.5 border-t border-line/60 pt-2">
                          <div className="flex items-center justify-between">
                            <span>Lead:</span>
                            <strong className="text-ink font-normal">{matter.lead_inventor}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Est. Cost:</span>
                            <strong className="text-ink font-mono font-normal">
                              ${matter.est_filing_cost.toLocaleString()}
                            </strong>
                          </div>
                        </div>

                        <p className="text-[11px] text-faint line-clamp-2 italic">
                          "{matter.conclusion}"
                        </p>

                        <div className="flex items-center justify-between pt-1 gap-1">
                          <button
                            onClick={() => setEvidenceMatter(matter)}
                            className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                          >
                            <Eye className="size-3" />
                            <span>Why?</span>
                          </button>

                          {idx < LIFECYCLE_STAGES.length - 1 && (
                            <button
                              onClick={() => advanceStage(matter.id)}
                              className="flex items-center gap-1 rounded bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent hover:bg-accent/20 transition"
                            >
                              <span>Advance</span>
                              <ArrowRight className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EvidenceModal matter={evidenceMatter} onClose={() => setEvidenceMatter(null)} />
    </div>
  );
}
