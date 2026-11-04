import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import {
  colorsForSlot,
  decodeBands,
  encodeValue,
  formatOhms,
  type BandColorId,
} from "@/lib/resistor";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (isCodedError(error)) return error.code;
    return "uncoded";
  }
  return "no-error";
}

describe("decodeBands", () => {
  it("reads a 4-band 1 kΩ part", () => {
    const parts = decodeBands(["brown", "black", "red", "gold"]);
    expect(parts.ohms).toBe(1000);
    expect(parts.tolerance).toBe(0.05);
    expect(parts.min).toBe(950);
    expect(parts.max).toBe(1050);
    expect(parts.tempco).toBeNull();
    expect(parts.expression).toBe("10 × 100 Ω");
  });

  it("uses three digit bands on 5 and 6-band parts", () => {
    expect(decodeBands(["brown", "black", "black", "red", "brown"]).ohms).toBe(10000);
    expect(decodeBands(["yellow", "violet", "black", "brown", "brown"]).ohms).toBe(4700);
  });

  it("keeps the temperature coefficient on a 6-band part", () => {
    const parts = decodeBands(["brown", "black", "black", "orange", "brown", "red"]);
    expect(parts.ohms).toBe(100000);
    expect(parts.tolerance).toBe(0.01);
    expect(parts.tempco).toBe(50);
  });

  it("allows the metallic multipliers", () => {
    expect(decodeBands(["brown", "black", "gold", "gold"]).ohms).toBeCloseTo(1, 10);
    expect(decodeBands(["brown", "black", "silver", "gold"]).ohms).toBeCloseTo(0.1, 10);
  });

  it("rejects a band count it cannot map", () => {
    expect(codeOf(() => decodeBands(["brown", "black", "red"] as BandColorId[]))).toBe(
      "res.bandCount"
    );
  });

  it("rejects gold in a digit slot and a silver tolerance is fine", () => {
    expect(codeOf(() => decodeBands(["gold", "black", "red", "gold"]))).toBe("res.digitSlot");
  });
});

describe("encodeValue", () => {
  it("turns 4.7 kΩ into yellow-violet-red", () => {
    const encoded = encodeValue(4700, { bands: 4 });
    expect(encoded.colors.slice(0, 3)).toEqual(["yellow", "violet", "red"]);
    expect(encoded.exact).toBe(true);
    expect(encoded.ohms).toBe(4700);
  });

  it("reports the rounding when the value does not fit the bands", () => {
    const encoded = encodeValue(4670, { bands: 4 });
    expect(encoded.ohms).toBe(4700);
    expect(encoded.exact).toBe(false);
  });

  it("carries into the next decade instead of dropping a digit", () => {
    const encoded = encodeValue(99.96, { bands: 4 });
    expect(encoded.ohms).toBe(100);
    expect(encoded.colors.slice(0, 3)).toEqual(["brown", "black", "brown"]);
  });

  it("picks the closest tolerance and tempco colours", () => {
    expect(encodeValue(1000, { bands: 4, tolerance: 0.05 }).colors[3]).toBe("gold");
    expect(encodeValue(1000, { bands: 6, tempco: 50 }).colors[5]).toBe("red");
  });

  it("refuses values below the silver multiplier or above 1 GΩ", () => {
    expect(codeOf(() => encodeValue(0.001))).toBe("res.outOfRange");
    expect(codeOf(() => encodeValue(1e12))).toBe("res.outOfRange");
    expect(codeOf(() => encodeValue(0))).toBe("res.positive");
  });
});

describe("formatOhms", () => {
  it("picks a prefix per decade", () => {
    expect(formatOhms(4700)).toBe("4.7 kΩ");
    expect(formatOhms(1_000_000)).toBe("1 MΩ");
    expect(formatOhms(0.5)).toBe("500 mΩ");
    expect(formatOhms(220)).toBe("220 Ω");
    expect(formatOhms(Number.NaN)).toBe("—");
  });
});

describe("colorsForSlot", () => {
  it("hides gold and silver from the digit slots", () => {
    const digits = colorsForSlot("digit").map((color) => color.id);
    expect(digits).toHaveLength(10);
    expect(digits).not.toContain("gold");
  });

  it("offers both metals as multipliers", () => {
    const multipliers = colorsForSlot("multiplier").map((color) => color.id);
    expect(multipliers).toContain("gold");
    expect(multipliers).toContain("silver");
  });
});
