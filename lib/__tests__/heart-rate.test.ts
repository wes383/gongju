import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import {
  heartZones,
  maxHeartRate,
  maxHeartRateComparison,
  zoneTwo,
} from "@/lib/heart-rate";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("maxHeartRate", () => {
  it("applies the three formulas", () => {
    expect(maxHeartRate(30, "classic")).toBe(190);
    expect(maxHeartRate(30, "tanaka")).toBe(187);
    expect(maxHeartRate(30, "gulati")).toBe(180);
  });

  it("defaults to Tanaka", () => {
    expect(maxHeartRate(30)).toBe(187);
    expect(maxHeartRateComparison(30)).toEqual({ classic: 190, tanaka: 187, gulati: 180 });
  });

  it("rejects an age outside the range", () => {
    expect(codeOf(() => maxHeartRate(5))).toBe("health.age");
  });
});

describe("heartZones", () => {
  it("splits a 190 bpm maximum into five bands", () => {
    const zones = heartZones(190);
    expect(zones.map((zone) => [zone.low, zone.high])).toEqual([
      [95, 114],
      [114, 133],
      [133, 152],
      [152, 171],
      [171, 190],
    ]);
  });

  it("shifts to the reserve method when a resting pulse is given", () => {
    const zones = heartZones(190, 60, "reserve");
    expect(zones[0]).toMatchObject({ low: 125, high: 138 });
    expect(zones[4]).toMatchObject({ low: 177, high: 190 });
  });

  it("needs a resting pulse for the reserve method", () => {
    expect(codeOf(() => heartZones(190, null, "reserve"))).toBe("hr.resting");
    expect(codeOf(() => heartZones(190, 200, "reserve"))).toBe("hr.resting");
    expect(codeOf(() => heartZones(110, 120, "reserve"))).toBe("hr.restingAbove");
  });

  it("exposes zone 2 on its own", () => {
    expect(zoneTwo(190)).toMatchObject({ id: "z2", low: 114, high: 133 });
  });
});
