import * as React from "react";
import { cn } from "../cn";
import type { Tone } from "./badge";

/**
 * A measured quantity with its method stated.
 *
 * Deliberate constraint: `method` is required. A bare percentage next to the
 * word "novelty" reads as a legal verdict, and an inventor who acts on it
 * (publishing, open-sourcing) can destroy their own patent rights. Every
 * number this system shows must say what produced it.
 */
export function Meter({
  label,
  value,
  max = 100,
  unit,
  method,
  tone = "accent",
  className,
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  method: string;
  tone?: Tone;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill: Record<Tone, string> = {
    neutral: "bg-faint",
    accent: "bg-accent",
    positive: "bg-positive",
    caution: "bg-caution",
    critical: "bg-critical",
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        <span className="numeric text-[13px] font-semibold tabular-nums text-ink">
          {value}
          {unit ? <span className="ml-0.5 text-[11px] font-normal text-faint">{unit}</span> : null}
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-describedby={undefined}
        className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-(--ease-moat)", fill[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] leading-snug text-faint">{method}</p>
    </div>
  );
}
