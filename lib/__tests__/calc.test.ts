import { describe, expect, it } from "vitest";
import {
  applyPercent,
  bmi,
  bmiCategory,
  healthyWeightRange,
  percentChange,
  percentOf,
  percentValue,
} from "@/lib/calc";

describe("percentages", () => {
  it("computes a share of a whole", () => {
    expect(percentOf(25, 200)).toBe(12.5);
    expect(percentOf(1, 3)).toBeCloseTo(33.3333333, 6);
    expect(percentOf(50, 100)).toBe(50);
    expect(percentOf(1, 0)).toBeNaN();
  });

  it("computes a percent of a number", () => {
    expect(percentValue(200, 15)).toBe(30);
    expect(percentValue(49.9, 7.5)).toBeCloseTo(3.7425, 10);
    expect(percentValue(100, 0)).toBe(0);
  });

  it("computes the relative change", () => {
    expect(percentChange(80, 100)).toBe(25);
    expect(percentChange(100, 80)).toBe(-20);
    expect(percentChange(-100, -50)).toBe(50);
    expect(percentChange(0, 5)).toBeNaN();
  });

  it("applies an increase or a decrease", () => {
    expect(applyPercent(200, 10, "increase")).toBe(220);
    expect(applyPercent(200, 10, "decrease")).toBe(180);
    expect(applyPercent(100, 100, "decrease")).toBe(0);
  });
});

describe("bmi", () => {
  it("computes the index", () => {
    expect(bmi(65, 170)).toBeCloseTo(22.4913, 4);
    expect(bmi(80, 180)).toBeCloseTo(24.6914, 4);
  });

  it("rejects a zero or negative height or weight", () => {
    expect(bmi(65, 0)).toBeNaN();
    expect(bmi(0, 170)).toBeNaN();
    expect(bmi(-10, 170)).toBeNaN();
  });

  it("maps the WHO bands", () => {
    expect(bmiCategory(18.4, "who")).toBe("underweight");
    expect(bmiCategory(18.5, "who")).toBe("normal");
    expect(bmiCategory(24.9, "who")).toBe("normal");
    expect(bmiCategory(25, "who")).toBe("overweight");
    expect(bmiCategory(30, "who")).toBe("obese1");
    expect(bmiCategory(35, "who")).toBe("obese2");
    expect(bmiCategory(41, "who")).toBe("obese3");
  });

  it("maps the chinese bands", () => {
    expect(bmiCategory(23.9, "cn")).toBe("normal");
    expect(bmiCategory(24, "cn")).toBe("overweight");
    expect(bmiCategory(27.9, "cn")).toBe("overweight");
    expect(bmiCategory(28, "cn")).toBe("obese1");
    expect(bmiCategory(40, "cn")).toBe("obese1");
  });

  it("keeps the healthy range inside the normal band", () => {
    const who = healthyWeightRange(170, "who");
    expect(who.min).toBeCloseTo(53.465, 6);
    expect(who.max).toBeCloseTo(71.961, 6);
    expect(bmiCategory((who.max / 1.7 ** 2), "who")).toBe("normal");

    const cn = healthyWeightRange(170, "cn");
    expect(cn.max).toBeCloseTo(69.071, 6);
    expect(bmiCategory(cn.max / 1.7 ** 2, "cn")).toBe("normal");
  });

  it("returns NaN for an invalid height", () => {
    const range = healthyWeightRange(0);
    expect(range.min).toBeNaN();
    expect(range.max).toBeNaN();
  });
});
