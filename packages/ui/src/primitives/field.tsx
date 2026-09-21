import * as React from "react";
import { cn } from "../cn";

const control =
  "w-full rounded-[var(--radius-sm)] border border-line-strong bg-surface px-2.5 py-1.5 " +
  "text-[13px] text-ink placeholder:text-faint " +
  "transition-colors duration-[var(--dur-fast)] " +
  "hover:border-faint focus:border-accent focus-visible:outline-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, "h-8", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 resize-y leading-relaxed", className)} {...props} />;
}

export function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-1.5 text-[12px] font-medium text-muted"
      >
        {label}
        {required ? (
          <span className="text-critical" aria-hidden>
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="text-[12px] leading-snug text-faint">{hint}</p> : null}
    </div>
  );
}

/** Section label used above groups of fields and in dense sidebars. */
export function Eyebrow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.07em] text-faint",
        className,
      )}
      {...props}
    />
  );
}
