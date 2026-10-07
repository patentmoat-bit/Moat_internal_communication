import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "border-transparent bg-accent text-white",
        variant === "secondary" && "border-transparent bg-line text-ink",
        variant === "destructive" && "border-transparent bg-rose-500 text-white",
        variant === "outline" && "border-line text-ink",
        className
      )}
      {...props}
    />
  );
}
