"use client";

import { AnalysisPage, AnalysisDisclaimer } from "@/components/decision/AnalysisPage";
import { MetricBar, Pill, SectionLabel } from "@/components/decision/primitives";
import type { LandscapeReport, Maturity } from "@/lib/analysis/landscape";

const MATURITY_TONE: Record<Maturity, string> = {
  emerging: "emerald",
  active: "cyan",
  mature: "amber",
  saturated: "rose",
};
const TREND_TONE: Record<string, string> = { accelerating: "emerald", steady: "cyan", declining: "amber" };

export default function LandscapePage() {
  return (
    <AnalysisPage<LandscapeReport>
      tag="Landscape Mapping"
      title="Patent Landscape"
      subtitle="Assignees, clusters, filing velocity, and where the white space is."
      endpoint="/api/landscape"
      placeholder="Name the technology domain to map…"
      runLabel="Map"
      accent="sky"
      loadingSteps={[
        "Gathering patent families…",
        "Clustering by technology…",
        "Ranking assignees…",
        "Scoring white space…",
      ]}
    >
      {(data) => {
        const maxFilings = Math.max(...data.timeline.map((t) => t.filings), 1);
        return (
          <>
            <div className="rounded-sm border border-border bg-card/40 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <SectionLabel>Domain overview</SectionLabel>
                  <div className="mt-2 flex items-center gap-2">
                    <Pill tone={TREND_TONE[data.filing_trend] ?? "slate"}>{data.filing_trend}</Pill>
                    {data.source === "mock" && <Pill tone="amber">offline</Pill>}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{data.summary}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold leading-none text-sky-600 dark:text-sky-300 [font-family:var(--font-mono)]">
                    {data.total_families.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 [font-family:var(--font-mono)]">
                    patent families
                  </div>
                </div>
              </div>
            </div>

            {/* filing velocity */}
            <div>
              <SectionLabel>Filing velocity</SectionLabel>
              <div className="mt-3 flex items-end gap-2 rounded-sm border border-border p-4" style={{ height: 140 }}>
                {data.timeline.map((t) => (
                  <div key={t.year} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-[9px] text-muted-foreground/80 [font-family:var(--font-mono)]">{t.filings}</span>
                    <div
                      className="w-full rounded-sm bg-primary/60 transition-all"
                      style={{ height: `${Math.max(4, (t.filings / maxFilings) * 100)}%` }}
                      title={`${t.filings} filings`}
                    />
                    <span className="text-[10px] text-muted-foreground/70 [font-family:var(--font-mono)]">{`'${String(t.year).slice(2)}`}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* top assignees */}
            <div>
              <SectionLabel>Top assignees</SectionLabel>
              <div className="mt-3 divide-y divide-border rounded-sm border border-border">
                {data.top_assignees.map((a, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-foreground">{a.name}</span>
                      <span className="text-[11px] text-muted-foreground [font-family:var(--font-mono)]">
                        {a.share}% · {a.families.toLocaleString()} families
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-[#c9a84c] dark:bg-sky-400/70" style={{ width: `${a.share}%` }} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground/80">{a.focus}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* clusters */}
            <div>
              <SectionLabel>Technology clusters</SectionLabel>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.clusters.map((c, i) => (
                  <div key={i} className="rounded-sm border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{c.name}</span>
                      <Pill tone={MATURITY_TONE[c.maturity]}>{c.maturity}</Pill>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <MetricBar value={c.density} invert width="w-full" />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground/80">{c.note}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* white space */}
            <div>
              <SectionLabel>White space opportunities</SectionLabel>
              <div className="mt-3 space-y-2">
                {data.white_space.map((w, i) => (
                  <div key={i} className="rounded-sm border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{w.area}</span>
                      <span className="shrink-0 text-[11px] text-emerald-600 dark:text-emerald-300/80 [font-family:var(--font-mono)]">
                        {w.opportunity}% open
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{w.rationale}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-sm border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4">
              <SectionLabel>Recommendation</SectionLabel>
              <div className="mt-2 text-lg font-semibold text-foreground">{data.recommendation.action}</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{data.recommendation.rationale}</p>
            </div>

            <AnalysisDisclaimer>
              PFS provides research assistance, not legal advice. Landscape figures are AI-assisted
              estimates and should be validated against a live patent database before strategic decisions.
            </AnalysisDisclaimer>
          </>
        );
      }}
    </AnalysisPage>
  );
}
