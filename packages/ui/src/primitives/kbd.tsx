import * as React from "react";
import { cn } from "../cn";

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[var(--radius-xs)]",
        "border border-line bg-sunken px-1 font-sans text-[10px] font-medium text-faint",
        className,
      )}
      {...props}
    />
  );
}
