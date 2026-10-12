"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

/** Two-step delete: first click arms it, second confirms. Esc or blur cancels. */
export function DeleteButton({
  url, label, redirectTo, compact, prompt,
}: { url: string; label: string; redirectTo?: string; compact?: boolean; prompt?: string }) {
  const router = useRouter();
  const [armed, setArmed] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    const res = await fetch(url, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      if (redirectTo) router.replace(redirectTo);
      router.refresh();
      return;
    }
    setError((await res?.json().catch(() => null))?.error ?? "Could not delete.");
    setPending(false);
    setArmed(false);
  }

  if (!armed) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <button
          type="button"
          aria-label={label}
          onClick={() => setArmed(true)}
          className={compact ? "rounded p-1.5 text-muted hover:bg-critical-soft hover:text-critical" : "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-critical/30 px-3 py-1.5 text-[12.5px] font-medium text-critical hover:bg-critical-soft"}
        >
          <Trash2 className="size-4" />
          {compact ? null : label}
        </button>
        {error ? <span role="alert" className="max-w-xs text-[11.5px] text-critical">{error}</span> : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2" onKeyDown={(e) => e.key === "Escape" && setArmed(false)}>
      <span className="text-[12px] text-ink">{prompt ?? "Delete permanently?"}</span>
      <button type="button" autoFocus onClick={run} disabled={pending} className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-critical px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-60">
        {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
        Yes, delete
      </button>
      <button type="button" onClick={() => setArmed(false)} disabled={pending} className="rounded-[var(--radius-sm)] px-2 py-1 text-[12px] text-muted hover:bg-hover">
        Cancel
      </button>
    </span>
  );
}
