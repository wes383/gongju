import { describe, expect, it } from "vitest";
import {
  CONVERTER_CATEGORIES,
  UNIT_CATEGORIES,
  convert,
  convertAll,
  trigOf,
  formatNumber,
  formatReadable,
  getCategory,
  getUnit,
} from "@/lib/units";

describe("convert", () => {
  it("converts length units through the metre base", () => {
    expect(convert("length", 1, "m", "cm")).toBe(100);
    expect(convert("length", 1, "m", "ft")).toBeCloseTo(3.280839895, 9);
    expect(convert("length", 1, "mi", "km")).toBeCloseTo(1.609344, 9);
    expect(convert("length", 1, "in", "cm")).toBeCloseTo(2.54, 9);
    expect(convert("length", 1, "nmi", "m")).toBe(1852);
  });

  it("handles the chinese market units", () => {
    expect(convert("length", 1, "li", "m")).toBe(500);
    expect(convert("length", 1, "chi", "m")).toBeCloseTo(1 / 3, 12);
    expect(convert("mass", 1, "jin", "kg")).toBe(0.5);
    expect(convert("mass", 1, "liang", "g")).toBeCloseTo(50, 9);
    expect(convert("area", 1, "mu", "m2")).toBeCloseTo(666.6666667, 6);
  });

  it("converts temperatures with the offset applied", () => {
    expect(convert("temperature", 0, "c", "f")).toBe(32);
    expect(convert("temperature", 100, "c", "f")).toBe(212);
    expect(convert("temperature", -40, "c", "f")).toBe(-40);
    expect(convert("temperature", 0, "c", "k")).toBeCloseTo(273.15, 9);
    expect(convert("temperature", 32, "f", "c")).toBeCloseTo(0, 9);
    expect(convert("temperature", 273.15, "k", "c")).toBeCloseTo(0, 9);
    expect(convert("temperature", 491.67, "r", "f")).toBeCloseTo(32, 6);
  });

  it("converts mass, volume and speed", () => {
    expect(convert("mass", 1, "kg", "lb")).toBeCloseTo(2.2046226218, 8);
    expect(convert("mass", 1, "t", "kg")).toBe(1000);
    expect(convert("volume", 1, "gal", "l")).toBeCloseTo(3.785411784, 9);
    expect(convert("volume", 1, "m3", "l")).toBe(1000);
    expect(convert("speed", 100, "kmh", "ms")).toBeCloseTo(27.7777778, 6);
    expect(convert("speed", 1, "kn", "kmh")).toBeCloseTo(1.852, 6);
  });

  it("converts pressure, energy and power", () => {
    expect(convert("pressure", 1, "bar", "kpa")).toBe(100);
    expect(convert("pressure", 1, "atm", "pa")).toBe(101325);
    expect(convert("pressure", 1, "psi", "pa")).toBeCloseTo(6894.757293168, 6);
    expect(convert("energy", 1, "kwh", "j")).toBe(3.6e6);
    expect(convert("energy", 1, "kcal", "kj")).toBeCloseTo(4.184, 9);
    expect(convert("power", 1, "hp", "w")).toBeCloseTo(745.6998716, 6);
    expect(convert("power", 1, "ps", "w")).toBeCloseTo(735.49875, 9);
  });

  it("converts data sizes in both bases", () => {
    expect(convert("data", 1, "gb", "byte")).toBe(1e9);
    expect(convert("data", 1, "gib", "byte")).toBe(1073741824);
    expect(convert("data", 1, "gib", "gib")).toBe(1);
    expect(convert("data", 1, "byte", "bit")).toBe(8);
    expect(convert("data", 1, "mib", "kib")).toBe(1024);
    expect(convert("data", 1, "tb", "gib")).toBeCloseTo(931.3225746, 6);
  });

  it("converts angles", () => {
    expect(convert("angle", 180, "deg", "rad")).toBeCloseTo(Math.PI, 12);
    expect(convert("angle", 1, "turn", "grad")).toBe(400);
    expect(convert("angle", 1, "deg", "arcmin")).toBe(60);
    expect(convert("angle", 3600, "arcsec", "deg")).toBeCloseTo(1, 12);
  });

  it("returns NaN for a non-finite input", () => {
    expect(convert("length", NaN, "m", "cm")).toBeNaN();
    expect(convert("length", Infinity, "m", "cm")).toBeNaN();
  });

  it("throws for unknown categories and units", () => {
    expect(() => getCategory("nope" as never)).toThrow();
    expect(() => getUnit("length", "parsec")).toThrow();
  });

  it("round-trips every unit in every category", () => {
    for (const category of UNIT_CATEGORIES) {
      for (const unit of category.units) {
        const there = convert(category.id, 42, category.base, unit.id);
        const back = convert(category.id, there, unit.id, category.base);
        expect(back).toBeCloseTo(42, 9);
      }
    }
  });
});

describe("convertAll", () => {
  it("lists every unit of the category", () => {
    const rows = convertAll("length", 1, "m");
    expect(rows).toHaveLength(getCategory("length").units.length);
    expect(rows.find((row) => row.unit.id === "cm")?.value).toBe(100);
  });

  it("covers all converter categories", () => {
    for (const id of CONVERTER_CATEGORIES) {
      expect(convertAll(id, 1, getCategory(id).base).length).toBeGreaterThan(0);
    }
  });
});

describe("formatNumber", () => {
  it("trims float noise", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
    expect(formatNumber(1 / 3)).toBe("0.33333333");
    expect(formatNumber(2.54)).toBe("2.54");
  });

  it("keeps small and large numbers readable", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1e-9)).toBe("1e-9");
    expect(formatNumber(1.234e-7)).toBe("1.234e-7");
    expect(formatNumber(1e15)).toBe("1e+15");
    expect(formatNumber(NaN)).toBe("—");
  });

  it("groups thousands only in the readable variant", () => {
    expect(formatReadable(1234567.5, 8, "en")).toBe("1,234,567.5");
    expect(formatNumber(1234567.5)).toBe("1234567.5");
  });
});

describe("trigOf", () => {
  it("lands on the exact values a right angle has", () => {
    const { sin, cos, tan } = trigOf(90);
    expect(sin).toBe(1);
    expect(cos).toBe(0);
    // Not 1.6e16: a right angle has no tangent
    expect(tan).toBeNaN();
  });

  it("cleans the float noise at every quadrant boundary", () => {
    expect(trigOf(0)).toEqual({ sin: 0, cos: 1, tan: 0 });
    const half = trigOf(180);
    expect(half.sin).toBe(0);
    expect(half.cos).toBe(-1);
    expect(half.tan === 0).toBe(true);
    expect(trigOf(270).cos).toBe(0);
    expect(trigOf(270).tan).toBeNaN();
    expect(trigOf(360).sin).toBe(0);
  });

  it("keeps genuine fractions intact", () => {
    expect(trigOf(30).sin).toBeCloseTo(0.5, 12);
    expect(trigOf(45).tan).toBeCloseTo(1, 12);
    expect(trigOf(60).cos).toBeCloseTo(0.5, 12);
  });
});
