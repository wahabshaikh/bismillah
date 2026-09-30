import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkConfig, fixConfig, parseJsonc, SCHEMA_PATH } from "./policy.ts";

const base = {
  compatibility_date: "2026-08-15",
  compatibility_flags: ["nodejs_compat"],
  observability: { enabled: true },
};

const good = {
  $schema: SCHEMA_PATH,
  name: "api",
  compatibility_date: "2026-08-15",
  compatibility_flags: ["nodejs_compat"],
  observability: { enabled: true },
};

describe("checkConfig", () => {
  it("accepts a config matching the base", () => {
    assert.deepEqual(checkConfig(good, base), []);
  });

  it("allows extra compatibility flags on top of the shared ones", () => {
    const config = {
      ...good,
      compatibility_flags: ["nodejs_compat", "no_handle_cross_request_promise_resolution"],
    };
    assert.deepEqual(checkConfig(config, base), []);
  });

  it("reports drifted and missing keys", () => {
    const { name: _name, observability: _observability, ...rest } = good;
    const problems = checkConfig({ ...rest, compatibility_date: "2024-01-01" }, base);
    assert.equal(problems.length, 3);
    assert.match(problems.join("\n"), /"name" must be set/);
    assert.match(problems.join("\n"), /"compatibility_date"/);
    assert.match(problems.join("\n"), /"observability"/);
  });
});

describe("fixConfig", () => {
  it("applies the base while keeping comments", () => {
    const text = `{
  // my worker
  "name": "api",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["some_flag"],
}
`;
    const fixed = fixConfig(text, base);
    assert.match(fixed, /\/\/ my worker/);
    const config = parseJsonc(fixed, "fixed");
    assert.deepEqual(checkConfig(config, base), []);
    assert.deepEqual(config["compatibility_flags"], ["nodejs_compat", "some_flag"]);
  });
});
