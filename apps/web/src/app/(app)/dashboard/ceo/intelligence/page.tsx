"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  Sparkles, Building2, TrendingUp, Globe2, Lightbulb, Scale, 
  ShieldCheck, Compass, RefreshCw, Download, Search, Filter, 
  ShieldAlert, AlertTriangle, ArrowRight, Layers, Cpu, Check, 
  CheckCircle2, FileText, ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  IntelligenceSignal, 
  IntelligenceModuleType, 
  StrategicIntelligenceOverview, 
  ImpactLevel 
} from "@/types/intelligence";
import { IntelligenceSignalCard } from "@/components/intelligence/IntelligenceSignalCard";
import { IntelligenceHealthWidget } from "@/components/intelligence/IntelligenceHealthWidget";
import { CrossIntelligencePanel } from "@/components/intelligence/CrossIntelligencePanel";

const MODULE_TABS: Array<{ type: IntelligenceModuleType | "ALL"; label: string; icon: React.ElementType }> = [
  { type: "ALL", label: "All Modules", icon: Cpu },
  { type: "IP", label: "IP Intelligence", icon: Sparkles },
  { type: "COMPETITIVE", label: "Competitive", icon: Building2 },
  { type: "TECHNOLOGY", label: "Technology", icon: TrendingUp },
  { type: "MARKET", label: "Market", icon: Globe2 },
  { type: "INNOVATION", label: "Innovation", icon: Lightbulb },
  { type: "REGULATORY", label: "Regulatory", icon: Scale },
  { type: "PORTFOLIO", label: "Portfolio", icon: ShieldCheck },
  { type: "WHITE_SPACE", label: "White-Space", icon: Compass },
];

export default function StrategicIntelligenceCommandCenter() {
  const searchParams = useSearchParams();
  const initialModule = (searchParams.get("module")?.toUpperCase() as IntelligenceModuleType) || "ALL";

  const [overview, setOverview] = useState<StrategicIntelligenceOverview | null>(null);
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeModule, setActiveModule] = useState<IntelligenceModuleType | "ALL">(initialModule);
  const [impactFilter, setImpactFilter] = useState<ImpactLevel | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Load Overview & Signals
  const loadData = async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const [ovRes, sigRes] = await Promise.all([
        fetch("/api/ceo/intelligence"),
        fetch("/api/ceo/intelligence/signals?limit=100"),
      ]);

      if (ovRes.ok) {
        const ovJson = await ovRes.json();
        if (ovJson.success) setOverview(ovJson.data);
      }

      if (sigRes.ok) {
        const sigJson = await sigRes.json();
        if (sigJson.success) setSignals(sigJson.signals);
      }
    } catch (err) {
      console.error("Failed to load intelligence data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/ceo/intelligence", { method: "POST" });
      await loadData(false);
    } catch (e) {
      console.error("Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter signals locally for instant UI response
  const filteredSignals = signals.filter((s) => {
    if (activeModule !== "ALL" && s.type !== activeModule) return false;
    if (impactFilter !== "ALL" && s.impact_level !== impactFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match = 
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.what_changed.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.related_competitors.some(c => c.name.toLowerCase().includes(q)) ||
        s.related_technologies.some(t => t.name.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleExport = (format: "PDF" | "CSV" | "DOCX") => {
    const rows = filteredSignals.map(s => ({
      Title: s.title,
      Module: s.type,
      Category: s.category,
      Source: s.source,
      Published: s.published_at,
      Impact: s.impact_level,
      Confidence: `${s.confidence}%`,
      WhatChanged: s.what_changed,
      WhyItMatters: s.why_it_matters,
      Risk: s.risk,
      Opportunity: s.opportunity,
      RecommendedAction: s.recommended_action,
    }));

    if (format === "CSV") {
      const headers = Object.keys(rows[0] || {}).join(",");
      const csvContent = "data:text/csv;charset=utf-8," + [
        headers,
        ...rows.map(r => Object.values(r).map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `moat_strategic_intelligence_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setExportNotice(`Exported ${filteredSignals.length} intelligence records as ${format}.`);
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. EXECUTIVE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              <Cpu className="w-3.5 h-3.5" />
              STRATEGIC INTELLIGENCE COMMAND CENTER
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              MOAT Intelligence Core
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Strategic Intelligence Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Executive view of IP, competitors, technology, market, innovation, regulation and portfolio intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Synthesizing..." : "Refresh Intelligence"}
          </Button>

          <div className="relative inline-block text-left">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleExport("CSV")}
              className="text-xs h-9 gap-1.5 bg-[#175a74] hover:bg-[#114459] text-white"
            >
              <Download className="w-3.5 h-3.5" />
              Export Report (CSV)
            </Button>
          </div>
        </div>
      </div>

      {/* EXPORT TOAST */}
      {exportNotice && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {exportNotice}
          </span>
          <button onClick={() => setExportNotice(null)} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
      )}

      {/* 2. TOP EXECUTIVE SUMMARY METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {[
          { label: "Critical Signals", value: overview?.metrics.critical_signals_count ?? 0, color: "text-rose-400", bg: "border-rose-500/20 bg-rose-500/5" },
          { label: "New IP Signals", value: overview?.metrics.new_ip_signals_count ?? 0, color: "text-blue-400", bg: "border-blue-500/20 bg-blue-500/5" },
          { label: "Competitor Signals", value: overview?.metrics.competitor_signals_count ?? 0, color: "text-amber-400", bg: "border-amber-500/20 bg-amber-500/5" },
          { label: "Technology Signals", value: overview?.metrics.technology_signals_count ?? 0, color: "text-purple-400", bg: "border-purple-500/20 bg-purple-500/5" },
          { label: "Market Signals", value: overview?.metrics.market_signals_count ?? 0, color: "text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/5" },
          { label: "Regulatory Changes", value: overview?.metrics.regulatory_changes_count ?? 0, color: "text-rose-400", bg: "border-rose-500/20 bg-rose-500/5" },
          { label: "Portfolio Risks", value: overview?.metrics.portfolio_risks_count ?? 0, color: "text-indigo-400", bg: "border-indigo-500/20 bg-indigo-500/5" },
          { label: "White-Space Opps", value: overview?.metrics.white_space_opportunities_count ?? 0, color: "text-teal-400", bg: "border-teal-500/20 bg-teal-500/5" },
        ].map((m, i) => (
          <div key={i} className={`p-3 rounded-lg border flex flex-col justify-between ${m.bg}`}>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {m.label}
            </span>
            <div className={`text-xl sm:text-2xl font-extrabold mt-1 ${m.color}`}>
              {loading ? <Skeleton className="h-7 w-12" /> : m.value}
            </div>
          </div>
        ))}
      </div>

      {/* 3. STRATEGIC INTELLIGENCE HEALTH */}
      <IntelligenceHealthWidget 
        health={overview?.health}
        activeModule={activeModule}
        onSelectModule={(mod) => setActiveModule(mod)}
      />

      {/* 4. CROSS-INTELLIGENCE CORRELATION ENGINE */}
      <CrossIntelligencePanel correlations={overview?.cross_correlations} />

      {/* 5. MODULE NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/40 scrollbar-none">
        {MODULE_TABS.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => setActiveModule(type)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeModule === type
                ? "bg-[#175a74] text-white shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 6. SEARCH & IMPACT FILTERS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-card/40 border border-border/40">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search signals, patents, competitors, technologies, or risks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Impact:
          </span>
          {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((lvl) => (
            <Button
              key={lvl}
              variant={impactFilter === lvl ? "default" : "outline"}
              size="sm"
              onClick={() => setImpactFilter(lvl)}
              className={`text-xs h-8 px-2.5 ${impactFilter === lvl ? "bg-[#175a74] hover:bg-[#114459] text-white" : ""}`}
            >
              {lvl}
            </Button>
          ))}
          {(searchQuery || impactFilter !== "ALL" || activeModule !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setImpactFilter("ALL");
                setActiveModule("ALL");
              }}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* 7. SIGNALS FEED */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <span>Executive Intelligence Feed</span>
            <span className="text-xs font-mono text-muted-foreground font-normal">
              ({filteredSignals.length} {filteredSignals.length === 1 ? "signal" : "signals"})
            </span>
          </h3>
          <span className="text-xs text-muted-foreground">
            Decision Framework: DATA ➔ INSIGHT ➔ IMPACT ➔ ACTION
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredSignals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-card/20 p-6 space-y-3">
            <Compass className="w-8 h-8 text-muted-foreground mx-auto" />
            <h4 className="text-base font-bold text-foreground">No matching intelligence signals</h4>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              No active intelligence records match your current filter parameters. Try adjusting your search query or selecting "All Modules".
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setImpactFilter("ALL");
                setActiveModule("ALL");
              }}
              className="text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSignals.map((signal) => (
              <IntelligenceSignalCard
                key={signal.id}
                signal={signal}
                onRefresh={() => loadData(false)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
