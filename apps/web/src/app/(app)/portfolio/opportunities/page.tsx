"use client";

import * as React from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Shield,
  Lightbulb,
  ExternalLink,
  DollarSign,
  PlusCircle,
} from "lucide-react";
import { SEED_OPPORTUNITIES } from "@/lib/ceoLifecycleSeed";
import { OpportunityItem } from "@/lib/ceoLifecycleTypes";

export default function CEOOpportunitiesPage() {
  const [opportunities, setOpportunities] = React.useState<OpportunityItem[]>([]);

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/portfolio"
              className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back to Executive Portfolio</span>
            </Link>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-ink">
            Strategic IP Opportunities & White-Space Radar
          </h1>
          <p className="text-xs text-muted">
            Compound Stage Intelligence: Commercialization, Derivative CIPs, and Market Moat Gaps
          </p>
        </div>

        <Link
          href="/inventions/new"
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:brightness-110 transition"
        >
          <PlusCircle className="size-4" />
          <span>New Invention Idea</span>
        </Link>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-5 space-y-2 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Total White-Space Value</div>
          <div className="text-3xl font-black text-ink">$0.0M</div>
          <div className="text-[11px] text-muted">Aggregated estimated commercial value</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 space-y-2 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Identified Opportunities</div>
          <div className="text-3xl font-black text-accent">{opportunities.length}</div>
          <div className="text-[11px] text-muted">Spun off from granted & pipeline matters</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 space-y-2 shadow-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Avg Moat Defensibility</div>
          <div className="text-3xl font-black text-emerald-600">0.0%</div>
          <div className="text-[11px] text-muted">Exclusionary barrier strength against competitors</div>
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-ink flex items-center gap-2">
          <Sparkles className="size-4 text-purple-500" />
          <span>Active Commercialization & Derivative Expansions</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className="rounded-2xl border border-line bg-surface p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-line-strong transition"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-line px-2 py-0.5 font-mono text-[10px] font-bold text-muted">
                    Parent: {opp.originMatterRef}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      opp.priority === "HIGH" || opp.priority === "STRATEGIC"
                        ? "bg-purple-500/10 text-purple-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {opp.category.replace(/_/g, " ")}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-ink leading-snug">{opp.title}</h3>

                <div className="rounded-xl border border-line bg-canvas p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Est. Market Value:</span>
                    <strong className="text-emerald-600 font-mono text-xs">{opp.marketValueEst}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Defensibility:</span>
                    <strong className="text-ink">{opp.defensibilityScore}%</strong>
                  </div>
                </div>

                <div className="text-xs text-muted leading-relaxed">
                  <strong className="text-accent text-[11px] block uppercase mb-0.5">Why this Opportunity:</strong>
                  {opp.whyRationale}
                </div>
              </div>

              <div className="border-t border-line/60 pt-3">
                <div className="text-[11px] text-faint mb-2">
                  Spinoff Idea: <strong className="text-ink">{opp.spinoffIdea}</strong>
                </div>

                <Link
                  href="/inventions/new"
                  className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-surface border border-line py-2 text-xs font-bold text-ink hover:border-accent hover:text-accent transition shadow-2xs"
                >
                  <Lightbulb className="size-3.5" />
                  <span>Create Invention Idea</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
