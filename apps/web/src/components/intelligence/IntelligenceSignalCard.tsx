"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ShieldAlert, Sparkles, Building2, Lightbulb, Compass, 
  ExternalLink, Eye, Bookmark, PlusCircle, CheckCircle2, 
  ArrowRight, ShieldCheck, AlertTriangle, TrendingUp, Layers,
  FileText, Check, Cpu, Globe2, Scale
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IntelligenceSignal, IntelligenceModuleType } from "@/types/intelligence";

const MODULE_ICONS: Record<IntelligenceModuleType, React.ElementType> = {
  IP: Sparkles,
  COMPETITIVE: Building2,
  TECHNOLOGY: TrendingUp,
  MARKET: Globe2,
  INNOVATION: Lightbulb,
  REGULATORY: Scale,
  PORTFOLIO: ShieldCheck,
  WHITE_SPACE: Compass,
};

const MODULE_COLORS: Record<IntelligenceModuleType, string> = {
  IP: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  COMPETITIVE: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  TECHNOLOGY: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  MARKET: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  INNOVATION: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
  REGULATORY: "border-rose-500/30 text-rose-400 bg-rose-500/10",
  PORTFOLIO: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10",
  WHITE_SPACE: "border-teal-500/30 text-teal-400 bg-teal-500/10",
};

interface SignalCardProps {
  signal: IntelligenceSignal;
  onRefresh?: () => void;
}

export function IntelligenceSignalCard({ signal, onRefresh }: SignalCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [isSaved, setIsSaved] = useState(signal.status === "WATCHLIST");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const Icon = MODULE_ICONS[signal.type] || Sparkles;
  const colorClass = MODULE_COLORS[signal.type] || "border-gray-500/30 text-gray-400 bg-gray-500/10";

  const handleSave = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ceo/intelligence/${signal.id}/save`, { method: "POST" });
      if (res.ok) {
        setIsSaved(true);
        setActionNotice("Signal added to CEO Watchlist.");
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOpportunity = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ceo/intelligence/${signal.id}/create-opportunity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Opportunity: ${signal.title}`,
          notes: signal.opportunity,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionNotice(`Opportunity ${data.opportunity?.id || ""} created & linked.`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateIdea = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/ceo/intelligence/${signal.id}/create-idea`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea_title: `Invention Concept: ${signal.title}`,
          problem: signal.what_changed,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionNotice(`Invention idea ${data.idea?.id || ""} drafted for review.`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Card className="border border-border/60 bg-card/60 backdrop-blur-md hover:border-border transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${colorClass}`}>
              <Icon className="w-3.5 h-3.5" />
              {signal.type} INTELLIGENCE
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {signal.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={signal.impact_level === "HIGH" ? "destructive" : signal.impact_level === "MEDIUM" ? "default" : "secondary"}
              className="text-xs font-bold"
            >
              IMPACT: {signal.impact_level}
            </Badge>
            <Badge variant="outline" className="text-xs font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              CONFIDENCE {signal.confidence}%
            </Badge>
          </div>
        </div>

        <CardTitle className="text-lg font-bold text-foreground leading-snug">
          {signal.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Source: <strong className="text-foreground">{signal.source}</strong> • Detected: {new Date(signal.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {/* WHAT CHANGED & WHY IT MATTERS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              What Changed?
            </h4>
            <p className="text-xs leading-relaxed text-foreground">
              {signal.what_changed}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Why It Matters
            </h4>
            <p className="text-xs leading-relaxed text-foreground">
              {signal.why_it_matters}
            </p>
          </div>
        </div>

        {/* RISK & OPPORTUNITY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Strategic Risk
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {signal.risk}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-teal-500/20 bg-teal-500/5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400 uppercase tracking-wider mb-1">
              <Lightbulb className="w-3.5 h-3.5" />
              Strategic Opportunity
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">
              {signal.opportunity}
            </p>
          </div>
        </div>

        {/* RECOMMENDED ACTION */}
        <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-2">
          <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="text-primary font-semibold">Recommended CEO Action: </strong>
            <span className="text-foreground">{signal.recommended_action}</span>
          </div>
        </div>

        {/* CONNECTED MOAT ENTITIES */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-xs">
          <span className="text-muted-foreground font-semibold">Connected:</span>
          {signal.related_competitors.map((c, i) => (
            <Badge key={i} variant="outline" className="border-amber-500/30 text-amber-300 bg-amber-500/5 gap-1">
              <Building2 className="w-3 h-3" />
              {c.name}
            </Badge>
          ))}
          {signal.related_technologies.map((t, i) => (
            <Badge key={i} variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/5 gap-1">
              <Cpu className="w-3 h-3" />
              {t.name}
            </Badge>
          ))}
          {signal.related_inventions.map((inv, i) => (
            <Badge key={i} variant="outline" className="border-cyan-500/30 text-cyan-300 bg-cyan-500/5 gap-1">
              <Layers className="w-3 h-3" />
              {inv.ref}: {inv.title}
            </Badge>
          ))}
        </div>

        {/* ACTION NOTICE TOAST */}
        {actionNotice && (
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* CEO ACTION TOOLBAR & EVIDENCE BUTTON */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEvidence(!showEvidence)}
              className="text-xs h-8 gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              {showEvidence ? "Hide Evidence" : "View Evidence"}
            </Button>
            {signal.source_url && (
              <a 
                href={signal.source_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant={isSaved ? "secondary" : "outline"}
              size="sm"
              disabled={actionLoading || isSaved}
              onClick={handleSave}
              className="text-xs h-8 gap-1"
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-current text-primary" : ""}`} />
              {isSaved ? "Saved" : "Save"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={handleCreateOpportunity}
              className="text-xs h-8 gap-1"
            >
              <Compass className="w-3.5 h-3.5" />
              Opportunity
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={actionLoading}
              onClick={handleCreateIdea}
              className="text-xs h-8 gap-1 bg-[#175a74] hover:bg-[#114459] text-white"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Idea
            </Button>
          </div>
        </div>

        {/* EXPANDABLE EVIDENCE PANEL */}
        {showEvidence && (
          <div className="p-3.5 rounded-lg bg-black/40 border border-primary/20 space-y-2 mt-2">
            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Evidence Provenance & Audit Trail
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Verified: {signal.evidence.published_date}
              </span>
            </div>
            <div className="text-xs text-foreground/90 space-y-1.5">
              <p><strong className="text-muted-foreground">Source Registry:</strong> {signal.evidence.source}</p>
              <p><strong className="text-muted-foreground">Relevant Extraction:</strong> {signal.evidence.relevant_data}</p>
              <p><strong className="text-muted-foreground">Reasoning Rationale:</strong> {signal.evidence.reasoning_summary}</p>
              <div>
                <strong className="text-muted-foreground">Corroborating Evidence:</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs text-foreground/80">
                  {signal.evidence.supporting_evidence.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
