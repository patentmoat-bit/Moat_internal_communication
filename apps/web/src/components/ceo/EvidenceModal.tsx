"use client";

import * as React from "react";
import {
  X,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  HelpCircle,
  FileCheck2,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { CeoMatter } from "@/lib/ceoLifecycleTypes";

interface EvidenceModalProps {
  matter: CeoMatter | null;
  onClose: () => void;
}

export function EvidenceModal({ matter, onClose }: EvidenceModalProps) {
  if (!matter) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-canvas shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">{matter.matter_ref}</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  Stage: {matter.stage}
                </span>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                  Novelty: {matter.novelty_score}%
                </span>
              </div>
              <h2 className="text-base font-bold text-ink mt-0.5 truncate max-w-md sm:max-w-xl">
                {matter.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-hover hover:text-ink transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Executive Summary & Recommendation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-line bg-surface p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Evidentiary Conclusion
              </span>
              <p className="text-xs text-ink leading-relaxed font-medium">{matter.conclusion}</p>
            </div>

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Action Recommendation
              </span>
              <p className="text-xs text-ink leading-relaxed font-medium">{matter.recommendation}</p>
            </div>
          </div>

          {/* Primary Evidence Chain */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <FileCheck2 className="size-4 text-accent" />
                Primary Evidence Chain ({matter.evidence.length})
              </h3>
              <span className="text-[11px] text-faint">Verified Reduction to Practice</span>
            </div>

            {matter.evidence.length === 0 ? (
              <p className="text-xs text-muted italic">No empirical evidence logged yet.</p>
            ) : (
              <div className="space-y-2.5">
                {matter.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-line bg-surface/40 p-3.5 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-ink">{ev.title}</div>
                      <span className="rounded bg-line px-2 py-0.5 text-[10px] font-bold text-muted uppercase">
                        {ev.category.replace(/_/g, " ")}
                      </span>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">{ev.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/60 text-[11px]">
                      {ev.telemetryValue && (
                        <span className="font-mono font-bold text-accent bg-accent/5 px-2 py-0.5 rounded">
                          {ev.telemetryValue}
                        </span>
                      )}
                      <div className="flex items-center gap-3 text-faint">
                        <span>Confidence: <strong>{ev.confidenceScore}%</strong></span>
                        <span>Verified: {ev.verifiedAt}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Counterarguments & Examiner Anticipation */}
          {matter.counterarguments && matter.counterarguments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-amber-500" />
                Examiner Counterarguments & Rebuttal Strategy
              </h3>

              <div className="space-y-2.5">
                {matter.counterarguments.map((ca) => (
                  <div
                    key={ca.id}
                    className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">Examiner Inquiry / 103 Risk</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          ca.status === "ADDRESSED"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}
                      >
                        {ca.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{ca.examinerQuery}</p>
                    <div className="rounded-lg bg-surface p-2.5 text-xs text-ink border border-line">
                      <strong className="text-accent text-[11px] uppercase block mb-1">Rebuttal Strategy:</strong>
                      {ca.rebuttalStrategy}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing Information Checklist */}
          {matter.missing_info && matter.missing_info.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <HelpCircle className="size-4 text-rose-500" />
                Missing Information Gate
              </h3>

              <div className="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
                {matter.missing_info.map((mi) => (
                  <div key={mi.id} className="flex items-center justify-between p-3 text-xs">
                    <div>
                      <div className="font-bold text-ink">{mi.requiredData}</div>
                      <div className="text-[11px] text-muted">Impact: {mi.impactedClaim}</div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          mi.urgency === "CRITICAL"
                            ? "bg-rose-500/10 text-rose-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {mi.urgency}
                      </span>
                      <div className="text-[10px] text-faint mt-0.5">Assigned: {mi.assignedTo}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-surface/50 px-6 py-3.5">
          <div className="text-xs text-muted">
            Next Action: <strong className="text-ink">{matter.next_action}</strong>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-surface border border-line px-4 py-2 text-xs font-semibold text-ink hover:bg-hover transition"
          >
            Close Evidence Trace
          </button>
        </div>
      </div>
    </div>
  );
}
