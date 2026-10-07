"use client";

import * as React from "react";
import {
  X,
  FileCheck,
  RotateCcw,
  Ban,
  AlertOctagon,
  Shield,
  Send,
  Sparkles,
} from "lucide-react";
import { CeoMatter, DecisionRecord, LifecycleStage, LIFECYCLE_STAGES } from "@/lib/ceoLifecycleTypes";

interface DecisionDialogProps {
  matter: CeoMatter | null;
  onClose: () => void;
  onDecision: (
    matterId: string,
    decision: "APPROVED" | "REWORK" | "REJECTED" | "ESCALATED",
    rationale: string,
    statutoryAuthority: string
  ) => void;
}

export function DecisionDialog({ matter, onClose, onDecision }: DecisionDialogProps) {
  const [decision, setDecision] = React.useState<"APPROVED" | "REWORK" | "REJECTED" | "ESCALATED">("APPROVED");
  const [rationale, setRationale] = React.useState("");
  const [statutoryAuthority, setStatutoryAuthority] = React.useState("35 U.S.C. 101/102/103 Gating Cleared");

  React.useEffect(() => {
    if (matter) {
      if (matter.stage === "PROTECT") {
        setRationale("Approved for immediate statutory USPTO filing. Official counsel fee docket authorized.");
      } else {
        const nextStageIdx = LIFECYCLE_STAGES.findIndex((s) => s.key === matter.stage) + 1;
        const nextStage = LIFECYCLE_STAGES[nextStageIdx]?.label || "Next Stage";
        setRationale(`All stage gating criteria verified. Advance matter to ${nextStage}.`);
      }
    }
  }, [matter]);

  if (!matter) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDecision(matter.id, decision, rationale, statutoryAuthority);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-line bg-canvas shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Shield className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Executive Invention Decision</h2>
              <p className="text-[11px] text-muted">Authority: Dr. Marcus Vance (Chief Executive Officer)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Target Matter Details */}
          <div className="rounded-xl border border-line bg-surface p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-accent">{matter.matter_ref}</span>
              <span className="rounded bg-line px-2 py-0.5 text-[10px] font-bold text-muted">
                Current Stage: {matter.stage}
              </span>
            </div>
            <div className="text-sm font-bold text-ink">{matter.title}</div>
            <div className="text-xs text-muted">
              Lead: {matter.lead_inventor} &middot; Novelty: {matter.novelty_score}% &middot; Est. Filing: ${matter.est_filing_cost.toLocaleString()}
            </div>
          </div>

          {/* Decision Choice */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink block">Select Executive Determination</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision("APPROVED")}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition text-left ${
                  decision === "APPROVED"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                <FileCheck className="size-4 text-emerald-600 shrink-0" />
                <div>
                  <div>{matter.stage === "PROTECT" ? "Approve & File" : "Approve & Advance"}</div>
                  <div className="text-[10px] font-normal text-muted">Pass stage gate criteria</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision("REWORK")}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition text-left ${
                  decision === "REWORK"
                    ? "border-amber-500 bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/30"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                <RotateCcw className="size-4 text-amber-500 shrink-0" />
                <div>
                  <div>Request Rework</div>
                  <div className="text-[10px] font-normal text-muted">Return notes to team</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision("ESCALATED")}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition text-left ${
                  decision === "ESCALATED"
                    ? "border-purple-500 bg-purple-500/10 text-purple-600 ring-1 ring-purple-500/30"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                <AlertOctagon className="size-4 text-purple-500 shrink-0" />
                <div>
                  <div>Escalate to Board</div>
                  <div className="text-[10px] font-normal text-muted">Legal / Strategic Review</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision("REJECTED")}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition text-left ${
                  decision === "REJECTED"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/30"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}
              >
                <Ban className="size-4 text-rose-500 shrink-0" />
                <div>
                  <div>Reject / Defend</div>
                  <div className="text-[10px] font-normal text-muted">Archive matter</div>
                </div>
              </button>
            </div>
          </div>

          {/* Statutory Authority */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted block">Statutory / Legal Authority</label>
            <input
              type="text"
              value={statutoryAuthority}
              onChange={(e) => setStatutoryAuthority(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none focus:border-accent"
              placeholder="e.g. 35 U.S.C. 101/102/103 Gating Cleared"
            />
          </div>

          {/* Executive Rationale */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted block">Executive Decision Rationale & Notes</label>
            <textarea
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface p-3 text-xs text-ink outline-none focus:border-accent"
              placeholder="Enter rationale for legal docket and audit trail..."
              required
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
            >
              <Send className="size-3.5" />
              <span>Record Executive Action</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
