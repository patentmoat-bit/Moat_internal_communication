"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Avatar, Badge, Button, Field, Panel, PanelBody, PanelHeader, Textarea, cn } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/display";
import type { ClaimSet, ClaimSetDecision, DraftDetail } from "@/lib/types";

const OUTCOMES = [
  { value: "approved", label: "Approve", hint: "Cleared for filing at this claim set" },
  { value: "returned", label: "Return", hint: "Send back to the drafter with changes" },
] as const;

/** Counsel's decision on a submitted claim set. Without this the draft sits in
 *  review forever -- the loop this closes. */
export function ClaimReview({
  draft,
  claimSet,
}: {
  draft: DraftDetail;
  claimSet: ClaimSet;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = React.useState<"approved" | "returned">("approved");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const errorFindings = claimSet.findings.filter((f) => f.severity === "error");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api<DraftDetail>(`/drafts/${draft.id}/claim-decisions`, {
        method: "POST",
        json: {
          outcome,
          rationale: String(form.get("rationale") ?? "").trim(),
          // The revision on screen. If the drafter amended while this was open,
          // the API refuses rather than applying the decision to unseen claims.
          claimSetRevision: claimSet.revision,
        },
      });
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError ? cause.body.message : "Could not record the decision.",
      );
      setPending(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Review this claim set"
        caption={`Claim set revision ${claimSet.revision}, frozen ${
          claimSet.frozenAt ? formatDate(claimSet.frozenAt) : ""
        }. Your decision is recorded against this revision and stops applying if it changes.`}
      />
      <PanelBody>
        {errorFindings.length > 0 ? (
          <div className="mb-4 flex gap-2.5 rounded-[var(--radius-sm)] border border-critical/25 bg-critical-soft px-3 py-2.5">
            <AlertTriangle className="mt-px size-[15px] shrink-0 text-critical" />
            <p className="text-[12px] leading-relaxed text-critical">
              This set still has {errorFindings.length} structural error
              {errorFindings.length === 1 ? "" : "s"}. It should not be approved as it stands.
            </p>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <fieldset>
            <legend className="pb-1.5 text-[12px] font-medium text-muted">Outcome</legend>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((option) => {
                const selected = outcome === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setOutcome(option.value)}
                    className={cn(
                      "rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors",
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-surface hover:bg-hover",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[13px] font-medium",
                        selected ? "text-accent-text" : "text-ink",
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-faint">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field
            label="Rationale"
            htmlFor="claim-rationale"
            required
            hint="Say what you relied on — claim scope, the retrieved art, specification support. This is the record read years later when the file is challenged."
          >
            <Textarea
              id="claim-rationale"
              name="rationale"
              rows={4}
              required
              minLength={10}
              className="font-serif text-[14px]"
              placeholder="Claim 1 is supported by the detailed description and distinguishes US-2021/0184392-A1 by re-deriving the ceiling at control rate…"
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="rounded-[var(--radius-sm)] border border-critical/25 bg-critical-soft px-3 py-2 text-[12.5px] leading-relaxed text-critical"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            Record decision
          </Button>
        </form>
      </PanelBody>
    </Panel>
  );
}

export function ClaimDecisionRecord({
  decision,
  currentRevision,
}: {
  decision: ClaimSetDecision;
  currentRevision: number | null;
}) {
  return (
    <Panel>
      <PanelHeader
        title="Claim set decision"
        caption={`Recorded against claim set revision ${decision.claimSetRevision}`}
      />
      <PanelBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={decision.outcome === "approved" ? "positive" : "caution"}>
            {decision.outcome === "approved" ? "Approved" : "Returned for changes"}
          </Badge>
          <span className="flex items-center gap-1.5">
            <Avatar name={decision.reviewer.name} size={20} />
            <span className="text-[12px] text-muted">{decision.reviewer.name}</span>
          </span>
          <span className="text-[12px] text-faint">{formatDate(decision.decidedAt)}</span>
        </div>

        <p className="font-document measure text-[14px] leading-relaxed text-ink">
          {decision.rationale}
        </p>

        {decision.superseded ? (
          <p className="rounded-[var(--radius-sm)] border border-caution/25 bg-caution-soft px-3 py-2 text-[11.5px] leading-relaxed text-caution">
            The claims have changed since this decision. It applies to claim set revision{" "}
            {decision.claimSetRevision} only and does not carry forward to revision{" "}
            {currentRevision}.
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
