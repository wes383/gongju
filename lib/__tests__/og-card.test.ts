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
  wrapLines,
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

/** Uniform 10px per character, which is close enough to a CJK glyph advance */
const tenPerChar = (value: string) => [...value].length * 10;

describe("wrap lines", () => {
  it("breaks CJK between characters", () => {
    expect(wrapLines("一二三四五六七八九十", 50, 3, tenPerChar)).toEqual([
      "一二三四五",
      "六七八九十",
    ]);
  });

  it("breaks Latin between words", () => {
    expect(wrapLines("hello world", 60, 3, tenPerChar)).toEqual(["hello", "world"]);
  });

  it("hard-breaks a word that is wider than the column", () => {
    expect(wrapLines("abcdefghij", 40, 3, tenPerChar)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("keeps a long CJK title on two lines instead of one overflowing line", () => {
    // The 84px title step: 12 characters per 1040px column
    const title = "把159个工具放进一个页面，全部在浏览器里跑";
    const lines = wrapLines(title, 1040, 3, (value) => [...value].length * 84);
    expect(lines).toHaveLength(2);
    for (const line of lines) expect([...line].length * 84).toBeLessThanOrEqual(1040);
  });

  it("cuts to the line limit with an ellipsis that still fits", () => {
    const lines = wrapLines("一二三四五六七八九十", 30, 2, tenPerChar);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
    expect(tenPerChar(lines[1])).toBeLessThanOrEqual(30);
  });

  it("returns nothing for empty text", () => {
    expect(wrapLines("   ", 100, 3, tenPerChar)).toEqual([]);
  });
});
