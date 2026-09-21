"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, ListOrdered, LoaderCircle, Save, Send } from "lucide-react";
import { Badge, Button, cn } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";
import { SpecificationEditor } from "./specification-editor";
import { ClaimEditor } from "./claim-editor";
import { ClaimTree } from "./claim-tree";
import { FindingsPanel } from "./findings-panel";
import { AssistPanel } from "./assist-panel";
import { ClaimDecisionRecord, ClaimReview } from "./claim-review";
import { DrawingsPanel } from "@/components/design/drawings-panel";
import type {
  CheckResult,
  ClaimDraft,
  DraftDetail,
  Drawing,
  DrawingsSummary,
  Finding,
} from "@/lib/types";

const CHECK_DEBOUNCE_MS = 600;

function toDrafts(draft: DraftDetail): ClaimDraft[] {
  const claims = draft.claimSet?.claims ?? [];
  if (claims.length > 0) {
    // Drop the server id: the editor works in claim NUMBERS, which is what a
    // drafter types and what dependencies reference.
    return claims.map((claim) => ({
      number: claim.number,
      kind: claim.kind,
      category: claim.category,
      preamble: claim.preamble,
      transition: claim.transition,
      body: claim.body,
      dependsOn: claim.dependsOn,
    }));
  }
  // A draft with no claims starts with one independent claim rather than an
  // empty list: a claim set with no claims is not a valid starting point.
  return [
    {
      number: 1,
      kind: "independent",
      category: "apparatus",
      preamble: "",
      transition: "comprising",
      body: "",
      dependsOn: [],
    },
  ];
}

export function DraftingStudio({
  draft,
  canEdit,
  canDecide,
  canRequestDrawing,
  canReviewDrawing,
  drawings,
  drawingsSummary,
}: {
  draft: DraftDetail;
  canEdit: boolean;
  canDecide: boolean;
  canRequestDrawing: boolean;
  canReviewDrawing: boolean;
  drawings: Drawing[];
  drawingsSummary: DrawingsSummary | null;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"specification" | "claims" | "figures">("claims");
  const [claims, setClaims] = React.useState<ClaimDraft[]>(() => toDrafts(draft));
  const [selected, setSelected] = React.useState<number | null>(null);

  const [check, setCheck] = React.useState<CheckResult | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const savedClaims = React.useMemo(() => toDrafts(draft), [draft]);
  const claimSet = draft.claimSet;
  // Counsel reviews a frozen set that has not yet been decided.
  const awaitingReview =
    canDecide &&
    claimSet !== null &&
    claimSet.frozenAt !== null &&
    claimSet.status === "submitted";
  const dirty = JSON.stringify(claims) !== JSON.stringify(savedClaims);
  const readOnly = !canEdit || draft.status === "filed";

  // Live checking while typing. Debounced and cancellable, so a fast typist
  // produces one request rather than one per keystroke -- and the endpoint is
  // stateless, so nothing is written until Save.
  React.useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setChecking(true);
      api<CheckResult>("/drafts/check", {
        method: "POST",
        json: { claims },
        signal: controller.signal,
      })
        .then((result) => setCheck(result))
        .catch(() => undefined)
        .finally(() => setChecking(false));
    }, CHECK_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [claims]);

  // Before the first check returns, show whatever the server last saved rather
  // than an empty panel.
  const findings: Finding[] = check?.findings ?? draft.claimSet?.findings ?? [];
  const tree = check?.tree ?? draft.claimSet?.tree ?? [];
  const coverage = check?.coverage ??
    draft.claimSet?.coverage ?? {
      total: 0,
      independent: 0,
      dependent: 0,
      multipleDependent: 0,
      maxDepth: 0,
      categories: [],
    };
  const errorCount = findings.filter((f) => f.severity === "error").length;

  async function saveClaims() {
    setSaving(true);
    setError(null);
    try {
      await api<DraftDetail>(`/drafts/${draft.id}/claims`, {
        method: "PUT",
        json: { claims, changeNote: "" },
      });
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError ? cause.body.message : "Could not save the claims.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitClaims() {
    setSubmitting(true);
    setError(null);
    try {
      await api<DraftDetail>(`/drafts/${draft.id}/claims/submit`, { method: "POST" });
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError ? cause.body.message : "Could not submit the claim set.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-line">
        <div role="tablist" aria-label="Draft sections" className="flex items-center gap-0.5">
          {(
            [
              { key: "claims", label: "Claims", icon: ListOrdered },
              { key: "specification", label: "Specification", icon: FileText },
              { key: "figures", label: "Figures", icon: ImagePlus },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-2.5 pb-2 pt-1 text-[13px] transition-colors",
                tab === key
                  ? "border-accent font-medium text-ink"
                  : "border-transparent text-faint hover:text-muted",
              )}
            >
              <Icon className="size-[14px]" />
              {label}
              {key === "claims" && errorCount > 0 ? (
                <Badge tone="critical">{errorCount}</Badge>
              ) : null}
              {key === "figures" && drawingsSummary && drawingsSummary.outstanding > 0 ? (
                <Badge tone="caution">{drawingsSummary.outstanding}</Badge>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "claims" ? (
          <div className="-mb-px ml-auto flex items-center gap-2 pb-1.5">
            {error ? (
              <p role="alert" className="max-w-sm text-right text-[11.5px] leading-snug text-critical">
                {error}
              </p>
            ) : null}
            {!readOnly ? (
              <>
                <Button onClick={saveClaims} disabled={saving || !dirty}>
                  {saving ? <LoaderCircle className="animate-spin" /> : <Save />}
                  {dirty ? "Save claims" : "Saved"}
                </Button>
                <Button
                  variant="primary"
                  onClick={submitClaims}
                  disabled={submitting || dirty || errorCount > 0 || claims.length === 0}
                  title={
                    errorCount > 0
                      ? "Resolve the structural errors first"
                      : dirty
                        ? "Save your changes first"
                        : "Freeze this claim set and send it to counsel"
                  }
                >
                  {submitting ? <LoaderCircle className="animate-spin" /> : <Send />}
                  Submit for review
                </Button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {tab === "figures" ? (
        <DrawingsPanel
          documentId={draft.id}
          drawings={drawings}
          summary={drawingsSummary}
          canRequest={canRequestDrawing}
          canReview={canReviewDrawing}
        />
      ) : tab === "specification" ? (
        <SpecificationEditor draft={draft} disabled={readOnly} />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <ClaimEditor
            claims={claims}
            findings={findings}
            onChange={setClaims}
            selected={selected}
            onSelect={setSelected}
            disabled={readOnly}
            checking={checking}
          />

          <div className="space-y-4 xl:sticky xl:top-0">
            {draft.claimDecision ? (
              <ClaimDecisionRecord
                decision={draft.claimDecision}
                currentRevision={claimSet?.revision ?? null}
              />
            ) : null}

            {awaitingReview && claimSet ? (
              <ClaimReview draft={draft} claimSet={claimSet} />
            ) : null}

            <ClaimTree
              tree={tree}
              coverage={coverage}
              selected={selected}
              onSelect={setSelected}
            />
            <FindingsPanel
              findings={findings}
              checkerVersion={check?.checkerVersion ?? "claim-checks@1.0"}
              onJumpToClaim={setSelected}
              pending={checking}
            />

            {!readOnly ? <AssistPanel documentId={draft.id} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
