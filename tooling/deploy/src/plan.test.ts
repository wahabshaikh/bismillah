import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  domainTarget,
  missingSecrets,
  normalizeDomain,
  parseArgs,
  parseWorkersDevSubdomain,
  trustedOrigins,
  workersDevTarget,
} from "./plan.ts";

describe("normalizeDomain", () => {
  it("strips the scheme, trailing slash and case", () => {
    assert.equal(normalizeDomain(" https://Example.com/ "), "example.com");
    assert.equal(normalizeDomain("my-app.co.uk"), "my-app.co.uk");
  });

  it("rejects things that are not domains", () => {
    assert.throws(() => normalizeDomain("localhost"), /not a domain/);
    assert.throws(() => normalizeDomain("example.com/path"), /not a domain/);
    assert.throws(() => normalizeDomain(""), /not a domain/);
  });
});

describe("targets", () => {
  it("puts the API and web app on sibling subdomains", () => {
    assert.deepEqual(domainTarget("example.com"), {
      apiUrl: "https://api.example.com",
      webUrl: "https://app.example.com",
      apiHost: "api.example.com",
      webHost: "app.example.com",
    });
  });

  it("derives workers.dev URLs from the account subdomain", () => {
    assert.deepEqual(workersDevTarget("acme", "bismillah-api", "bismillah-web"), {
      apiUrl: "https://bismillah-api.acme.workers.dev",
      webUrl: "https://bismillah-web.acme.workers.dev",
    });
  });
});

describe("trustedOrigins", () => {
  it("lists the web app and the mobile scheme", () => {
    assert.equal(
      trustedOrigins("https://app.example.com", "bismillah"),
      "https://app.example.com,bismillah://",
    );
    assert.equal(trustedOrigins("https://app.example.com"), "https://app.example.com");
  });
});

describe("parseWorkersDevSubdomain", () => {
  it("reads the subdomain from wrangler deploy output", () => {
    const output = `Uploaded bismillah-api (4.2 sec)
Deployed bismillah-api triggers (1.1 sec)
  https://bismillah-api.acme-co.workers.dev
  schedule: 0 * * * *`;
    assert.equal(parseWorkersDevSubdomain(output, "bismillah-api"), "acme-co");
    assert.equal(parseWorkersDevSubdomain(output, "bismillah-web"), undefined);
  });
});

describe("missingSecrets", () => {
  it("returns required secrets the Worker lacks", () => {
    assert.deepEqual(missingSecrets(["A", "B"], ["B", "C"]), ["A"]);
    assert.deepEqual(missingSecrets([], ["B"]), []);
  });
});

describe("parseArgs", () => {
  it("parses every flag", () => {
    assert.deepEqual(parseArgs(["--dry-run", "--domain", "example.com"]), {
      dryRun: true,
      workersDev: false,
      help: false,
      domain: "example.com",
    });
    assert.equal(parseArgs(["--domain=example.com"]).domain, "example.com");
    assert.equal(parseArgs(["--workers-dev"]).workersDev, true);
    assert.equal(parseArgs(["--", "--help"]).help, true);
  });

  it("rejects unknown and conflicting flags", () => {
    assert.throws(() => parseArgs(["--prod"]), /Unknown option/);
    assert.throws(() => parseArgs(["--domain"]), /needs a value/);
    assert.throws(() => parseArgs(["--domain=a.com", "--workers-dev"]), /not both/);
  });
});
