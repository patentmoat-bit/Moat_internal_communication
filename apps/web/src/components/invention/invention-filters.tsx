"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@moat/ui";

const FILTERS = [
  { label: "All", params: {} },
  { label: "Mine", params: { mine: "1" } },
  { label: "In review", params: { status: "submitted" } },
  { label: "Approved", params: { status: "approved" } },
  { label: "Returned", params: { status: "returned" } },
] as const;

/**
 * Filter state lives in the URL, not component state, so a filtered view can
 * be linked, bookmarked and reloaded -- and so the server can apply the filter
 * rather than shipping every row to the browser to hide most of them.
 */
export function InventionFilters() {
  const pathname = usePathname();
  const current = useSearchParams();

  return (
    <div role="tablist" aria-label="Filter disclosures" className="flex items-center gap-0.5 border-b border-line">
      {FILTERS.map((filter) => {
        const params = new URLSearchParams(filter.params);
        const selected =
          (current.get("status") ?? "") === (params.get("status") ?? "") &&
          (current.get("mine") ?? "") === (params.get("mine") ?? "");
        const href = params.size ? `${pathname}?${params}` : pathname;

        return (
          <Link
            key={filter.label}
            href={href}
            role="tab"
            aria-selected={selected}
            className={cn(
              "-mb-px border-b-2 px-2.5 pb-2 pt-1 text-[13px] transition-colors",
              selected
                ? "border-accent font-medium text-ink"
                : "border-transparent text-faint hover:text-muted",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </div>
  );
}
