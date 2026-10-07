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
} from "lucide-react";
import { LIFECYCLE_STAGES, LifecycleStage, CeoMatter } from "@/lib/ceoLifecycleTypes";

const STAGE_ICONS: Record<LifecycleStage, React.ComponentType<{ className?: string }>> = {
  CAPTURE: Flame,
  PROVE: ShieldAlert,
  ARCHITECT: Cpu,
  CLAIM: FileCode,
  PROTECT: Shield,
  COMPOUND: Sparkles,
};

interface LifecycleVisualProps {
  matters?: CeoMatter[];
  stats?: any;
  selectedStage?: LifecycleStage | "ALL";
  onSelectStage?: (stage: LifecycleStage | "ALL") => void;
  interactiveLinks?: boolean;
}

export function LifecycleVisual({
  matters = [],
  stats,
  selectedStage = "ALL",
  onSelectStage,
  interactiveLinks = true,
}: LifecycleVisualProps) {
  const getStageCount = (stage: LifecycleStage) => {
    if (stats) {
      const s = stats[stage];
      if (typeof s === "number") return s;
      if (s?.count !== undefined) return s.count;
      if (s?.total !== undefined) return s.total;
    }
    if (Array.isArray(matters)) {
      return matters.filter((m) => m?.stage === stage).length;
    }
    return 0;
  };

  const totalCount = Array.isArray(matters) && matters.length > 0
    ? matters.length
    : LIFECYCLE_STAGES.reduce((acc, st) => acc + getStageCount(st.key), 0);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#175a74] dark:text-[#38bdf8] bg-[#175a74]/10 px-2 py-0.5 rounded">
              MOAT IP Lifecycle
            </span>
            <span className="text-xs text-muted">Continuous Invention Decision Pipeline</span>
          </div>
          <h2 className="text-sm font-bold text-ink mt-0.5">
            Stage Gates: Capture &rarr; Prove &rarr; Architect &rarr; Claim &rarr; Protect &rarr; Compound
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onSelectStage && (
            <button
              onClick={() => onSelectStage("ALL")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedStage === "ALL"
                  ? "bg-[#175a74] text-white shadow-xs"
                  : "border border-line bg-canvas text-muted hover:text-ink"
              }`}
            >
              Show All ({totalCount})
            </button>
          )}
          <Link
            href="/portfolio/pipeline"
            className="flex items-center gap-1 text-xs font-bold text-[#175a74] dark:text-[#38bdf8] hover:underline"
          >
            <span>Kanban Pipeline</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* Lifecycle Horizontal Rail */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {LIFECYCLE_STAGES.map((st, idx) => {
          const Icon = STAGE_ICONS[st.key];
          const count = getStageCount(st.key);
          const isSelected = selectedStage === st.key;

          const CardBody = (
            <div
              className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition cursor-pointer text-left h-full ${
                isSelected
                  ? "border-[#175a74] bg-[#175a74]/10 shadow-sm ring-1 ring-[#175a74]/40"
                  : "border-line bg-canvas hover:border-line-strong hover:bg-hover"
              }`}
              onClick={() => onSelectStage && onSelectStage(st.key)}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="flex size-5 items-center justify-center rounded-full bg-line text-[10px] font-bold text-muted">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-ink">{st.label}</span>
                </div>
                <div
                  className={`flex size-6 items-center justify-center rounded-lg ${
                    count > 0 ? "bg-[#175a74]/10 text-[#175a74] dark:text-[#38bdf8]" : "bg-line/40 text-faint"
                  }`}
                >
                  <Icon className="size-3.5" />
                </div>
              </div>

              {/* Matters Count & Badge */}
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-lg font-black text-ink">{count}</div>
                  <div className="text-[10px] text-muted truncate">{count === 1 ? "1 Matter" : `${count} Matters`}</div>
                </div>

                {st.key === "PROTECT" && count > 0 && (
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                    Filing Ready
                  </span>
                )}
                {st.key === "COMPOUND" && (
                  <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">
                    White Space
                  </span>
                )}
              </div>

              {/* Subtitle / deliverable */}
              <div className="mt-2 text-[10px] text-faint border-t border-line/60 pt-2 truncate">
                {st.deliverable}
              </div>
            </div>
          );

          return (
            <div key={st.key} className="relative group">
              {CardBody}
            </div>
          );
        })}
      </div>
    </div>
  );
}
