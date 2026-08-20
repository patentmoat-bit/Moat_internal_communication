"use client";

import { useMemo, useState } from "react";
import { BrainCircuit, FileImage, FileText, Image as ImageIcon, Layers3, Lightbulb, Loader2, Microchip, Network, Upload, Wand2 } from "lucide-react";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const modes = [
  { id: "text", label: "Text", icon: FileText },
  { id: "pdf", label: "PDF", icon: Upload },
  { id: "patent", label: "Patent", icon: Layers3 },
  { id: "diagram", label: "Diagram", icon: Network },
  { id: "image", label: "Image", icon: ImageIcon },
] as const;

type Mode = typeof modes[number]["id"];

type UnderstandingResult = {
  source_type: string;
  source_label: string;
  technical_summary: string;
  innovation_summary: string;
  core_components: Array<{ name: string; function: string; evidence?: string | null }>;
  technical_domains: Array<{ name: string; confidence: number }>;
  differentiators: Array<{ differentiator: string; why_it_matters: string }>;
  extracted_text_preview: string;
  confidence: number;
  warnings: string[];
};

const sampleText = `A wearable physiological monitoring device includes an optical sensor array, a low-power signal processor, and an adaptive calibration engine. The processor filters motion noise in real time, derives pulse and oxygenation features, and securely transmits encrypted health events to a mobile application. The adaptive calibration engine adjusts emitter intensity based on skin tone, perfusion, and ambient light to reduce false readings without increasing battery drain.`;

function confidenceLabel(value: number) {
  if (value >= 0.8) return "High";
  if (value >= 0.6) return "Medium";
  return "Draft";
}

function ResultPanel({ result }: { result: UnderstandingResult }) {
  return (
    <div className="space-y-5">
      <Card className="border-border/70">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Analyzed Source</p>
              <h2 className="mt-1 text-xl font-bold">{result.source_label}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{result.source_type}</Badge>
              <Badge className="bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/10">{confidenceLabel(result.confidence)} confidence</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><BrainCircuit className="h-4 w-4 text-primary" />Technical Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">{result.technical_summary}</CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><Lightbulb className="h-4 w-4 text-amber-400" />Innovation Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">{result.innovation_summary}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><Microchip className="h-4 w-4 text-blue-400" />Core Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.core_components.map((component, index) => (
              <div key={`${component.name}-${index}`} className="rounded-lg border border-border/70 p-3">
                <p className="text-sm font-semibold">{component.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{component.function}</p>
                {component.evidence && <p className="mt-2 text-[11px] text-muted-foreground/70">Evidence: {component.evidence}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Technical Domains</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.technical_domains.map((domain) => (
              <div key={domain.name}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold">{domain.name}</span>
                  <span className="text-muted-foreground">{Math.round(domain.confidence * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(domain.confidence * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Differentiators</CardTitle>
          <CardDescription className="text-xs">Potentially distinguishing technical characteristics, not legal conclusions.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {result.differentiators.map((item, index) => (
            <div key={index} className="rounded-lg border border-border/70 p-3">
              <p className="text-sm font-semibold">{item.differentiator}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.why_it_matters}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {(result.warnings.length > 0 || result.extracted_text_preview) && (
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Extraction Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.warnings.map((warning, index) => <p key={index} className="text-xs text-amber-400">{warning}</p>)}
            <pre className="max-h-44 overflow-auto rounded-md bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">{result.extracted_text_preview}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function UnderstandingPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState(sampleText);
  const [patentNumber, setPatentNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnderstandingResult | null>(null);

  const activeMode = useMemo(() => modes.find((item) => item.id === mode)!, [mode]);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("input_type", mode);
      form.set("text", text);
      if (patentNumber) form.set("patent_number", patentNumber);
      if (file) form.set("file", file);
      const response = await fetch("/api/understanding/analyze", { method: "POST", body: form });
      if (!response.ok) throw new Error("Analysis failed");
      setResult(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ErrorBoundary>
      <div className="mx-auto max-w-7xl space-y-6 pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><BrainCircuit className="h-6 w-6 text-primary" />Invention Understanding Engine</h1>
            <p className="mt-1 text-xs text-muted-foreground">Convert text, PDFs, patents, diagrams, and images into structured technical understanding.</p>
          </div>
          <Button onClick={analyze} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate Understanding
          </Button>
        </div>

        <Separator />

        <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
          <Card className="border-border/70 h-fit">
            <CardHeader>
              <CardTitle className="text-sm">Input</CardTitle>
              <CardDescription className="text-xs">Choose a source type and provide the invention material.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <TabsList className="grid h-auto grid-cols-5">
                  {modes.map((item) => <TabsTrigger key={item.id} value={item.id} className="px-2"><item.icon className="h-4 w-4" /></TabsTrigger>)}
                </TabsList>
                {modes.map((item) => <TabsContent key={item.id} value={item.id} className="mt-3 text-xs text-muted-foreground">{item.label} input mode</TabsContent>)}
              </Tabs>

              <div className="rounded-lg border border-border/70 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><activeMode.icon className="h-4 w-4 text-primary" />{activeMode.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">The engine generates technical summary, innovation summary, components, domains, and differentiators.</p>
              </div>

              {mode === "patent" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Patent number or ID</label>
                  <Input value={patentNumber} onChange={(event) => setPatentNumber(event.target.value)} placeholder="US12345678B2" />
                </div>
              )}

              {(mode === "pdf" || mode === "diagram" || mode === "image") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Upload {mode}</label>
                  <Input type="file" accept={mode === "pdf" ? ".pdf,application/pdf" : "image/*"} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                  {file && <p className="text-[11px] text-muted-foreground"><FileImage className="mr-1 inline h-3 w-3" />{file.name}</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Context text</label>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={11}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Paste abstract, claims, technical description, diagram labels, or visible image text..."
                />
              </div>

              {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            </CardContent>
          </Card>

          {result ? (
            <ResultPanel result={result} />
          ) : (
            <Card className="border-dashed border-border/70">
              <CardContent className="flex min-h-[560px] flex-col items-center justify-center text-center">
                <BrainCircuit className="mb-4 h-14 w-14 text-muted-foreground/40" />
                <h2 className="text-sm font-semibold">Ready to understand an invention</h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">Start with the sample text, paste your own disclosure, or upload a document/visual artifact. Results will appear here as structured engineering intelligence.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
