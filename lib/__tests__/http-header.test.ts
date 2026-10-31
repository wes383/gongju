import { describe, expect, it } from "vitest";
import {
  HEADER_PRESETS,
  parseHttpHeaders,
  serializeHeaders,
  toCurlHeaders,
} from "@/lib/http-header";

describe("parseHttpHeaders", () => {
  it("parses a CRLF block", () => {
    const { entries, issues } = parseHttpHeaders(
      "Content-Type: application/json\r\nCache-Control: no-store"
    );
    expect(entries).toEqual([
      { name: "Content-Type", value: "application/json" },
      { name: "Cache-Control", value: "no-store" },
    ]);
    expect(issues).toEqual([]);
  });

  it("parses an LF block and skips blank lines", () => {
    const { entries } = parseHttpHeaders("A: 1\n\n\nB: 2\n");
    expect(entries.map((e) => e.name)).toEqual(["A", "B"]);
  });

  it("keeps empty values and colons inside the value", () => {
    const { entries } = parseHttpHeaders("X-Empty:\nLocation: https://example.com:8443/a");
    expect(entries[0].value).toBe("");
    expect(entries[1].value).toBe("https://example.com:8443/a");
  });

  it("folds a continuation line into the previous value", () => {
    const { entries, issues } = parseHttpHeaders("X-Note: first\n  second\n\tthird");
    expect(entries).toEqual([{ name: "X-Note", value: "first second third" }]);
    expect(issues).toEqual([]);
  });

  it("flags lines without a colon but keeps parsing", () => {
    const { entries, issues } = parseHttpHeaders("GET / HTTP/1.1\nAccept: */*");
    expect(entries).toHaveLength(1);
    expect(issues).toEqual([
      { line: 1, text: "GET / HTTP/1.1", reason: "noColon" },
    ]);
  });

  it("flags a space before the colon without dropping the header", () => {
    const { entries, issues } = parseHttpHeaders("Accept : text/html");
    expect(entries).toEqual([{ name: "Accept", value: "text/html" }]);
    expect(issues[0]).toMatchObject({ line: 1, reason: "spaceBeforeColon" });
  });

  it("flags an empty name and an invalid name", () => {
    const empty = parseHttpHeaders(": value");
    expect(empty.entries).toEqual([]);
    expect(empty.issues[0].reason).toBe("emptyName");

    const invalid = parseHttpHeaders("Bad Header: 1");
    expect(invalid.entries).toEqual([{ name: "Bad Header", value: "1" }]);
    expect(invalid.issues.map((i) => i.reason)).toContain("invalidName");
  });

  it("flags a continuation line with nothing above it", () => {
    const { issues } = parseHttpHeaders("  orphan");
    expect(issues[0].reason).toBe("orphanContinuation");
  });

  it("throws once the block exceeds the cap", () => {
    const block = Array.from({ length: 501 }, (_, i) => `X-${i}: 1`).join("\n");
    expect(() => parseHttpHeaders(block)).toThrowError(/header\.tooMany/);
  });
});

describe("serializeHeaders", () => {
  it("joins with LF by default", () => {
    expect(serializeHeaders([{ name: "A", value: "1" }, { name: "B", value: "2" }])).toBe(
      "A: 1\nB: 2"
    );
  });

  it("can emit CRLF", () => {
    expect(serializeHeaders([{ name: "A", value: "1" }], "\r\n")).toBe("A: 1");
  });

  it("round-trips through the parser", () => {
    const entries = [
      { name: "Content-Type", value: "application/json" },
      { name: "X-Trace", value: "a:b" },
    ];
    expect(parseHttpHeaders(serializeHeaders(entries)).entries).toEqual(entries);
  });
});

describe("toCurlHeaders", () => {
  it("returns an empty string with no headers", () => {
    expect(toCurlHeaders([])).toBe("");
  });

  it("builds a multi-line curl command", () => {
    const curl = toCurlHeaders([{ name: "Accept", value: "application/json" }], "https://x.dev");
    expect(curl).toBe("curl \\\n  -H 'Accept: application/json' \\\n  https://x.dev");
  });

  it("escapes single quotes in a value", () => {
    const curl = toCurlHeaders([{ name: "X-Note", value: "it's here" }], "https://x.dev");
    expect(curl).toContain("-H 'X-Note: it'\\''s here'");
  });
});

describe("HEADER_PRESETS", () => {
  it("has unique ids and group coverage", () => {
    const ids = HEADER_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(HEADER_PRESETS.map((p) => p.group))).toEqual(
      new Set(["request", "response", "cors", "security"])
    );
  });

  it("always ships a buildable name and value", () => {
    for (const preset of HEADER_PRESETS) {
      expect(preset.name).toMatch(/^[A-Za-z0-9-]+$/);
      expect(preset.value.length).toBeGreaterThan(0);
      expect(preset.zh.length).toBeGreaterThan(0);
      expect(preset.en.length).toBeGreaterThan(0);
    }
  });
});
