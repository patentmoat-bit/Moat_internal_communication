"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Input, Textarea, cn } from "@moat/ui";
import { claimCategoryLabels } from "@/lib/display";
import type { ClaimCategory, ClaimDraft, ClaimKind, Finding } from "@/lib/types";

const CATEGORIES: ClaimCategory[] = [
  "apparatus",
  "method",
  "system",
  "composition",
  "crm",
  "other",
];

// Open transitions admit unrecited elements; closed ones do not. Offering them
// in one list with the distinction visible is the point -- the choice decides
// whether a competitor adding a component escapes the claim.
const TRANSITIONS = [
  { value: "comprising", label: "comprising (open)" },
  { value: "including", label: "including (open)" },
  { value: "having", label: "having (open)" },
  { value: "consisting of", label: "consisting of (closed)" },
  { value: "consisting essentially of", label: "consisting essentially of (partly closed)" },
  { value: "wherein", label: "wherein (dependent)" },
];

export function ClaimEditor({
  claims,
  findings,
  onChange,
  selected,
  onSelect,
  disabled,
  checking,
}: {
  claims: ClaimDraft[];
  findings: Finding[];
  onChange: (claims: ClaimDraft[]) => void;
  selected: number | null;
  onSelect: (claimNumber: number | null) => void;
  disabled?: boolean;
  checking?: boolean;
}) {
  const refs = React.useRef<Map<number, HTMLElement>>(new Map());

  React.useEffect(() => {
    if (selected === null) return;
    refs.current.get(selected)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selected]);

  const findingsByClaim = React.useMemo(() => {
    const grouped = new Map<number, Finding[]>();
    for (const finding of findings) {
      if (finding.claimNumber === null) continue;
      const list = grouped.get(finding.claimNumber) ?? [];
      list.push(finding);
      grouped.set(finding.claimNumber, list);
    }
    return grouped;
  }, [findings]);

  function update(number: number, patch: Partial<ClaimDraft>) {
    onChange(claims.map((claim) => (claim.number === number ? { ...claim, ...patch } : claim)));
  }

  function addClaim() {
    const next = claims.length + 1;
    onChange([
      ...claims,
      {
        number: next,
        kind: next === 1 ? "independent" : "dependent",
        category: claims[0]?.category ?? "apparatus",
        preamble: next === 1 ? "" : `The ${claims[0]?.category ?? "apparatus"} of claim 1`,
        transition: next === 1 ? "comprising" : "wherein",
        body: "",
        dependsOn: next === 1 ? [] : [1],
      },
    ]);
    onSelect(next);
  }

  function removeClaim(number: number) {
    // Renumber so the set stays 1..n with no gaps, and remap every dependency
    // so nothing points at a claim that has moved or disappeared. A gap is how
    // a claim silently goes missing between drafting and filing.
    const remaining = claims.filter((claim) => claim.number !== number);
    const renumber = new Map<number, number>();
    remaining.forEach((claim, index) => renumber.set(claim.number, index + 1));

    onChange(
      remaining.map((claim) => ({
        ...claim,
        number: renumber.get(claim.number)!,
        dependsOn: claim.dependsOn
          .filter((parent) => parent !== number)
          .map((parent) => renumber.get(parent))
          .filter((parent): parent is number => parent !== undefined)
          .sort((a, b) => a - b),
      })),
    );
    onSelect(null);
  }

  function move(number: number, direction: -1 | 1) {
    const index = claims.findIndex((claim) => claim.number === number);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= claims.length) return;

    const reordered = [...claims];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // Renumber 1..n, then remap every dependency through the same mapping.
    // Dependencies reference claim NUMBERS, so a move that did not remap them
    // would silently re-point a claim at a different claim's subject matter.
    const renumber = new Map<number, number>();
    reordered.forEach((claim, position) => renumber.set(claim.number, position + 1));

    onChange(
      reordered.map((claim) => ({
        ...claim,
        number: renumber.get(claim.number)!,
        dependsOn: claim.dependsOn
          .map((parent) => renumber.get(parent))
          .filter((parent): parent is number => parent !== undefined)
          .sort((a, b) => a - b),
      })),
    );
    // Reordering can leave a claim depending on a later one. That is refused
    // at save and flagged by the checker rather than silently "fixed" here --
    // dropping the dependency would change what the claim covers.
    onSelect(renumber.get(number) ?? null);
  }

  function toggleParent(claim: ClaimDraft, parent: number) {
    const dependsOn = claim.dependsOn.includes(parent)
      ? claim.dependsOn.filter((n) => n !== parent)
      : [...claim.dependsOn, parent].sort((a, b) => a - b);
    update(claim.number, {
      dependsOn,
      kind: dependsOn.length > 0 ? "dependent" : claim.kind,
    });
  }

  return (
    <div className="space-y-3">
      {claims.map((claim) => {
        const claimFindings = findingsByClaim.get(claim.number) ?? [];
        const hasError = claimFindings.some((f) => f.severity === "error");
        const isSelected = selected === claim.number;

        return (
          <article
            key={claim.number}
            ref={(element) => {
              if (element) refs.current.set(claim.number, element);
              else refs.current.delete(claim.number);
            }}
            onFocus={() => onSelect(claim.number)}
            className={cn(
              "rounded-[var(--radius-md)] border bg-surface transition-colors",
              hasError
                ? "border-critical/40"
                : isSelected
                  ? "border-accent"
                  : "border-line",
            )}
          >
            <header className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
              <span className="numeric flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-xs)] bg-sunken text-[12px] font-semibold text-ink">
                {claim.number}
              </span>

              <div className="flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-line bg-sunken p-0.5">
                {(["independent", "dependent"] as ClaimKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      update(claim.number, {
                        kind,
                        dependsOn: kind === "independent" ? [] : claim.dependsOn,
                        transition: kind === "independent" ? "comprising" : "wherein",
                      })
                    }
                    className={cn(
                      "rounded-[var(--radius-xs)] px-2 py-0.5 text-[11.5px] transition-colors",
                      claim.kind === kind
                        ? "bg-surface font-medium text-ink shadow-[var(--shadow-sm)]"
                        : "text-faint hover:text-muted",
                    )}
                  >
                    {kind === "independent" ? "Independent" : "Dependent"}
                  </button>
                ))}
              </div>

              <select
                value={claim.category}
                disabled={disabled}
                onChange={(event) =>
                  update(claim.number, { category: event.target.value as ClaimCategory })
                }
                className="h-7 rounded-[var(--radius-sm)] border border-line bg-surface px-2 text-[12px] text-ink"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {claimCategoryLabels[category]}
                  </option>
                ))}
              </select>

              {claimFindings.length > 0 ? (
                <Badge tone={hasError ? "critical" : "caution"}>
                  {claimFindings.length} {hasError ? "error" : "note"}
                  {claimFindings.length === 1 ? "" : "s"}
                </Badge>
              ) : null}

              <div className="ml-auto flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={disabled || claim.number === 1}
                  onClick={() => move(claim.number, -1)}
                  title="Move up"
                  className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-hover hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={disabled || claim.number === claims.length}
                  onClick={() => move(claim.number, 1)}
                  title="Move down"
                  className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-hover hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronDown className="size-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={disabled || claims.length === 1}
                onClick={() => removeClaim(claim.number)}
                title={claims.length === 1 ? "A set needs at least one claim" : "Delete claim"}
                className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-hover hover:text-critical disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-faint"
              >
                <Trash2 className="size-3.5" />
              </button>
            </header>

            {claim.kind === "dependent" ? (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-3 py-2">
                <span className="text-[11.5px] text-muted">Depends on</span>
                {claims
                  .filter((other) => other.number < claim.number)
                  .map((other) => (
                    <button
                      key={other.number}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleParent(claim, other.number)}
                      className={cn(
                        "numeric rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[11.5px] transition-colors",
                        claim.dependsOn.includes(other.number)
                          ? "border-accent-line bg-accent-soft text-accent-text"
                          : "border-line bg-surface text-faint hover:text-muted",
                      )}
                    >
                      {other.number}
                    </button>
                  ))}
                {claim.number === 1 ? (
                  <span className="text-[11px] text-faint">
                    Claim 1 cannot depend on anything — it is the first claim.
                  </span>
                ) : null}
                {claim.dependsOn.length > 1 ? (
                  <span className="text-[11px] text-caution">
                    Multiple dependent — counts separately for fees
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={claim.preamble}
                  disabled={disabled}
                  placeholder={
                    claim.kind === "independent"
                      ? "A collaborative robot joint assembly"
                      : "The joint assembly of claim 1"
                  }
                  onChange={(event) => update(claim.number, { preamble: event.target.value })}
                  className="font-serif min-w-[240px] flex-1 text-[14px]"
                />
                <select
                  value={claim.transition}
                  disabled={disabled}
                  onChange={(event) => update(claim.number, { transition: event.target.value })}
                  className={cn(
                    "h-8 rounded-[var(--radius-sm)] border px-2 text-[12px]",
                    claim.kind === "independent" &&
                      claim.transition.startsWith("consisting")
                      ? "border-caution/50 bg-caution-soft text-caution"
                      : "border-line bg-surface text-ink",
                  )}
                >
                  {TRANSITIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <Textarea
                value={claim.body}
                disabled={disabled}
                rows={claim.kind === "independent" ? 5 : 3}
                placeholder={
                  claim.kind === "independent"
                    ? "a motor having a winding; a thermistor coupled to the winding; and a controller configured to…"
                    : "the controller re-derives the stiffness ceiling at a control rate."
                }
                onChange={(event) => update(claim.number, { body: event.target.value })}
                className="font-serif text-[14px] leading-relaxed"
              />

              {claimFindings.length > 0 ? (
                <ul className="space-y-1 pt-0.5">
                  {claimFindings.map((finding, index) => (
                    <li
                      key={`${finding.code}-${index}`}
                      className={cn(
                        "text-[11.5px] leading-snug",
                        finding.severity === "error"
                          ? "text-critical"
                          : finding.severity === "warning"
                            ? "text-caution"
                            : "text-faint",
                      )}
                    >
                      {finding.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        );
      })}

      <div className="flex items-center gap-2">
        <Button onClick={addClaim} disabled={disabled}>
          <Plus />
          Add claim
        </Button>
        {checking ? (
          <span className="flex items-center gap-1.5 text-[11.5px] text-faint">
            <LoaderCircle className="size-3 animate-spin" />
            checking…
          </span>
        ) : null}
      </div>
    </div>
  );
}
