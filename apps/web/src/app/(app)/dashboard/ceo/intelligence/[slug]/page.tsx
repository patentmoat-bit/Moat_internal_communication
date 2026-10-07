"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, RefreshCw, Download, Sparkles, Building2, TrendingUp,
  Globe2, Lightbulb, Scale, ShieldCheck, Compass, AlertTriangle, 
  CheckCircle2, Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IntelligenceModuleType, IntelligenceModuleResponse } from "@/types/intelligence";
import { IntelligenceSignalCard } from "@/components/intelligence/IntelligenceSignalCard";

const MODULE_MAP: Record<string, IntelligenceModuleType> = {
  ip: "IP",
  competitive: "COMPETITIVE",
  technology: "TECHNOLOGY",
  market: "MARKET",
  innovation: "INNOVATION",
  regulatory: "REGULATORY",
  portfolio: "PORTFOLIO",
  "white-space": "WHITE_SPACE",
  whitespace: "WHITE_SPACE",
};

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

export default function ModuleIntelligencePage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "ip";
  const moduleType = MODULE_MAP[slug.toLowerCase()] || "IP";
  const Icon = MODULE_ICONS[moduleType] || Sparkles;

  const [moduleData, setModuleData] = useState<IntelligenceModuleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadModule = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ceo/intelligence/${slug}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setModuleData(json.data);
        }
      }
    } catch (e) {
      console.error("Error loading module intelligence:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModule();
  }, [slug]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/ceo/intelligence", { method: "POST" });
      await loadModule();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/ceo/intelligence"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Command Center
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs h-8 gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Module Title Header */}
      <div className="border-b border-border/40 pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <Badge variant="outline" className="text-xs uppercase tracking-wider font-bold py-1 px-2.5 gap-1.5 bg-primary/10 text-primary border-primary/30">
            <Icon className="w-3.5 h-3.5" />
            {moduleType} INTELLIGENCE SUITE
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
          {moduleData?.title || `${moduleType} Intelligence`}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          {moduleData?.description}
        </p>
      </div>

      {/* Module Summary Stats */}
      {moduleData?.module_stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(moduleData.module_stats).map(([k, v]) => (
            <div key={k} className="p-3.5 rounded-lg border border-border/40 bg-card/40">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {k}
              </div>
              <div className="text-xl font-bold text-foreground mt-1">
                {v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key Findings, Top Risk, Top Opportunity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border/40 bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Key Findings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {moduleData?.key_findings.map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-primary font-bold">•</span>
                <span className="text-foreground/90">{f}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-rose-500/20 bg-rose-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Highest Strategic Risk
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-foreground/90">
            {moduleData?.top_risk}
          </CardContent>
        </Card>

        <Card className="border border-teal-500/20 bg-teal-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Highest Opportunity
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-foreground/90">
            {moduleData?.top_opportunity}
          </CardContent>
        </Card>
      </div>

      {/* Signals Feed for this module */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">
          {moduleType} Intelligence Signals ({moduleData?.signals.length || 0})
        </h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((n) => <Skeleton key={n} className="h-44 w-full rounded-lg" />)}
          </div>
        ) : moduleData?.signals.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border/60 rounded-xl p-4 text-muted-foreground text-xs">
            No active signals recorded for this module.
          </div>
        ) : (
          <div className="space-y-4">
            {moduleData?.signals.map((signal) => (
              <IntelligenceSignalCard key={signal.id} signal={signal} onRefresh={loadModule} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
