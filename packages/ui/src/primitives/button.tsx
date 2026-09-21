import * as React from "react";
import { cn } from "../cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] " +
  "font-medium transition-colors duration-[var(--dur-fast)] ease-(--ease-moat) " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  "[&_svg]:shrink-0 [&_svg]:size-[15px]";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active shadow-[var(--shadow-sm)]",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-hover active:bg-sunken",
  ghost: "text-muted hover:bg-hover hover:text-ink active:bg-sunken",
  danger: "bg-critical text-white hover:opacity-90 active:opacity-80",
  link: "text-accent-text underline underline-offset-[3px] decoration-accent-line hover:decoration-current px-0 h-auto",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[13px]",
  md: "h-8 px-3 text-[13px]",
  lg: "h-9 px-4 text-sm",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /**
   * Render the single child element with the button's styling instead of a
   * <button>. Use for navigation: a link that looks like a button must still
   * be an anchor, or it loses middle-click, open-in-new-tab and copy-address.
   */
  asChild?: boolean;
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  asChild = false,
  ...props
}: ButtonProps) {
  const classes = cn(base, variants[variant], variant !== "link" && sizes[size], className);

  if (asChild) {
    const child = React.Children.only(props.children) as React.ReactElement<{
      className?: string;
    }>;
    const { children: _children, ...rest } = props;
    return React.cloneElement(child, {
      ...rest,
      className: cn(classes, child.props.className),
    } as Partial<typeof child.props>);
  }

  return <button type={type} className={classes} {...props} />;
}

export interface IconButtonProps extends ButtonProps {
  /** Required: icon-only controls must still be reachable by screen reader. */
  label: string;
}

export function IconButton({ label, className, size = "md", ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      size={size}
      className={cn(
        "px-0",
        size === "sm" ? "w-7" : size === "lg" ? "w-9" : "w-8",
        className,
      )}
      {...props}
    />
  );
}
