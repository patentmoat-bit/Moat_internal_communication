"use client";

import * as React from "react";
import { Info, LoaderCircle, Sparkles, Wand2 } from "lucide-react";
import { Badge, Button, EmptyState, Panel, PanelBody, PanelHeader } from "@moat/ui";
import { api } from "@/lib/api";
import type { AssistResponse, AssistSuggestion } from "@/lib/types";

const FIELD_LABELS: Record<string, string> = {
  abstract: "Abstract",
  summary: "Summary section",
  briefDescriptionOfDrawings: "Brief description of drawings",
  claim1: "Claim 1 skeleton",
};

export function AssistPanel({
  documentId,
  onApply,
}: {
  documentId: string;
  onApply?: (suggestion: AssistSuggestion) => void;
}) {
  const [state, setState] = React.useState<AssistResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      setState(await api<AssistResponse>(`/drafts/${documentId}/assist`));
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Drafting help"
        caption="Restructures text you already wrote"
        actions={
          <Button size="sm" onClick={load} disabled={loading}>
            {loading ? <LoaderCircle className="animate-spin" /> : <Wand2 />}
            {state ? "Refresh" : "Suggest"}
          </Button>
        }
      />

      {state === null ? (
        <EmptyState
          icon={<Sparkles />}
          title="Generate from your claims"
          description="Builds an abstract from claim 1 and a Summary section that mirrors the claim set — the way these sections are conventionally written."
          className="py-8"
        />
      ) : (
        <>
          {state.suggestions.length === 0 ? (
            <EmptyState
              icon={<Sparkles />}
              title="Nothing to suggest yet"
              description="Write some claims first, then the abstract and summary can be generated from them."
              className="py-8"
            />
          ) : (
            <ul>
              {state.suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.field}
                  className={index > 0 ? "border-t border-line" : undefined}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-ink">
                        {FIELD_LABELS[suggestion.field] ?? suggestion.field}
                      </span>
                      {suggestion.replacesExisting ? (
                        <Badge tone="caution">replaces existing</Badge>
                      ) : null}
                    </div>

                    <p className="font-document mt-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-sm)] bg-sunken px-2.5 py-2 text-[12.5px] leading-relaxed text-muted">
                      {suggestion.value}
                    </p>

                    {/* Why this exists. Every suggestion is a restructuring of
                        the drafter's own text, and saying so is what makes it
                        safe to accept. */}
                    <p className="mt-1.5 text-[11px] leading-snug text-faint">
                      {suggestion.rationale}
                    </p>

                    {onApply ? (
                      <Button size="sm" className="mt-2" onClick={() => onApply(suggestion)}>
                        Use this
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!state.modelGeneration ? (
            <PanelBody className="border-t border-line py-2.5">
              <p className="flex gap-2 text-[11px] leading-relaxed text-faint">
                <Info className="mt-px size-3.5 shrink-0" />
                {state.modelNote}
              </p>
            </PanelBody>
          ) : null}
        </>
      )}
    </Panel>
  );
}
