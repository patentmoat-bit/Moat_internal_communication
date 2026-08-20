"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useAnalysis } from "@/components/decision/useAnalysis";
import { BackToConsole, ConsoleShell } from "@/components/decision/primitives";
import { parseConcepts } from "@/lib/analysis/shared";
import { cn } from "@/lib/utils";

const SERIF = "[font-family:var(--font-playfair)]";
const MONO = "[font-family:var(--font-mono)]";

type Accent = "gold" | "amber" | "violet" | "rose" | "sky";

const ACCENT: Record<Accent, { btn: string; ring: string; mark: string }> = {
  gold: { btn: "bg-[#c9a84c] text-black hover:bg-[#b0913b]", ring: "focus:border-[#c9a84c]/60", mark: "text-[#c9a84c]" },
  amber: { btn: "bg-amber-400 text-stone-950 hover:bg-amber-300", ring: "focus:border-amber-400/60", mark: "text-amber-400" },
  violet: { btn: "bg-[#e8c97a] text-black hover:bg-[#d6b76a]", ring: "focus:border-[#e8c97a]/60", mark: "text-[#e8c97a]" },
  rose: { btn: "bg-rose-500 text-white hover:bg-rose-400 dark:bg-rose-300 dark:text-stone-950 dark:hover:bg-rose-200", ring: "focus:border-rose-400/60", mark: "text-rose-500 dark:text-rose-300" },
  sky: { btn: "bg-sky-500 text-white hover:bg-sky-400 dark:bg-sky-300 dark:text-stone-950 dark:hover:bg-sky-200", ring: "focus:border-sky-400/60", mark: "text-sky-500 dark:text-sky-300" },
};

interface AnalysisPageProps<T> {
  tag: string;
  title: string;
  subtitle: string;
  endpoint: string;
  placeholder: string;
  runLabel: string;
  loadingSteps: string[];
  accent?: Accent;
  children: (data: T) => ReactNode;
}

function Inner<T>({
  tag,
  title,
  subtitle,
  endpoint,
  placeholder,
  runLabel,
  loadingSteps,
  accent = "gold",
  children,
}: AnalysisPageProps<T>) {
  const params = useSearchParams();
  const { data, loading, error, run } = useAnalysis<T>(endpoint);
  const [query, setQuery] = useState("");
  const ran = useRef(false);
  const a = ACCENT[accent];

  useEffect(() => {
    const q = params.get("q") || "";
    setQuery(q);
    if (q && !ran.current) {
      ran.current = true;
      run(q, parseConcepts(params.get("concepts")));
    }
  }, [params, run]);

  const doRun = () => run(query, parseConcepts(params.get("concepts")));

  return (
    <ConsoleShell tag={tag}>
      <div className="pt-10">
        <BackToConsole />
        <h1 className={cn("mt-4 text-[34px] font-semibold leading-[1.1] text-foreground md:text-[40px]", SERIF)}>
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

        <div className="mt-6 flex items-end gap-3">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) doRun();
            }}
            rows={2}
            placeholder={placeholder}
            className={cn(
              "flex-1 resize-none border border-border bg-card px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70",
              a.ring,
            )}
          />
          <button
            onClick={doRun}
            disabled={loading || !query.trim()}
            className={cn(
              "inline-flex h-10 items-center gap-2 px-5 text-sm font-semibold transition disabled:opacity-40",
              a.btn,
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Analyzing" : runLabel}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-8 border-l-2 border-rose-500/60 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className={cn("mt-8 space-y-2 border border-border bg-muted/20 p-5", MONO)}>
          {loadingSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2.5 text-[13px] text-muted-foreground" style={{ opacity: 1 - i * 0.15 }}>
              <span className={cn("animate-pulse", a.mark)}>—</span>
              {s}
            </div>
          ))}
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-10 space-y-7">
          {children(data)}
        </motion.div>
      )}
    </ConsoleShell>
  );
}

/** Shared scaffold for every analysis page: dossier chrome, query bar with
 * hand-off auto-run, loading + error states. Pass a render function for results. */
export function AnalysisPage<T>(props: AnalysisPageProps<T>) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}

/** Closing legal disclaimer, shared across pages. */
export function AnalysisDisclaimer({ children }: { children: ReactNode }) {
  return <p className="border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">{children}</p>;
}
