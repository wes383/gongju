import { describe, expect, it } from "vitest";
import { A4_HEIGHT, A4_WIDTH, pageSizeLabel, parsePageRanges, parseRangeGroups } from "@/lib/pdf-pages";

describe("parseRangeGroups", () => {
  it("treats an empty input as the whole document", () => {
    expect(parseRangeGroups("", 10)).toEqual([{ start: 1, end: 10 }]);
    expect(parseRangeGroups("   ", 3)).toEqual([{ start: 1, end: 3 }]);
  });

  it("reads single pages and closed ranges", () => {
    expect(parseRangeGroups("1-3, 5, 8-10", 10)).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5 },
      { start: 8, end: 10 },
    ]);
  });

  it("accepts an open ended range", () => {
    expect(parseRangeGroups("7-", 10)).toEqual([{ start: 7, end: 10 }]);
    expect(parseRangeGroups("-4", 10)).toEqual([{ start: 1, end: 4 }]);
  });

  it("swaps a reversed range", () => {
    expect(parseRangeGroups("8-3", 10)).toEqual([{ start: 3, end: 8 }]);
  });

  it("tolerates full width commas and stray spaces", () => {
    expect(parseRangeGroups("1，2 , 4", 5)).toEqual([
      { start: 1, end: 1 },
      { start: 2, end: 2 },
      { start: 4, end: 4 },
    ]);
  });

  it("rejects pages outside the document", () => {
    expect(parseRangeGroups("0", 5)).toBeNull();
    expect(parseRangeGroups("1-6", 5)).toBeNull();
    expect(parseRangeGroups("3-", 2)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(parseRangeGroups("abc", 5)).toBeNull();
    expect(parseRangeGroups("1-2-3", 5)).toBeNull();
    expect(parseRangeGroups("-", 5)).toBeNull();
    expect(parseRangeGroups("1,", 0)).toBeNull();
  });
});

describe("parsePageRanges", () => {
  it("returns zero based indices in selection order", () => {
    expect(parsePageRanges("2, 1, 4-5", 6)).toEqual([1, 0, 3, 4]);
  });

  it("drops duplicates", () => {
    expect(parsePageRanges("1-3, 2", 5)).toEqual([0, 1, 2]);
  });

  it("returns every page for an empty input", () => {
    expect(parsePageRanges("", 3)).toEqual([0, 1, 2]);
  });

  it("returns null when the input cannot be parsed", () => {
    expect(parsePageRanges("9", 5)).toBeNull();
  });
});

describe("pageSizeLabel", () => {
  it("names well known sizes in both orientations", () => {
    expect(pageSizeLabel(A4_WIDTH, A4_HEIGHT)).toBe("A4");
    expect(pageSizeLabel(A4_HEIGHT, A4_WIDTH)).toBe("A4 ↻");
  });

  it("falls back to points for custom sizes", () => {
    expect(pageSizeLabel(300, 400)).toBe("300 × 400 pt");
  });
});
