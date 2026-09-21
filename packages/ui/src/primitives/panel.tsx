import * as React from "react";
import { cn } from "../cn";

/** A bordered surface. Structure comes from the hairline, not a drop shadow. */
export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-line bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  caption,
  actions,
  className,
}: {
  title: React.ReactNode;
  caption?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-line px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold tracking-[-0.006em] text-ink">{title}</h2>
        {caption ? <p className="mt-0.5 text-[12px] text-faint">{caption}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function Separator({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line", className)} />;
}
