import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hslToRgb,
  parseColor,
  readableTextColor,
  rgbToHex,
  rgbToHsl,
} from "@/lib/color";

const BLACK = { r: 0, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };

describe("parseColor", () => {
  it("reads hex in all lengths", () => {
    expect(parseColor("#fff")).toEqual(WHITE);
    expect(parseColor("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
  });

  it("reads rgb() and hsl()", () => {
    expect(parseColor("rgb(255, 0, 0)")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseColor("hsl(0, 100%, 50%)")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("returns null for garbage", () => {
    expect(parseColor("not a color")).toBeNull();
  });
});

describe("rgbToHex", () => {
  it("pads and rounds channels", () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe("#ff0080");
  });
});

describe("hsl round-trip", () => {
  it("returns the original colour", () => {
    const source = { r: 37, g: 99, b: 235 };
    const back = hslToRgb(rgbToHsl(source));
    expect(back.r).toBeCloseTo(source.r, 0);
    expect(back.g).toBeCloseTo(source.g, 0);
    expect(back.b).toBeCloseTo(source.b, 0);
  });
});

describe("contrast", () => {
  it("rates black on white at the maximum", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 1);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
  });

  it("picks a readable text colour", () => {
    expect(readableTextColor(WHITE)).toBe("#000000");
    expect(readableTextColor(BLACK)).toBe("#ffffff");
  });
});
