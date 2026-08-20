"use client";

import { AnalysisPage, AnalysisDisclaimer } from "@/components/decision/AnalysisPage";
import { MetricBar, Pill, ScoreBadge, SectionLabel } from "@/components/decision/primitives";
import type { InvalidityAssessment, Strength } from "@/lib/analysis/invalidity";

const STRENGTH_TONE: Record<Strength, string> = {
  vulnerable: "rose",
  contestable: "amber",
  robust: "emerald",
};

export default function InvalidityPage() {
  return (
    <AnalysisPage<InvalidityAssessment>
      tag="Invalidity Search"
      title="Invalidity Assessment"
      subtitle="Can this existing patent's claims be challenged — and with what art?"
      endpoint="/api/invalidity"
      placeholder="Enter the patent number or describe the claims to challenge…"
      runLabel="Assess"
      accent="rose"
      loadingSteps={[
        "Parsing target claims…",
        "Searching pre-priority-date art…",
        "Scoring claim vulnerability…",
        "Assembling assessment…",
      ]}
    >
      {(data) => {
        const tone = STRENGTH_TONE[data.strength];
        return (
          <>
            <div className="flex items-start justify-between gap-4 rounded-sm border border-border bg-card/40 p-5">
              <div className="min-w-0">
                <SectionLabel>Challenge prospects</SectionLabel>
                <div className="mt-2 flex items-center gap-2">
                  <h2 className="text-xl font-semibold capitalize text-foreground">{data.strength}</h2>
                  <Pill tone={tone}>{data.strength}</Pill>
                  {data.source === "mock" && <Pill tone="amber">offline</Pill>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
              </div>
              <ScoreBadge score={data.invalidity_score} label="invalidity" tone={tone as "emerald" | "amber" | "rose"} />
            </div>

            <div className="rounded-sm border border-rose-500/20 bg-rose-500/[0.03] p-4">
              <SectionLabel>Recommendation</SectionLabel>
              <div className="mt-2 text-lg font-semibold text-foreground">{data.recommendation.action}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{data.recommendation.rationale}</p>
            </div>

            <div>
              <SectionLabel>Challenged claims</SectionLabel>
              <p className="mb-3 mt-1 text-xs text-muted-foreground/80">Higher vulnerability = easier to invalidate.</p>
              <div className="divide-y divide-border rounded-sm border border-border">
                {data.challenged_claims.map((c, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground">{c.claim}</span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 [font-family:var(--font-mono)]">
                        {c.basis}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <MetricBar value={c.vulnerability} invert width="w-32" />
                      <span className="text-[11px] text-muted-foreground [font-family:var(--font-mono)]">{c.vulnerability}% vulnerable</span>
                    </div>
                    {c.note && <p className="mt-1.5 text-xs text-muted-foreground/85">{c.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Invalidating art</SectionLabel>
              <div className="mt-3 space-y-2">
                {data.invalidating_art.map((art, i) => (
                  <div key={i} className="rounded-sm border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] font-semibold text-[#c9a84c] dark:text-amber-300 [font-family:var(--font-mono)]">
                            {art.patent_number}
                          </span>
                          <Pill tone="rose">{art.basis}</Pill>
                          <span className="text-[11px] text-muted-foreground/70">priority {art.priority_date}</span>
                        </div>
                        <p className="mt-1 text-sm text-foreground">{art.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground/75">{art.assignee} · {art.year}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[11px] text-muted-foreground/80 [font-family:var(--font-mono)]">{art.strength}% strength</span>
                        <MetricBar value={art.strength} invert width="w-20" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{art.overlap}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <SectionLabel>Grounds for challenge</SectionLabel>
              <div className="mt-3 space-y-2">
                {data.grounds.map((g, i) => (
                  <div key={i} className="rounded-sm border border-border p-3">
                    <p className="text-sm font-medium text-foreground">{g.ground}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{g.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <AnalysisDisclaimer>
              PFS provides research assistance, not legal advice. Invalidity findings are AI-assisted and
              require review by qualified patent counsel before any challenge or litigation decision.
            </AnalysisDisclaimer>
          </>
        );
      }}
    </AnalysisPage>
  );
}
