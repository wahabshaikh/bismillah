import { describe, expect, it } from "vitest";
import { resolveApiUrl } from "./api-url.ts";

describe("resolveApiUrl", () => {
  it("prefers the configured URL", () => {
    expect(resolveApiUrl("https://api.example.com/", "192.168.1.20:8081")).toBe(
      "https://api.example.com",
    );
  });

  it("uses the dev server's host with the API's port", () => {
    expect(resolveApiUrl(undefined, "192.168.1.20:8081")).toBe("http://192.168.1.20:8787");
    expect(resolveApiUrl("", "10.0.2.2:8081")).toBe("http://10.0.2.2:8787");
  });

  it("falls back to localhost", () => {
    expect(resolveApiUrl()).toBe("http://localhost:8787");
  });
});
