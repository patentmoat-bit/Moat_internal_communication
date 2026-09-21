import * as React from "react";
import { cn } from "../cn";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic tint so the same person keeps the same colour across views. */
function tintOf(name: string) {
  const tints = [
    "bg-accent-soft text-accent-text",
    "bg-positive-soft text-positive",
    "bg-caution-soft text-caution",
    "bg-critical-soft text-critical",
    "bg-sunken text-muted",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return tints[hash % tints.length];
}

export function Avatar({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium",
        tintOf(name),
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {initials(name)}
    </span>
  );
}
