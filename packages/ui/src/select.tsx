import type { ComponentProps } from "react";
import { cn } from "./cn.ts";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 rounded-md border border-border bg-background px-3 text-sm",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
