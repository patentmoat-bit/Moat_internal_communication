"use client";

import * as React from "react";
import { AlertTriangle, CircleAlert, Info, ShieldCheck } from "lucide-react";
import { Badge, EmptyState, Panel, PanelBody, PanelHeader, cn } from "@moat/ui";
import type { Finding } from "@/lib/types";

const ICON = {
  error: CircleAlert,
  warning: AlertTriangle,
  info: Info,
} as const;

const TONE = {
  error: "text-critical",
  warning: "text-caution",
  info: "text-faint",
} as const;

export function FindingsPanel({
  findings,
  checkerVersion,
  onJumpToClaim,
  pending,
}: {
  findings: Finding[];
  checkerVersion: string;
  onJumpToClaim?: (claimNumber: number) => void;
  pending?: boolean;
}) {
  const counts = React.useMemo(
    () => ({
      error: findings.filter((f) => f.severity === "error").length,
      warning: findings.filter((f) => f.severity === "warning").length,
      info: findings.filter((f) => f.severity === "info").length,
    }),
    [findings],
  );

  return (
    <Panel>
      <PanelHeader
        title="Checks"
        caption={pending ? "Re-checking…" : `${findings.length} finding${findings.length === 1 ? "" : "s"}`}
        actions={
          <div className="flex items-center gap-1.5">
            {counts.error > 0 ? <Badge tone="critical">{counts.error}</Badge> : null}
            {counts.warning > 0 ? <Badge tone="caution">{counts.warning}</Badge> : null}
            {counts.info > 0 ? <Badge tone="neutral">{counts.info}</Badge> : null}
          </div>
        }
      />

      {findings.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="Nothing flagged"
          description="No structural errors, missing antecedent basis, or scope concerns found by these checks."
          className="py-8"
        />
      ) : (
        <ul className="max-h-[520px] overflow-y-auto">
          {findings.map((finding, index) => {
            const Icon = ICON[finding.severity];
            const clickable = finding.claimNumber !== null && onJumpToClaim;
            return (
              <li
                key={`${finding.code}-${finding.claimNumber}-${index}`}
                className={index > 0 ? "border-t border-line" : undefined}
              >
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() =>
                    finding.claimNumber !== null && onJumpToClaim?.(finding.claimNumber)
                  }
                  className={cn(
                    "flex w-full gap-2.5 px-4 py-2.5 text-left transition-colors",
                    clickable ? "hover:bg-hover" : "cursor-default",
                  )}
                >
                  <Icon className={cn("mt-0.5 size-[15px] shrink-0", TONE[finding.severity])} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] leading-snug text-ink">
                      {finding.message}
                    </span>
                    {/* The rule behind the finding. Without it a drafter can
                        only guess whether to act. */}
                    {finding.authority ? (
                      <span className="numeric mt-1 block text-[10.5px] text-faint">
                        {finding.authority}
                      </span>
                    ) : null}
                  </span>
                  {finding.claimNumber !== null ? (
                    <span className="numeric shrink-0 text-[11px] text-faint">
                      claim {finding.claimNumber}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <PanelBody className="border-t border-line py-2.5">
        <p className="text-[11px] leading-relaxed text-faint">
          Drafting aids, not a legal opinion. The antecedent-basis check reads the claim text
          heuristically and will occasionally be wrong in both directions — each finding quotes
          the phrase that triggered it so you can judge it.{" "}
          <span className="numeric">{checkerVersion}</span>
        </p>
      </PanelBody>
    </Panel>
  );
}
