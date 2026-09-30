/** Throws when `condition` is falsy, and narrows its type when it is not. */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invariant failed: ${message}`);
}

/** Compile-time exhaustiveness check for `switch` statements over unions. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
