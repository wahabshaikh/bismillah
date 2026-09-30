import type { ComponentProps } from "react";
import { cn } from "./cn.ts";

/** An inline error or notice. Announced to screen readers when it appears. */
export function Alert({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger",
        className,
      )}
      {...props}
    />
  );
}
