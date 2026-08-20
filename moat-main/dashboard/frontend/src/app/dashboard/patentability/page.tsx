"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BriefcaseBusiness, ClipboardCheck, FileText, Gavel, Loader2, Scale, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

import { useAnalysis } from "@/components/decision/useAnalysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { parseConcepts } from "@/lib/analysis/shared";
import { cn } from "@/lib/utils";
import type { CriterionVerdict, EvaluationCriterion, PatentabilityAssessment } from "@/lib/analysis/patentability";

const VERDICT_TONE: Record<CriterionVerdict, string> = {
  pass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  caution: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  risk: "border-rose-500/20 bg-rose-500/10 text-rose-700",
};

const SEVERITY_TONE: Record<string, string> = {
  low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  medium: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  high: "border-rose-500/20 bg-rose-500/10 text-rose-700",
};

function PatentabilityInner() {
  const params = useSearchParams();
  const { data, loading, error, run } = useAnalysis<PatentabilityAssessment>("/api/patentability");
  const [query, setQuery] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    const q = params.get("q") || "";
    const concepts = parseConcepts(params.get("concepts"));
    setQuery(q);
    if (q && !ran.current) {
      ran.current = true;
      run(q, concepts);
    }
  }, [params, run]);

  const doRun = (mode: "complete" | "partial" | "standard" = "standard") => {
    run(query, parseConcepts(params.get("concepts")), { project_id: params.get("project_id"), mode });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700">live</Badge>
            {params.get("project_id") && <Badge variant="secondary">Project Attached</Badge>}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Patent Filing Strategy (PFS) Generator</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Evaluate novelty, utility, non-obviousness, enablement, commercial potential, and defensibility before filing.
          </p>
        </div>
      </div>

      <Separator />

      {params.get("project_id") && <OrchestrationPanel projectId={params.get("project_id")!} onGenerate={(mode) => doRun(mode)} loading={loading} />}

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Scale className="h-4 w-4 text-[#c9a84c]" />Run patent evaluation</CardTitle>
          <CardDescription>Generate filing scores, recommendation logic, a patentability report, and attorney review package.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) doRun("standard");
              }}
              rows={3}
              placeholder="Describe the invention, technical implementation, target market, and known prior art..."
              className="min-h-[92px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button onClick={() => doRun("standard")} disabled={loading || !query.trim()} className="gap-2 lg:h-10">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Evaluating" : "Evaluate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
      {loading && !data && <LoadingState />}
      {data && <Results data={data} />}
    </div>
  );
}

function OrchestrationPanel({ projectId, onGenerate, loading }: { projectId: string; onGenerate: (mode: "complete" | "partial") => void; loading: boolean }) {
  const [searches, setSearches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/searches`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSearches(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [projectId]);

  const expectedTypes = ["NOVELTY", "FTO", "LANDSCAPE", "INVALIDITY"];
  
  if (isLoading) return null;

  return (
    <Card className="border-[#c9a84c]/30 bg-[#c9a84c]/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Available Project Searches</CardTitle>
        <CardDescription>Detected completed searches for PFS Orchestration</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {expectedTypes.map(type => {
            const found = searches.find(s => s.search_type === type);
            if (!found) return <Badge key={type} variant="outline" className="text-muted-foreground">{type} (Pending)</Badge>;
            if (found.search_status === "IN_PROGRESS") return <Badge key={type} variant="secondary" className="border-amber-500/20 text-amber-600">{type} (In Progress)</Badge>;
            return <Badge key={type} className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">{type} (Completed)</Badge>;
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => onGenerate("complete")} disabled={loading} size="sm" className="bg-[#c9a84c] text-black hover:bg-[#c9a84c]/90">
            Generate Complete Report
          </Button>
          <Button onClick={() => onGenerate("partial")} disabled={loading} size="sm" variant="outline">
            Generate Partial Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Results({ data }: { data: PatentabilityAssessment }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              Prosecution Outlook
              <Badge variant="secondary" className="capitalize">{data.outlook}</Badge>
            </CardTitle>
            <CardDescription>{data.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Executive Summary</p>
              <p className="mt-2 text-sm leading-relaxed">{data.executive_summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[#c9a84c] text-[#131309] hover:bg-[#c9a84c]">{data.recommendation.action}</Badge>
              {data.source === "mock" && <Badge variant="outline">offline model</Badge>}
              <Badge variant="outline">{data.invention}</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <ScoreCard label="Patentability" value={data.patentability_score} icon={<ClipboardCheck className="h-4 w-4" />} goodHigh />
          <ScoreCard label="Risk" value={data.risk_score} icon={<ShieldCheck className="h-4 w-4" />} />
          <ScoreCard label="Strength" value={data.strength_score} icon={<Gavel className="h-4 w-4" />} goodHigh />
          <ScoreCard label="Commercial Value" value={data.commercial_value_score} icon={<TrendingUp className="h-4 w-4" />} goodHigh />
        </div>
      </div>

      <EvaluationMatrix criteria={data.criteria} />

      <div className="grid gap-4 lg:grid-cols-3">
        <FactorList title="Risk Factors" items={data.risk_factors.map((item) => ({ title: item.issue, meta: `${item.probability}% probability`, badge: item.severity, badgeClass: SEVERITY_TONE[item.severity], body: item.mitigation, value: item.probability, invert: true }))} />
        <FactorList title="Strength Factors" items={data.strength_factors.map((item) => ({ title: item.factor, meta: `${item.score}/100`, body: item.rationale, value: item.score }))} />
        <FactorList title="Commercial Signals" items={data.commercial_signals.map((item) => ({ title: item.signal, meta: `${item.score}/100`, body: item.rationale, value: item.score }))} />
      </div>

      <Card className="border-[#c9a84c]/30 bg-[#c9a84c]/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recommendation Engine</CardTitle>
          <CardDescription>{data.recommendation.rationale}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
            <div className="rounded-lg border border-[#c9a84c]/30 bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision</p>
              <p className="mt-2 text-lg font-bold text-[#8a6a1e]">{data.recommendation.action}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.recommendation.next_steps.map((step) => (
                <div key={step} className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm">{step}</div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSections data={data} />
      <AttorneyPackage data={data} />

      <p className="text-xs leading-relaxed text-muted-foreground">
        PFS provides research assistance, not legal advice. Patentability conclusions should be reviewed by qualified patent counsel before any filing decision.
      </p>
    </motion.div>
  );
}

function LoadingState() {
  const steps = ["Evaluating novelty and utility", "Testing non-obviousness and enablement", "Scoring strength, risk, and commercial value", "Generating report and attorney package"];
  return (
    <Card className="border-border/70">
      <CardContent className="space-y-3 p-5">
        {steps.map((step) => <div key={step} className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin text-primary" />{step}</div>)}
      </CardContent>
    </Card>
  );
}

function ScoreCard({ label, value, icon, goodHigh = false }: { label: string; value: number; icon: ReactNode; goodHigh?: boolean }) {
  const good = goodHigh ? value >= 70 : value <= 35;
  const warn = goodHigh ? value >= 50 : value <= 65;
  const color = good ? "text-emerald-600" : warn ? "text-amber-600" : "text-rose-600";
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">{icon}<span className="text-xs font-medium uppercase tracking-wide">{label}</span></div>
        <div className={cn("mt-2 text-3xl font-bold tracking-tight", color)}>{value}%</div>
        <Meter value={value} invert={!goodHigh} className="mt-3" />
      </CardContent>
    </Card>
  );
}

function EvaluationMatrix({ criteria }: { criteria: EvaluationCriterion[] }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Evaluation Matrix</CardTitle>
        <CardDescription>Patentability criteria scored by filing importance and prosecution risk.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border rounded-lg border border-border/70 p-0">
        {criteria.map((item) => (
          <div key={item.name} className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{item.name}</p>
                  <Badge variant="outline" className={VERDICT_TONE[item.verdict]}>{item.verdict}</Badge>
                  <Badge variant="secondary">Weight {item.weight}%</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.finding}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-xl font-bold">{item.score}</div>
                <div className="text-xs text-muted-foreground">/100</div>
              </div>
            </div>
            <Meter value={item.score} className="mt-3" />
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <MiniList title="Evidence Needed" items={item.evidence_needed} />
              <MiniList title="Improvement Actions" items={item.improvement_actions} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FactorList({ title, items }: { title: string; items: { title: string; meta: string; body: string; value: number; invert?: boolean; badge?: string; badgeClass?: string }[] }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-lg border border-border/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
              </div>
              {item.badge && <Badge variant="outline" className={item.badgeClass}>{item.badge}</Badge>}
            </div>
            <Meter value={item.value} invert={item.invert} className="mt-3" />
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReportSections({ data }: { data: PatentabilityAssessment }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-primary" />Patentability Report</CardTitle>
        <CardDescription>Structured report generated for internal filing review.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {data.patentability_report.map((section) => (
          <div key={section.title} className="rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold">{section.title}</p>
            <ul className="mt-3 space-y-2">
              {section.bullets.map((bullet) => <li key={bullet} className="text-sm leading-relaxed text-muted-foreground">{bullet}</li>)}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AttorneyPackage({ data }: { data: PatentabilityAssessment }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm"><BriefcaseBusiness className="h-4 w-4 text-primary" />Attorney Review Package</CardTitle>
        <CardDescription>Materials counsel should review before drafting or filing.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-2">
        {data.attorney_review_package.map((item) => (
          <div key={item.item} className="rounded-lg border border-border/70 p-4">
            <p className="text-sm font-semibold">{item.item}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.purpose}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.materials.map((material) => <Badge key={material} variant="secondary">{material}</Badge>)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => <p key={item} className="text-xs leading-relaxed text-muted-foreground">{item}</p>)}
      </div>
    </div>
  );
}

function Meter({ value, invert = false, className }: { value: number; invert?: boolean; className?: string }) {
  const good = invert ? value < 40 : value >= 66;
  const bad = invert ? value >= 66 : value < 40;
  const color = good ? "bg-emerald-500" : bad ? "bg-rose-500" : "bg-amber-500";
  return <div className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}><div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export default function PatentabilityPage() {
  return (
    <Suspense fallback={null}>
      <PatentabilityInner />
    </Suspense>
  );
}
