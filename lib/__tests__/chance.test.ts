import { describe, expect, it } from "vitest";
import {
  drawSample,
  randomDecimal,
  randomInteger,
  randomIntegers,
  randomUnit,
  rollDice,
} from "@/lib/chance";

describe("randomUnit", () => {
  it("stays within [0, 1)", () => {
    for (let i = 0; i < 200; i += 1) {
      const value = randomUnit();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("randomInteger", () => {
  it("includes both ends of the range", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 400; i += 1) seen.add(randomInteger(1, 3));
    expect([...seen].sort()).toEqual([1, 2, 3]);
  });

  it("handles a reversed range by swapping it", () => {
    for (let i = 0; i < 50; i += 1) {
      const value = randomInteger(10, 5);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(10);
    }
  });

  it("supports negative bounds", () => {
    for (let i = 0; i < 50; i += 1) {
      const value = randomInteger(-5, -1);
      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThanOrEqual(-1);
    }
  });
});

describe("randomDecimal", () => {
  it("respects the decimal places", () => {
    for (let i = 0; i < 50; i += 1) {
      const value = randomDecimal(0, 1, 3);
      expect(String(value).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(3);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("randomIntegers", () => {
  it("never repeats when unique is set", () => {
    const values = randomIntegers(1, 10, 10, true);
    expect(new Set(values).size).toBe(10);
    expect(Math.min(...values)).toBe(1);
    expect(Math.max(...values)).toBe(10);
  });

  it("rejects asking for more unique values than the range holds", () => {
    expect(() => randomIntegers(1, 3, 4, true)).toThrow();
  });

  it("falls back to a rejection loop for very wide ranges", () => {
    const values = randomIntegers(0, 5_000_000, 20, true);
    expect(new Set(values).size).toBe(20);
  });
});

describe("rollDice", () => {
  it("rolls between 1 and the number of sides", () => {
    const rolls = rollDice(20, 40);
    expect(rolls).toHaveLength(40);
    for (const roll of rolls) {
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
    }
  });
});

describe("drawSample", () => {
  it("draws without replacement", () => {
    const picked = drawSample(["a", "b", "c", "d", "e"], 3);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
  });

  it("caps the draw at the pool size", () => {
    expect(drawSample(["a", "b"], 5)).toHaveLength(2);
  });

  it("keeps the original array untouched", () => {
    const pool = ["a", "b", "c"];
    drawSample(pool, 3);
    expect(pool).toEqual(["a", "b", "c"]);
  });
});
