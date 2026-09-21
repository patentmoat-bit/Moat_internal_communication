import { AlertTriangle, ShieldQuestion } from "lucide-react";
import { Badge, Eyebrow, Panel, PanelBody, PanelHeader, EmptyState } from "@moat/ui";
import { RunAnalysisButton } from "./run-analysis-button";
import type { AnalysisRun } from "@/lib/types";
import { analysisMeta, formatDate } from "@/lib/display";

function ConceptRow({ label, matches }: { label: string; matches: number }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="min-w-0 text-[12.5px] leading-snug text-ink">{label}</span>
      {matches === 0 ? (
        <Badge tone="caution" className="shrink-0">
          nothing retrieved
        </Badge>
      ) : (
        <span className="numeric shrink-0 text-[11.5px] tabular-nums text-faint">
          {matches} {matches === 1 ? "passage" : "passages"}
        </span>
      )}
    </li>
  );
}

export function EvidencePanel({
  analysis,
  currentRevision,
  canRun,
  inventionId,
}: {
  analysis: AnalysisRun | null;
  currentRevision: number;
  canRun: boolean;
  inventionId: string;
}) {
  if (!analysis) {
    return (
      <Panel>
        <PanelHeader title="Prior-art evidence" />
        <EmptyState
          icon={<ShieldQuestion />}
          title="No search has been run"
          description="Retrieval runs against a specific revision of this disclosure and records which corpus and configuration produced the result."
          action={
            canRun ? (
              <RunAnalysisButton
                inventionId={inventionId}
                label="Search prior art"
                variant="primary"
                size="sm"
              />
            ) : null
          }
        />
      </Panel>
    );
  }

  const meta = analysisMeta[analysis.status];
  const stale = analysis.inventionRevision !== currentRevision;
  const uncovered = analysis.concepts.filter((concept) => concept.matches === 0);

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Prior-art evidence"
          caption={
            analysis.completedAt
              ? `Run against revision ${analysis.inventionRevision} on ${formatDate(analysis.completedAt)}`
              : undefined
          }
          actions={
            canRun ? (
              <RunAnalysisButton inventionId={inventionId} label="Re-run" size="sm" />
            ) : null
          }
        />

        <PanelBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="numeric text-[12px] text-faint">
              {analysis.evidence.length} passages retrieved
            </span>
          </div>

          {stale ? (
            <div className="flex gap-2.5 rounded-[var(--radius-sm)] border border-caution/25 bg-caution-soft px-3 py-2.5">
              <AlertTriangle className="mt-px size-[15px] shrink-0 text-caution" />
              <p className="text-[12px] leading-relaxed text-caution">
                This evidence was gathered against revision {analysis.inventionRevision}. The
                disclosure is now at revision {currentRevision}. Re-run before relying on it for a
                decision.
              </p>
            </div>
          ) : null}

          {analysis.concepts.length > 0 ? (
            <div>
              <Eyebrow className="pb-1">Concepts in this disclosure</Eyebrow>
              <ul className="divide-y divide-[var(--line)]">
                {analysis.concepts.map((concept) => (
                  <ConceptRow key={concept.id} label={concept.label} matches={concept.matches} />
                ))}
              </ul>
              {uncovered.length > 0 ? (
                <p className="mt-2.5 text-[11.5px] leading-relaxed text-faint">
                  {uncovered.length === 1 ? "One concept" : `${uncovered.length} concepts`} returned
                  no matching passage from this corpus. That is a place to look, not a finding —
                  absence from the searched corpus is not absence from the art.
                </p>
              ) : null}
            </div>
          ) : null}
        </PanelBody>
      </Panel>

      {analysis.evidence.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Retrieved passages"
            caption="Ranked by retrieval score, highest first"
          />
          <ul>
            {analysis.evidence.map((item, index) => (
              <li key={item.id} className={index > 0 ? "border-t border-line" : undefined}>
                <article className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="numeric text-[11.5px] font-medium text-accent-text">
                          {item.publicationId}
                        </span>
                        <span className="text-[11px] text-faint">
                          {item.jurisdiction} · {item.kindCode}
                          {item.publishedOn ? ` · ${formatDate(item.publishedOn)}` : ""}
                        </span>
                      </div>
                      <h4 className="font-document mt-1 text-[13.5px] font-semibold leading-snug text-ink">
                        {item.title}
                      </h4>
                      <p className="text-[12px] text-muted">{item.applicant}</p>
                    </div>
                    <span
                      className="numeric shrink-0 text-[11.5px] tabular-nums text-faint"
                      title="Retrieval score: how strongly this passage matched the query. Not a measure of patentability."
                    >
                      {item.retrievalScore.toFixed(2)}
                    </span>
                  </div>

                  <blockquote className="font-document mt-2.5 border-l-2 border-accent-line bg-sunken/60 py-2 pl-3 pr-2 text-[13px] italic leading-relaxed text-muted">
                    {item.passage}
                  </blockquote>

                  {item.matchedConcepts.length > 0 ? (
                    <p className="mt-2 text-[11px] leading-snug text-faint">
                      matched: {item.matchedConcepts.join(" · ")}
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* Provenance is not an appendix. Any figure above has to be traceable. */}
      <Panel className="bg-sunken/40">
        <PanelBody className="space-y-2">
          <Eyebrow>Provenance</Eyebrow>
          <dl className="numeric grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
            {[
              ["Corpus", analysis.corpusRevision],
              ["Retrieval", analysis.retrievalVersion],
              ["Model", analysis.modelVersion],
              ["Prompt", analysis.promptVersion],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-faint">{label}</dt>
                <dd className="text-muted">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[11.5px] leading-relaxed text-faint">
            Retrieval ranking is not a patentability opinion. A §102 or §103 assessment is recorded
            as a decision by a named reviewer against a specific revision.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}
