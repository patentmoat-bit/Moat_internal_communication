"use client";

import * as React from "react";
import {
  Radar,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  TrendingUp,
  Building,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Compass,
  FileText,
  Activity,
} from "lucide-react";

interface CompetitorActivity {
  competitor: string;
  recent_focus: string;
  threat_level: "HIGH" | "MEDIUM" | "LOW";
  key_patents: string[];
}

interface StrategicIntel {
  topic: string;
  market_trends: string[];
  competitor_activity: CompetitorActivity[];
  regulatory_updates: string[];
  white_space_opportunities: string[];
}

export default function CompetitorIntelligencePage() {
  const [topic, setTopic] = React.useState("");
  const [competitors, setCompetitors] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [intel, setIntel] = React.useState<StrategicIntel | null>(null);

  const fetchIntel = async () => {
    if (!topic.trim()) {
      alert("Please enter a domain topic to analyze competitor intelligence.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/v1/ai/strategic-intelligence?topic=${encodeURIComponent(topic)}&competitors=${encodeURIComponent(competitors)}`
      );
      if (res.ok) {
        const data = await res.json();
        setIntel(data);
      }
    } catch (err) {
      console.error("Failed to fetch strategic intel:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-accent">
              Patent Analyst Intelligence
            </span>
            <span className="text-xs text-muted">Perplexity Pro Live Citation Feed</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
            Competitor Intelligence & White-Space Radar
          </h1>
        </div>

        <button
          onClick={fetchIntel}
          disabled={isLoading || !topic.trim()}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-50 transition"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Fetching Live Intelligence..." : "Run Intelligence Radar"}
        </button>
      </div>

      {/* Target Competitor Query Controls */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Domain / Technology Topic *</label>
            <input
              type="text"
              placeholder="e.g., Cryptographic multi-tenant state isolation, Vector search engines..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchIntel();
              }}
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink outline-none focus:border-accent"
            />
          </div>

          <div className="flex-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Target Competitors (Comma-separated)</label>
            <input
              type="text"
              placeholder="e.g., Google, Apple, Microsoft, IBM..."
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchIntel();
              }}
              className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium text-ink outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center p-16 text-center text-muted space-y-3">
          <RefreshCw className="size-8 text-accent animate-spin" />
          <p className="text-sm font-bold text-ink">Analyzing global patent databases & prosecution feeds...</p>
          <p className="text-xs text-muted max-w-sm">
            Synthesizing competitor prosecution velocity, cited prior art, and identifying uncrowded white-space opportunities.
          </p>
        </div>
      )}

      {!isLoading && !intel && (
        <div className="flex flex-col items-center justify-center p-16 text-center text-muted border border-dashed border-line rounded-2xl bg-surface/30 space-y-2">
          <Radar className="size-10 text-faint opacity-40 mb-1" />
          <p className="text-sm font-bold text-ink">Competitor Radar Inactive</p>
          <p className="text-xs text-muted max-w-md">
            Enter your technology domain topic and target corporate competitors above, then click &quot;Run Intelligence Radar&quot; to fetch live patent prosecution threats and uncrowded white spaces.
          </p>
        </div>
      )}

      {!isLoading && intel && (
        <>
          {/* Top Grid: Competitor Filing Threats */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Radar className="size-4 text-accent" />
                Competitor Filing Activity & Portfolio Threats
              </h2>
              <span className="text-xs text-muted">Live USPTO / EPO Prosecution Feeds</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {intel.competitor_activity.map((comp) => (
                <div key={comp.competitor} className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building className="size-4 text-muted" />
                      <h3 className="text-sm font-bold text-ink">{comp.competitor}</h3>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        comp.threat_level === "HIGH"
                          ? "bg-rose-500/10 text-rose-600"
                          : comp.threat_level === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {comp.threat_level} THREAT
                    </span>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">{comp.recent_focus}</p>

                  <div className="border-t border-line/60 pt-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-faint mb-1.5">
                      Key Cited Patent Filings
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {comp.key_patents.map((pat) => (
                        <a
                          key={pat}
                          href={`https://patents.google.com/patent/${pat}/en`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-line px-2 py-0.5 font-mono text-[10px] font-bold text-accent hover:underline"
                        >
                          {pat} <ExternalLink className="size-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Grid: White Space Opportunities & Regulatory Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* White-Space Scouting */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Compass className="size-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-ink">Identified White-Space Opportunities</h3>
              </div>
              <p className="text-xs text-muted">
                Uncrowded patent territories with high commercial potential and zero blocking competitor claims.
              </p>

              <ul className="space-y-2.5 text-xs text-ink">
                {intel.white_space_opportunities.map((opp, idx) => (
                  <li key={idx} className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-surface p-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-medium">{opp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Regulatory Intelligence */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-amber-500" />
                <h3 className="text-sm font-bold text-ink">IP News & Regulatory Policy Updates</h3>
              </div>
              <p className="text-xs text-muted">
                Tracking USPTO, EPO, and PTAB policy revisions affecting AI and software patentability.
              </p>

              <ul className="space-y-2.5 text-xs text-ink">
                {intel.regulatory_updates.map((reg, idx) => (
                  <li key={idx} className="flex items-start gap-2 rounded-xl border border-line bg-canvas p-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-line text-[11px] font-bold text-muted">
                      §
                    </span>
                    <span className="leading-relaxed text-muted">{reg}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

