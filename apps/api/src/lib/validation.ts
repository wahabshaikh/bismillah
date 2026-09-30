import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";

/** `zValidator` that answers invalid input with a consistent 400 body. */
export function validate<Target extends keyof ValidationTargets, T extends ZodType>(
  target: Target,
  schema: T,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Invalid request", issues: result.error.issues }, 400);
    }
    return undefined;
  });
}
