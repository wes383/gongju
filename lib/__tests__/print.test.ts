import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import {
  bleedBox,
  getPaper,
  PAPER_SIZES,
  pixelsFor,
  printSize,
  qualityOf,
  resolutionOf,
} from "@/lib/print";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (isCodedError(error)) return error.code;
    return "uncoded";
  }
  return "no-error";
}

describe("printSize", () => {
  it("turns a 3000 × 2000 image at 300 dpi into 10 × 6.67 inches", () => {
    const size = printSize(3000, 2000, 300);
    expect(size.widthMm).toBeCloseTo(254, 6);
    expect(size.heightMm).toBeCloseTo(169.33, 2);
    expect(size.widthIn).toBeCloseTo(10, 6);
  });

  it("doubles the print when the dpi halves", () => {
    expect(printSize(3000, 2000, 150).widthMm).toBeCloseTo(508, 6);
  });

  it("rejects empty images and a zero dpi", () => {
    expect(codeOf(() => printSize(0, 2000, 300))).toBe("print.pixels");
    expect(codeOf(() => printSize(3000, 2000, 0))).toBe("print.dpi");
  });
});

describe("pixelsFor", () => {
  it("needs 2480 × 3508 pixels for A4 at 300 dpi", () => {
    expect(pixelsFor(210, 297, 300)).toEqual({ width: 2480, height: 3508 });
  });

  it("checks the physical size", () => {
    expect(codeOf(() => pixelsFor(0, 297, 300))).toBe("print.size");
  });
});

describe("resolution", () => {
  it("reports the effective ppi", () => {
    expect(resolutionOf(3000, 254)).toBeCloseTo(300, 6);
  });

  it("bands the result the way a print shop would", () => {
    expect(qualityOf(400)).toBe("excellent");
    expect(qualityOf(300)).toBe("excellent");
    expect(qualityOf(240)).toBe("good");
    expect(qualityOf(150)).toBe("fair");
    expect(qualityOf(72)).toBe("low");
  });
});

describe("paper sizes", () => {
  it("keeps the ISO ratios", () => {
    const a4 = getPaper("a4");
    expect(a4.width).toBe(210);
    expect(a4.height).toBe(297);
    expect(a4.height / a4.width).toBeCloseTo(Math.SQRT2, 2);
  });

  it("lists every size with a unique id", () => {
    const ids = PAPER_SIZES.map((paper) => paper.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(codeOf(() => getPaper("a9"))).toBe("print.paper");
  });
});

describe("bleedBox", () => {
  it("adds the bleed on all four sides and pulls the safe area in", () => {
    const box = bleedBox({ widthMm: 100, heightMm: 150, bleedMm: 3, safeMm: 5 });
    expect(box.withBleed.widthMm).toBe(106);
    expect(box.withBleed.heightMm).toBe(156);
    expect(box.safe.widthMm).toBe(90);
    expect(box.safe.heightMm).toBe(140);
    expect(box.pixels).toBeNull();
  });

  it("converts the outer size to pixels at the requested dpi", () => {
    const box = bleedBox({ widthMm: 100, heightMm: 150, bleedMm: 3, safeMm: 5, dpi: 300 });
    expect(box.pixels).toEqual({
      width: Math.round((106 / 25.4) * 300),
      height: Math.round((156 / 25.4) * 300),
    });
  });

  it("refuses a safe area wider than the page", () => {
    expect(codeOf(() => bleedBox({ widthMm: 100, heightMm: 150, bleedMm: 3, safeMm: 60 }))).toBe(
      "print.safeTooBig"
    );
  });
});
