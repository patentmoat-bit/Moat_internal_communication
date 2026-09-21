import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@moat/ui";

export interface Crumb {
  label: string;
  href?: string;
}

export function PageHeader({
  title,
  crumbs,
  caption,
  actions,
  meta,
  className,
}: {
  title: React.ReactNode;
  crumbs?: Crumb[];
  caption?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-line bg-canvas px-6 py-5", className)}>
      {crumbs?.length ? (
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[12px]">
          {crumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? <ChevronRight className="size-3 text-faint" /> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="text-faint hover:text-ink">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-faint">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-document text-[22px] font-semibold leading-[1.25] tracking-[-0.014em] text-ink">
            {title}
          </h1>
          {caption ? (
            <p className="measure mt-1.5 text-[13px] leading-relaxed text-muted">{caption}</p>
          ) : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
