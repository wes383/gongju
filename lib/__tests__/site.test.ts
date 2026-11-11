import { describe, expect, it } from "vitest";
import { SITE_URL, absoluteUrl } from "@/lib/site";

describe("site origin", () => {
  it("defaults to a production https origin, never localhost", () => {
    expect(SITE_URL.startsWith("https://")).toBe(true);
    expect(SITE_URL).not.toContain("localhost");
  });

  it("has no trailing slash", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
  });

  it("builds absolute URLs for crawler-facing paths", () => {
    expect(absoluteUrl("/tools/base64")).toBe(`${SITE_URL}/tools/base64`);
    expect(absoluteUrl("tools/base64")).toBe(`${SITE_URL}/tools/base64`);
    expect(absoluteUrl("https://example.com/x")).toBe("https://example.com/x");
  });
});