import * as React from "react";
import { cn } from "../cn";

export type Tone = "neutral" | "accent" | "positive" | "caution" | "critical";

const tones: Record<Tone, string> = {
  neutral: "bg-sunken text-muted border-line",
  accent: "bg-accent-soft text-accent-text border-accent-line",
  positive: "bg-positive-soft text-positive border-transparent",
  caution: "bg-caution-soft text-caution border-transparent",
  critical: "bg-critical-soft text-critical border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-xs)] border px-1.5 py-0.5",
        "text-[11px] font-medium leading-4 tracking-[0.01em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** A small filled dot. Used where a full badge would be too loud. */
export function Dot({ tone = "neutral", className }: { tone?: Tone; className?: string }) {
  const fill: Record<Tone, string> = {
    neutral: "bg-faint",
    accent: "bg-accent",
    positive: "bg-positive",
    caution: "bg-caution",
    critical: "bg-critical",
  };
  return (
    <span
      aria-hidden
      className={cn("size-[7px] shrink-0 rounded-full", fill[tone], className)}
    />
  );
}
