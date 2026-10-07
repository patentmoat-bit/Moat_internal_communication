import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-accent text-white shadow-xs hover:brightness-110",
          variant === "outline" && "border border-line bg-surface text-ink hover:border-line-strong hover:bg-hover",
          variant === "ghost" && "text-muted hover:bg-hover hover:text-ink",
          variant === "secondary" && "bg-line text-ink hover:bg-line-strong",
          size === "default" && "h-9 px-4 py-2",
          size === "sm" && "h-8 px-3 text-xs",
          size === "lg" && "h-10 px-5",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
