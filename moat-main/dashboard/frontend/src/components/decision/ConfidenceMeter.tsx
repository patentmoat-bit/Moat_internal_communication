"use client";

import { cn } from "@/lib/utils";

type Confidence = "high" | "medium" | "low";

const FILLED: Record<Confidence, number> = { high: 8, medium: 5, low: 2 };
const TONE: Record<Confidence, string> = {
  high: "bg-emerald-400",
  medium: "bg-amber-400",
  low: "bg-rose-400",
};
const LABEL: Record<Confidence, string> = { high: "HIGH", medium: "MEDIUM", low: "LOW" };

/** Segmented confidence bar with a label — the console's trust signal. */
export function ConfidenceMeter({ value, className }: { value: Confidence; className?: string }) {
  const filled = FILLED[value];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex gap-[3px]">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3.5 w-1.5 transition-colors",
              i < filled ? TONE[value] : "bg-stone-200/10",
            )}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium tracking-[0.22em] text-stone-400 [font-family:var(--font-mono)]">
        {LABEL[value]} CONFIDENCE
      </span>
    </div>
  );
}
