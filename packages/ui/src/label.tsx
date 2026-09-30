import type { ComponentProps } from "react";
import { cn } from "./cn.ts";

export function Label({ className, ...props }: ComponentProps<"label">) {
  // biome-ignore lint/a11y/noLabelWithoutControl: callers pass htmlFor or nest the control.
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}
