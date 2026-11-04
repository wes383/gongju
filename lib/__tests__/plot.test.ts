import { describe, expect, it } from "vitest";
import { PLOT_SAMPLES, autoRange, clampRange, formatTick, niceTicks, sampleFunction } from "@/lib/plot";

describe("sampling", () => {
  it("walks from xMin to xMax inclusive", () => {
    const points = sampleFunction((x) => x * x, -2, 2, 5);
    expect(points.map((p) => p.x)).toEqual([-2, -1, 0, 1, 2]);
    expect(points.map((p) => p.y)).toEqual([4, 1, 0, 1, 4]);
  });

  it("defaults to the shared resolution", () => {
    expect(sampleFunction((x) => x, 0, 1)).toHaveLength(PLOT_SAMPLES);
  });

  it("marks non-finite values as gaps instead of dropping them", () => {
    const points = sampleFunction((x) => 1 / x, -1, 1, 3);
    expect(points).toHaveLength(3);
    expect(points[1]).toEqual({ x: 0, y: null });
  });

  it("survives an evaluator that throws", () => {
    const points = sampleFunction(
      (x) => {
        if (x > 0) throw new Error("nope");
        return x;
      },
      -1,
      1,
      3
    );
    expect(points[2]).toEqual({ x: 1, y: null });
  });

  it("returns nothing for an empty or inverted range", () => {
    expect(sampleFunction((x) => x, 1, 1)).toEqual([]);
    expect(sampleFunction((x) => x, 2, 1)).toEqual([]);
  });
});

describe("auto range", () => {
  const series = (ys: (number | null)[]) => ys.map((y, i) => ({ x: i, y }));

  it("pads the visible band", () => {
    const range = autoRange([series([0, 1, 2, 3, 4])], { padding: 0.1 });
    expect(range.min).toBeLessThan(0);
    expect(range.max).toBeGreaterThan(4);
  });

  it("clips a single spike so the rest stays readable", () => {
    const ys = Array.from({ length: 100 }, (_, i) => (i === 50 ? 1_000_000 : Math.sin(i)));
    const range = autoRange([series(ys)]);
    expect(range.max).toBeLessThan(10);
    expect(range.min).toBeLessThan(0);
  });

  it("keeps a constant series visible", () => {
    expect(autoRange([series([5, 5, 5])])).toEqual({ min: 4, max: 6 });
  });

  it("falls back when there is nothing to draw", () => {
    expect(autoRange([])).toEqual({ min: -1, max: 1 });
    expect(autoRange([series([null, null])])).toEqual({ min: -1, max: 1 });
  });

  it("spans every series, not just the first", () => {
    const range = autoRange([series([0, 1]), series([-10, 10])]);
    expect(range.min).toBeLessThan(-9);
    expect(range.max).toBeGreaterThan(9);
  });
});

describe("ticks", () => {
  it("picks 1/2/5 steps", () => {
    expect(niceTicks(0, 10, 5)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it("stays inside the range", () => {
    const ticks = niceTicks(-3.7, 8.2, 4);
    expect(ticks.length).toBeGreaterThan(1);
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(-3.7);
    expect(Math.max(...ticks)).toBeLessThanOrEqual(8.2);
  });

  it("survives a zero-width range", () => {
    expect(niceTicks(2, 2)).toEqual([]);
  });

  it("formats labels compactly", () => {
    expect(formatTick(0)).toBe("0");
    expect(formatTick(0.5)).toBe("0.5");
    expect(formatTick(1234.5678)).toBe("1234.57");
    expect(formatTick(1e6)).toBe("1.0e6");
    expect(formatTick(0.00001)).toBe("1.0e-5");
  });
});

describe("clamp range", () => {
  it("replaces a degenerate range", () => {
    expect(clampRange({ min: 1, max: 1 })).toEqual({ min: -1, max: 1 });
    expect(clampRange({ min: Number.NaN, max: 2 })).toEqual({ min: -1, max: 1 });
  });

  it("passes a valid range through", () => {
    expect(clampRange({ min: -2, max: 3 })).toEqual({ min: -2, max: 3 });
  });
});
