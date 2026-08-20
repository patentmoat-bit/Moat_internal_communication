"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, CornerDownLeft, Loader2, ShieldQuestion } from "lucide-react";
import { DECISION_MODES, type DecisionModeId } from "@/lib/decisionModes";
import { ConfidenceMeter } from "@/components/decision/ConfidenceMeter";
import { cn } from "@/lib/utils";

const SERIF = "[font-family:var(--font-playfair)]";
const MONO = "[font-family:var(--font-mono)]";

type Confidence = "high" | "medium" | "low";

interface DecisionBrief {
  interpreted_invention: string;
  recommended_mode: DecisionModeId;
  confidence: Confidence;
  rationale: string;
  alternate_modes: { mode: DecisionModeId; confidence: Confidence; why: string }[];
  technologies: { name: string; relevance: number; what_it_is: string }[];
  source: "ai" | "heuristic";
}

const SAMPLES = [
  "A wearable patch that measures blood glucose optically using near-infrared light and an on-device ML calibration model.",
  "Can we launch a drone delivery system that hands off packages between autonomous vehicles without infringing existing patents?",
  "Is US10987234B2 vulnerable — find art that could invalidate its independent claims.",
  "Map the IP landscape and white space around solid-state battery electrolytes.",
];

const LOADING_STEPS = [
  "Parsing invention language…",
  "Classifying search intent…",
  "Extracting technical concepts…",
  "Assembling decision brief…",
];

export default function DecisionPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<DecisionBrief | null>(null);
  const [chosenMode, setChosenMode] = useState<DecisionModeId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = useCallback(async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setBrief(null);
    setStep(0);

    stepTimer.current = setInterval(() => {
      setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 650);

    try {
      const res = await fetch("/api/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Request failed");
      const data: DecisionBrief = await res.json();
      setBrief(data);
      setChosenMode(data.recommended_mode);
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again.");
    } finally {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setLoading(false);
    }
  }, [query, loading]);

  const handoff = useCallback(() => {
    if (!brief || !chosenMode) return;
    const mode = DECISION_MODES[chosenMode];
    const concepts = brief.technologies.map((t) => t.name).join(",");
    const params = new URLSearchParams({ q: brief.interpreted_invention || query, mode: chosenMode, concepts });
    router.push(`${mode.route}?${params.toString()}`);
  }, [brief, chosenMode, query, router]);

  const activeMode = chosenMode ? DECISION_MODES[chosenMode] : null;

  return (
    <div className="relative -m-4 min-h-full overflow-hidden pfs-page md:-m-6 lg:-m-8">
      {/* warm wash + paper grain */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(120% 60% at 50% -10%, rgba(214,178,108,0.08), transparent 60%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 py-12 md:px-8">
        {/* masthead */}
        <div className="flex items-end justify-between border-b border-[hsl(var(--border))] pb-3">
          <div className="flex items-baseline gap-3">
            <span className={cn("text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]", SERIF)}>PFS</span>
            <span className={cn("text-[10px] uppercase tracking-[0.32em] pfs-muted", MONO)}>Patent Finder System</span>
          </div>
          <span className={cn("text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--primary))]", MONO)}>Decision Intelligence</span>
        </div>

        {/* command */}
        <div className="pt-11">
          <h1 className={cn("text-[34px] font-semibold leading-[1.08] text-[hsl(var(--foreground))] md:text-[44px]", SERIF)}>
            Describe the invention.
            <br />
            PFS decides how to investigate it.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed pfs-muted">
            One line or a full disclosure. The system picks the right analysis — novelty, FTO,
            invalidity, patentability, landscape — and maps the technologies it covers, before any
            search runs.
          </p>

          <div className="relative mt-7 border-l-2 border-[hsl(var(--primary))]/60 bg-[hsl(var(--card))] pl-px">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
              }}
              placeholder="e.g. Is a wearable optical glucose sensor with on-device ML calibration novel?"
              rows={3}
              className="w-full resize-none border border-l-0 border-[hsl(var(--border))] bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]/60"
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className={cn("text-[11px] pfs-muted", MONO)}>
              <CornerDownLeft className="mr-1 inline h-3 w-3" /> ⌘ + Enter to run
            </span>
            <button
              onClick={run}
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-6 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:bg-[hsl(var(--primary))]/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Analyzing" : "Run analysis"}
            </button>
          </div>

          {/* sample chips */}
          {!brief && !loading && (
            <div className="mt-6 flex flex-wrap gap-2">
              {SAMPLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="max-w-full truncate border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-left text-xs pfs-muted transition hover:border-[hsl(var(--primary))]/45 hover:text-[hsl(var(--foreground))]"
                  title={s}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* loading console */}
        {loading && (
          <div className={cn("mt-10 space-y-2 pfs-panel p-5", MONO)}>
            {LOADING_STEPS.map((s, i) => (
              <div
                key={s}
                className={cn(
                  "flex items-center gap-2.5 text-[13px] transition-opacity",
                  i <= step ? "text-[hsl(var(--foreground))] opacity-100" : "pfs-muted opacity-50",
                )}
              >
                <span className="text-[hsl(var(--primary))]">{i < step ? "✓" : i === step ? "—" : "·"}</span>
                {s}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-8 border-l-2 border-rose-500/70 bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-500 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* result */}
        <AnimatePresence>
          {brief && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-12 space-y-7"
            >
              {/* interpreted */}
              <div>
                <Label>Interpreted invention</Label>
                <p className="mt-3 text-base leading-relaxed text-[hsl(var(--foreground))]">{brief.interpreted_invention}</p>
                {brief.source === "heuristic" && (
                  <p className={cn("mt-2 text-[11px] text-[hsl(var(--primary))]", MONO)}>
                    — offline mode · generated without the AI model (no API key / call failed)
                  </p>
                )}
              </div>

              {/* recommended mode */}
              <div className="border-l-2 border-[hsl(var(--primary))]/70 bg-[hsl(var(--primary))]/10 p-5 pl-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label>Recommended analysis</Label>
                    <h2 className={cn("mt-2.5 text-3xl font-semibold text-[hsl(var(--foreground))]", SERIF)}>{activeMode?.label}</h2>
                    <p className="mt-1 text-sm pfs-muted">{activeMode?.question}</p>
                  </div>
                  <ConfidenceMeter value={brief.confidence} className="shrink-0 pt-1" />
                </div>
                <p className="mt-4 border-l border-[hsl(var(--primary))]/45 pl-3 text-sm leading-relaxed text-[hsl(var(--foreground))]">
                  {brief.rationale}
                </p>
                <button
                  onClick={handoff}
                  className="mt-5 inline-flex items-center gap-2 bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:bg-[hsl(var(--primary))]/85"
                >
                  Run {activeMode?.label} <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>

              {/* alternates */}
              {brief.alternate_modes.length > 0 && (
                <div>
                  <Label>Or pursue a different angle</Label>
                  <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
                    {brief.alternate_modes.map((alt) => {
                      const m = DECISION_MODES[alt.mode];
                      const active = chosenMode === alt.mode;
                      return (
                        <button
                          key={alt.mode}
                          onClick={() => setChosenMode(alt.mode)}
                          className={cn(
                            "border p-3.5 text-left transition",
                            active ? "border-[hsl(var(--primary))]/55 bg-[hsl(var(--primary))]/10" : "border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary))]/35",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn("text-base font-semibold", SERIF, m.accent.split(" ")[0])}>{m.label}</span>
                            <span className={cn("text-[10px] uppercase tracking-[0.16em] pfs-muted", MONO)}>{alt.confidence}</span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed pfs-muted">{alt.why}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* technologies */}
              <div>
                <Label>Technology covered</Label>
                <div className="mt-3.5 border-t border-[hsl(var(--border))]">
                  {brief.technologies.map((t) => (
                    <div key={t.name} className="flex items-center gap-4 border-b border-[hsl(var(--border))] px-1 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-sm font-medium text-[hsl(var(--foreground))]">{t.name}</span>
                          <span className={cn("shrink-0 text-[11px] pfs-muted", MONO)}>{t.relevance}%</span>
                        </div>
                        {t.what_it_is && <p className="mt-0.5 truncate text-xs pfs-muted">{t.what_it_is}</p>}
                      </div>
                      <div className="h-[3px] w-24 shrink-0 overflow-hidden bg-[hsl(var(--muted))]">
                        <div className="h-full bg-[hsl(var(--primary))]" style={{ width: `${t.relevance}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* disclaimer */}
              <p className="flex items-start gap-2 border-t border-[hsl(var(--border))] pt-4 text-[11px] leading-relaxed pfs-muted">
                <ShieldQuestion className="mt-px h-3.5 w-3.5 shrink-0" />
                PFS provides research assistance, not legal advice. Findings are AI-assisted and
                require review by qualified patent counsel before any filing decision.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* mode legend (empty state) */}
        {!brief && !loading && (
          <div className="mt-14">
            <Label>The six missions PFS routes between</Label>
            <div className="mt-3.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.values(DECISION_MODES).map((m) => (
                <div key={m.id} className="pfs-panel p-3.5">
                  <span className={cn("text-base font-semibold", SERIF, m.accent.split(" ")[0])}>{m.label}</span>
                  <p className="mt-1 text-xs leading-relaxed pfs-muted">{m.blurb}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Editorial section label: a short rule followed by italic serif text. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-px w-5 bg-[hsl(var(--primary))]/60" />
      <span className={cn("text-[13px] italic tracking-wide pfs-muted", SERIF)}>{children}</span>
    </span>
  );
}
