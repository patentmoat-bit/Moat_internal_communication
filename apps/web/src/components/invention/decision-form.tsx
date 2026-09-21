"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button, Field, Panel, PanelBody, PanelHeader, Textarea, cn } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import type { DecisionOutcome, InventionDetail } from "@/lib/types";

const OUTCOMES: { value: DecisionOutcome; label: string; hint: string }[] = [
  { value: "approved", label: "Approve", hint: "Proceed to drafting" },
  { value: "returned", label: "Return", hint: "Needs changes from the inventor" },
  { value: "rejected", label: "Reject", hint: "Not worth pursuing" },
];

export function DecisionForm({ invention }: { invention: InventionDetail }) {
  const router = useRouter();
  const [outcome, setOutcome] = React.useState<DecisionOutcome>("approved");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api(`/inventions/${invention.id}/decisions`, {
        method: "POST",
        json: {
          outcome,
          rationale: String(form.get("rationale") ?? "").trim(),
          // The revision on screen. If the inventor saved while this was open,
          // the API refuses rather than applying the decision to new text.
          revision: invention.revision,
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
        title="Record a decision"
        caption={`Your decision is recorded against revision ${invention.revision} and stops applying if the disclosure changes.`}
      />
      <PanelBody>
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset>
            <legend className="pb-1.5 text-[12px] font-medium text-muted">Outcome</legend>
            <div className="grid grid-cols-3 gap-2">
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
            htmlFor="rationale"
            required
            hint="Say what in the retrieved art you relied on. This is the record someone reads in two years when the file is challenged."
          >
            <Textarea
              id="rationale"
              name="rationale"
              rows={4}
              required
              minLength={10}
              className="font-serif text-[14px]"
              placeholder="Current-based force estimation is disclosed in US-2021/0184392-A1, but continuous thermal re-derivation of the stiffness ceiling is not…"
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
