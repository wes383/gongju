import { describe, expect, it } from "vitest";
import {
  OG_HEIGHT,
  OG_TITLE_LIMIT,
  OG_WIDTH,
  cardText,
  descriptionFontSize,
  displayHost,
  ogTheme,
  titleFontSize,
} from "@/lib/og-card";

describe("og card text", () => {
  it("keeps the canonical 1200x630 frame", () => {
    expect(OG_WIDTH).toBe(1200);
    expect(OG_HEIGHT).toBe(630);
  });

  it("flattens newlines and collapses runs of spaces", () => {
    expect(cardText("  a\n\n b\t c  ", 100)).toBe("a b c");
  });

  it("cuts at the limit without leaving a trailing space", () => {
    const long = "x".repeat(OG_TITLE_LIMIT + 20);
    expect(cardText(long, OG_TITLE_LIMIT)).toHaveLength(OG_TITLE_LIMIT);
    expect(cardText("hello world", 6)).toBe("hello");
  });

  it("steps the title down as it gets longer", () => {
    const sizes = [12, 35, 50, 70, 100].map((length) => titleFontSize("x".repeat(length)));
    for (let i = 1; i < sizes.length; i += 1) expect(sizes[i]).toBeLessThan(sizes[i - 1]);
  });

  it("keeps body copy larger until the description needs a third line", () => {
    expect(descriptionFontSize("short")).toBe(30);
    expect(descriptionFontSize("x".repeat(160))).toBe(26);
  });
});

describe("theme and host", () => {
  it("falls back to the first theme for an unknown id", () => {
    expect(ogTheme("nope" as never).id).toBe("light");
  });

  it("strips the scheme and path from a URL", () => {
    expect(displayHost("https://example.com/a/b?c=1")).toBe("example.com");
    expect(displayHost("example.com")).toBe("example.com");
    expect(displayHost("")).toBe("");
  });
});
