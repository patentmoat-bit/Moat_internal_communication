"use client";

import { ArrowRight, CheckCircle2, Clock3, Database, FileInput, Layers3, LockKeyhole, Network, PlugZap, ShieldCheck, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type ModuleWorkbenchProps = {
  index: number;
  title: string;
  status?: "live" | "ready" | "planned";
  summary: string;
  inputs: string[];
  outputs: string[];
  engines: string[];
  api: string;
  data: string[];
  controls?: string[];
};

const statusTone = {
  live: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  ready: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  planned: "bg-amber-500/10 text-amber-300 border-amber-500/20",
};

export function ModuleWorkbench({
  index,
  title,
  status = "ready",
  summary,
  inputs,
  outputs,
  engines,
  api,
  data,
  controls = ["Role-based access", "Audit logging", "Workspace scoping"],
}: ModuleWorkbenchProps) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Module {index}</Badge>
            <Badge variant="outline" className={statusTone[status]}>{status}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </div>
        <Button className="gap-2 lg:mt-8">
          Open Workflow <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><FileInput className="h-4 w-4 text-primary" />Inputs</CardTitle>
            <CardDescription className="text-xs">Accepted module inputs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {inputs.map((item) => <div key={item} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{item}</div>)}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><Workflow className="h-4 w-4 text-blue-400" />Processing Engines</CardTitle>
            <CardDescription className="text-xs">Backend service responsibilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {engines.map((item) => <div key={item} className="rounded-md border border-border/70 px-3 py-2 text-sm text-muted-foreground">{item}</div>)}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><Layers3 className="h-4 w-4 text-amber-400" />Outputs</CardTitle>
            <CardDescription className="text-xs">Structured result payloads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {outputs.map((item) => <div key={item} className="flex items-center gap-2 text-sm"><Clock3 className="h-4 w-4 text-muted-foreground" />{item}</div>)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><Network className="h-4 w-4 text-primary" />Architecture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {["UI Console", "API Router", "Service Engine", "Storage/Graph"].map((step, idx) => (
                <div key={step} className="rounded-lg border border-border/70 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">Step {idx + 1}</p>
                  <p className="mt-1 text-sm font-semibold">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><PlugZap className="h-4 w-4 text-primary" />API Contract</div>
              <code className="mt-2 block rounded-md bg-background p-3 text-xs text-muted-foreground">{api}</code>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-emerald-400" />Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {controls.map((item) => <div key={item} className="flex items-center gap-2 text-sm"><LockKeyhole className="h-4 w-4 text-muted-foreground" />{item}</div>)}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-[#c9a84c]" />Data Dependencies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
        </CardContent>
      </Card>
    </div>
  );
}
