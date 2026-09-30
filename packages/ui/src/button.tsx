import type { ComponentProps } from "react";
import { cn } from "./cn.ts";

const variants = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-border bg-background hover:bg-muted",
  ghost: "hover:bg-muted",
  danger: "bg-danger text-danger-foreground hover:opacity-90",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
} as const;

export interface ButtonStyle {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export interface ButtonProps extends ComponentProps<"button">, ButtonStyle {}

/** Button classes, for links and other elements that should look like a button. */
export function buttonClassName({ variant = "primary", size = "md" }: ButtonStyle = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(buttonClassName({ variant, size }), className)} {...props} />
  );
}
