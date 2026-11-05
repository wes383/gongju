import { describe, expect, it } from "vitest";
import {
  deviceKind,
  formatBytes,
  formatDuration,
  formatUtcOffset,
  pickUaBrand,
  summarizeSupport,
  withFullVersion,
} from "../device";

describe("formatBytes", () => {
  it("keeps small sizes in bytes and grows through the units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("drops the decimal once the number is wide enough", () => {
    expect(formatBytes(340 * 1024 * 1024)).toBe("340 MB");
    expect(formatBytes(1.2 * 1024 ** 3)).toBe("1.2 GB");
  });

  it("refuses nonsense instead of printing NaN", () => {
    expect(formatBytes(-1)).toBe("—");
    expect(formatBytes(Number.NaN)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("switches to seconds past a thousand milliseconds", () => {
    expect(formatDuration(240)).toBe("240 ms");
    expect(formatDuration(1240)).toBe("1.24 s");
    expect(formatDuration(0)).toBe("0 ms");
    expect(formatDuration(-5)).toBe("—");
  });
});

describe("formatUtcOffset", () => {
  it("flips the sign getTimezoneOffset reports", () => {
    expect(formatUtcOffset(480)).toBe("UTC+08:00");
    expect(formatUtcOffset(-330)).toBe("UTC-05:30");
    expect(formatUtcOffset(0)).toBe("UTC+00:00");
    expect(formatUtcOffset(345)).toBe("UTC+05:45");
  });
});

describe("pickUaBrand", () => {
  const uh = (brand: string, version: string) => ({ brand, version });

  it("skips Chromium and the decoy brand", () => {
    expect(pickUaBrand([uh("Chromium", "141"), uh("Google Chrome", "141"), uh("Not.A/Brand", "8")])).toBe(
      "Google Chrome 141"
    );
  });

  it("keeps a browser that only reports its own name", () => {
    expect(pickUaBrand([uh("Microsoft Edge", "141"), uh("Chromium", "141")])).toBe("Microsoft Edge 141");
  });

  it("falls back to Chromium when nothing else is named", () => {
    expect(pickUaBrand([uh("Chromium", "120")])).toBe("Chromium 120");
  });

  it("returns null without client hints", () => {
    expect(pickUaBrand(undefined)).toBeNull();
    expect(pickUaBrand([])).toBeNull();
  });
});

describe("withFullVersion", () => {
  const uh = (brand: string, version: string) => ({ brand, version });

  it("replaces the reduced build number with the full one", () => {
    expect(withFullVersion([uh("Chromium", "141"), uh("Google Chrome", "141")], "141.0.7390.55")).toBe(
      "Google Chrome 141.0.7390.55"
    );
  });

  it("keeps the reduced string when no full version arrived", () => {
    expect(withFullVersion([uh("Microsoft Edge", "141")], undefined)).toBe("Microsoft Edge 141");
  });

  it("returns null without brands", () => {
    expect(withFullVersion(undefined, "141.0.0.0")).toBeNull();
  });
});

describe("summarizeSupport", () => {
  it("counts passes and names what is missing", () => {
    const summary = summarizeSupport([
      { name: "structuredClone", supported: true },
      { name: "Nesting", supported: false },
      { name: "Subgrid", supported: false },
    ]);

    expect(summary).toEqual({ supported: 1, total: 3, missing: ["Nesting", "Subgrid"] });
  });

  it("has nothing missing when everything passes", () => {
    expect(summarizeSupport([{ name: "USB", supported: true }])).toEqual({
      supported: 1,
      total: 1,
      missing: [],
    });
  });
});

describe("deviceKind", () => {
  const iPhone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148";
  const iPad = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)";
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
  const windows = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";

  it("trusts client hints first", () => {
    expect(deviceKind({ mobile: true, userAgent: windows })).toBe("mobile");
  });

  it("reads tablets and phones out of the UA", () => {
    expect(deviceKind({ userAgent: iPad })).toBe("tablet");
    expect(deviceKind({ userAgent: iPhone })).toBe("mobile");
  });

  it("treats a touch-capable Mac as an iPad", () => {
    expect(deviceKind({ userAgent: mac, maxTouchPoints: 5 })).toBe("tablet");
    expect(deviceKind({ userAgent: mac, maxTouchPoints: 0 })).toBe("desktop");
  });

  it("defaults to desktop", () => {
    expect(deviceKind({ userAgent: windows })).toBe("desktop");
  });
});
