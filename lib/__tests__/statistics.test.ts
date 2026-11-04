import { describe, expect, it } from "vitest";
import {
  MAX_VALUES,
  histogram,
  parseNumbers,
  quantileSorted,
  summarize,
} from "@/lib/statistics";

const SAMPLE = [2, 4, 4, 4, 5, 5, 7, 9];

describe("parse numbers", () => {
  it("splits on whitespace, commas and semicolons", () => {
    expect(parseNumbers("1 2,3;4\n5").values).toEqual([1, 2, 3, 4, 5]);
  });

  it("accepts signs, decimals and exponents", () => {
    expect(parseNumbers("-1.5 +2.5e2 .5").values).toEqual([-1.5, 250, 0.5]);
  });

  it("reports what it could not read", () => {
    const parsed = parseNumbers("1 abc 2 3x");
    expect(parsed.values).toEqual([1, 2]);
    expect(parsed.skipped).toEqual(["abc", "3x"]);
  });

  it("guards against a paste that is bigger than the page can draw", () => {
    const huge = Array.from({ length: MAX_VALUES + 1 }, () => "1").join(" ");
    expect(() => parseNumbers(huge)).toThrowError(/stats\.tooMany/);
  });
});

describe("quantiles", () => {
  it("interpolates between order statistics", () => {
    const sorted = [1, 2, 3, 4];
    expect(quantileSorted(sorted, 0)).toBe(1);
    expect(quantileSorted(sorted, 0.25)).toBe(1.75);
    expect(quantileSorted(sorted, 0.5)).toBe(2.5);
    expect(quantileSorted(sorted, 1)).toBe(4);
  });

  it("returns the single value for a one-element sample", () => {
    expect(quantileSorted([7], 0.25)).toBe(7);
  });

  it("rejects an empty sample", () => {
    expect(() => quantileSorted([], 0.5)).toThrowError(/stats\.empty/);
  });
});

describe("summary", () => {
  const s = summarize(SAMPLE);

  it("computes the five-number summary", () => {
    expect(s.count).toBe(8);
    expect(s.sum).toBe(40);
    expect(s.min).toBe(2);
    expect(s.max).toBe(9);
    expect(s.median).toBe(4.5);
    expect(s.q1).toBeCloseTo(4, 10);
    expect(s.q3).toBeCloseTo(5.5, 10);
    expect(s.iqr).toBeCloseTo(1.5, 10);
  });

  it("computes mean and both spreads", () => {
    expect(s.mean).toBe(5);
    expect(s.variancePopulation).toBeCloseTo(4, 10);
    expect(s.varianceSample).toBeCloseTo(32 / 7, 10);
    expect(s.stdPopulation).toBeCloseTo(2, 10);
    expect(s.stdSample).toBeCloseTo(Math.sqrt(32 / 7), 10);
  });

  it("reports every value tied for the highest count", () => {
    expect(s.modes).toEqual([{ value: 4, count: 3 }]);
    expect(summarize([1, 3, 3, 5, 5]).modes).toEqual([
      { value: 3, count: 2 },
      { value: 5, count: 2 },
    ]);
  });

  it("finds no outlier in a tight sample", () => {
    expect(summarize([4, 5, 5, 6, 6, 7]).outliers).toEqual({ low: [], high: [] });
  });

  it("flags values beyond the 1.5 IQR fence", () => {
    const wide = summarize([1, 2, 3, 4, 5, 6, 7, 8, 100]);
    expect(wide.outliers.high).toEqual([100]);
    expect(wide.outliers.low).toEqual([]);
  });

  it("only reports geometric and harmonic means for positive data", () => {
    expect(summarize([1, 2, 4]).geometricMean).toBeCloseTo(2, 10);
    expect(summarize([1, 2, 4]).harmonicMean).toBeCloseTo(12 / 7, 10);
    expect(summarize([0, 1]).geometricMean).toBeNull();
    expect(summarize([-1, 2]).harmonicMean).toBeNull();
  });

  it("needs enough points for shape statistics", () => {
    expect(summarize([1, 2]).skewness).toBeNull();
    expect(summarize([1, 2, 3]).skewness).toBeCloseTo(0, 10); // symmetric
    expect(summarize([1, 2, 3]).kurtosis).toBeNull();
    expect(summarize([1, 1, 1, 1]).skewness).toBeNull(); // zero spread
  });

  it("computes bias-corrected skewness and excess kurtosis", () => {
    const shaped = summarize([1, 2, 3, 4, 10]);
    expect(shaped.skewness).toBeCloseTo(1.6971, 4);
    expect(shaped.kurtosis).toBeCloseTo(3.152, 3);
  });

  it("sorts a copy instead of mutating the input", () => {
    const input = [3, 1, 2];
    summarize(input);
    expect(input).toEqual([3, 1, 2]);
  });

  it("rejects an empty sample", () => {
    expect(() => summarize([])).toThrowError(/stats\.empty/);
  });

  it("keeps the coefficient of variation undefined around a zero mean", () => {
    expect(summarize([-1, 1]).cv).toBeNull();
    expect(summarize([2, 4]).cv).toBeCloseTo(Math.sqrt(2) / 3, 10);
  });
});

describe("histogram", () => {
  it("counts every value exactly once", () => {
    const { bins } = histogram([1, 2, 3, 4, 5], 2);
    expect(bins).toHaveLength(2);
    expect(bins.reduce((acc, bin) => acc + bin.count, 0)).toBe(5);
  });

  it("puts the maximum in the last bin", () => {
    const { bins } = histogram([0, 5, 10], 2);
    expect(bins[0].count).toBe(1);
    expect(bins[1].count).toBe(2);
    expect(bins[1].to).toBe(10);
  });

  it("collapses identical values into a single bin", () => {
    const { bins, width } = histogram([3, 3, 3]);
    expect(width).toBe(0);
    expect(bins).toEqual([{ from: 3, to: 3, count: 3 }]);
  });

  it("caps the bin count", () => {
    const many = Array.from({ length: 1000 }, (_, i) => i);
    expect(histogram(many, 500).bins.length).toBe(40);
  });
});
