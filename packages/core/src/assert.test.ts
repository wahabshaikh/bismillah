import { describe, expect, it } from "vitest";
import { assertNever, invariant } from "./assert.ts";

describe("invariant", () => {
  it("passes on truthy values", () => {
    expect(() => invariant(1, "unreachable")).not.toThrow();
  });

  it("throws with the message on falsy values", () => {
    expect(() => invariant(0, "must be set")).toThrow("Invariant failed: must be set");
  });
});

describe("assertNever", () => {
  it("throws when reached at runtime", () => {
    expect(() => assertNever("oops" as never)).toThrow('Unexpected value: "oops"');
  });
});
