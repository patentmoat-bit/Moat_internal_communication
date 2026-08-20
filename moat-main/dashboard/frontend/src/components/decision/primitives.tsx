"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const SERIF = "[font-family:var(--font-playfair)]";
const MONO = "[font-family:var(--font-mono)]";

/** Warm "dossier" canvas + masthead, shared by every analysis page. */
export function ConsoleShell({
  tag,
  children,
}: {
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative -m-4 min-h-full overflow-hidden bg-background text-foreground border border-border md:-m-6 lg:-m-8">
      {/* warm paper grain + top light wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(120% 60% at 50% -10%, rgba(201,168,76,0.06), transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-5 py-12 md:px-8">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <Link href="/dashboard/decision" className="group flex items-baseline gap-3">
            <span className={cn("text-2xl font-bold tracking-tight text-[#c9a84c] dark:text-amber-100 transition group-hover:text-[#b0913b] dark:group-hover:text-amber-300", SERIF)}>
              PFS
            </span>
            <span className={cn("text-[10px] uppercase tracking-[0.32em] text-muted-foreground", MONO)}>
              Patent Finder System
            </span>
          </Link>
          <span className={cn("text-[10px] uppercase tracking-[0.28em] text-[#c9a84c]/80 dark:text-amber-300/70", MONO)}>{tag}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function BackToConsole() {
  return (
    <Link
      href="/dashboard/decision"
      className={cn("inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition hover:text-[#c9a84c] dark:hover:text-amber-300", MONO)}
    >
      <ArrowLeft className="h-3.5 w-3.5" /> back to console
    </Link>
  );
}

/** Editorial section label: a short rule followed by italic serif text. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-px w-5 bg-[#c9a84c]/50 dark:bg-amber-300/50" />
      <span className={cn("text-[13px] italic tracking-wide text-muted-foreground", SERIF)}>{children}</span>
    </span>
  );
}

const TONES: Record<string, string> = {
  emerald: "text-emerald-700 border-emerald-600/30 bg-emerald-50 dark:text-emerald-300/90 dark:border-emerald-400/30 dark:bg-emerald-400/[0.07]",
  amber: "text-amber-700 border-amber-600/30 bg-amber-50 dark:text-amber-200/90 dark:border-amber-400/30 dark:bg-amber-400/[0.07]",
  rose: "text-rose-700 border-rose-600/30 bg-rose-50 dark:text-rose-300/90 dark:border-rose-400/30 dark:bg-rose-400/[0.07]",
  gold: "text-[#c9a84c] border-[#c9a84c]/30 bg-[#c9a84c]/5 dark:text-amber-200/90 dark:border-amber-300/30 dark:bg-amber-300/[0.06]",
  slate: "text-muted-foreground border-border bg-muted/30 dark:text-stone-300 dark:border-stone-200/15 dark:bg-stone-200/[0.04]",
};

export function Pill({ tone = "slate", children }: { tone?: keyof typeof TONES | string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
        MONO,
        TONES[tone] ?? TONES.slate,
      )}
    >
      {children}
    </span>
  );
}

const BAR_TONE = (v: number, invert: boolean) => {
  const good = invert ? v < 40 : v >= 66;
  const bad = invert ? v >= 66 : v < 40;
  return good ? "bg-emerald-600 dark:bg-emerald-400/80" : bad ? "bg-rose-600 dark:bg-rose-400/80" : "bg-[#c9a84c] dark:bg-amber-400/80";
};

/** Horizontal 0-100 meter. `invert` colours high values as risk rather than strength. */
export function MetricBar({ value, invert = false, width = "w-24" }: { value: number; invert?: boolean; width?: string }) {
  return (
    <div className={cn("h-[3px] shrink-0 overflow-hidden bg-muted", width)}>
      <div className={cn("h-full", BAR_TONE(value, invert))} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Large serif headline score with a verdict label, coloured by band. */
export function ScoreBadge({
  score,
  label,
  tone,
}: {
  score: number;
  label: string;
  tone: "emerald" | "amber" | "rose";
}) {
  const color = tone === "emerald" ? "text-emerald-600 dark:text-emerald-300" : tone === "amber" ? "text-[#c9a84c] dark:text-amber-300" : "text-rose-600 dark:text-rose-300";
  return (
    <div className="text-right">
      <div className={cn("text-5xl font-bold leading-none tracking-tight", SERIF, color)}>{score}</div>
      <div className={cn("mt-1.5 text-[10px] uppercase tracking-[0.26em] text-muted-foreground", MONO)}>{label}</div>
    </div>
  );
}
