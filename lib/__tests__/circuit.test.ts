import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import { batteryLife, solveOhms, splitDuration, voltageDivider } from "@/lib/circuit";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (isCodedError(error)) return error.code;
    return "uncoded";
  }
  return "no-error";
}

describe("solveOhms", () => {
  it("fills in R and P from V and I", () => {
    const solved = solveOhms({ voltage: 12, current: 2 });
    expect(solved.resistance).toBe(6);
    expect(solved.power).toBe(24);
  });

  it("fills in I and P from V and R", () => {
    const solved = solveOhms({ voltage: 12, resistance: 100 });
    expect(solved.current).toBeCloseTo(0.12, 12);
    expect(solved.power).toBeCloseTo(1.44, 12);
  });

  it("fills in V and P from I and R", () => {
    const solved = solveOhms({ current: 0.02, resistance: 250 });
    expect(solved.voltage).toBeCloseTo(5, 12);
    expect(solved.power).toBeCloseTo(0.1, 12);
  });

  it("fills in I and R from V and P", () => {
    const solved = solveOhms({ voltage: 5, power: 0.5 });
    expect(solved.current).toBeCloseTo(0.1, 12);
    expect(solved.resistance).toBeCloseTo(50, 12);
  });

  it("fills in V and R from I and P", () => {
    const solved = solveOhms({ current: 0.5, power: 2.5 });
    expect(solved.voltage).toBeCloseTo(5, 12);
    expect(solved.resistance).toBeCloseTo(10, 12);
  });

  it("fills in V and I from R and P", () => {
    const solved = solveOhms({ resistance: 10, power: 2.5 });
    expect(solved.current).toBeCloseTo(0.5, 12);
    expect(solved.voltage).toBeCloseTo(5, 12);
  });

  it("tolerates a rounded third value but not a wrong one", () => {
    expect(() => solveOhms({ voltage: 5, resistance: 220, power: 0.114 })).not.toThrow();
    expect(codeOf(() => solveOhms({ voltage: 5, resistance: 220, power: 1 }))).toBe("ohm.mismatch");
  });

  it("asks for a second known value", () => {
    expect(codeOf(() => solveOhms({ voltage: 5 }))).toBe("ohm.needTwo");
  });

  it("refuses zero and negative inputs where they make no sense", () => {
    expect(codeOf(() => solveOhms({ voltage: 5, resistance: 0 }))).toBe("ohm.positiveResistance");
    expect(codeOf(() => solveOhms({ voltage: -5, current: 1 }))).toBe("ohm.negative");
    expect(codeOf(() => solveOhms({ power: 5, current: 0 }))).toBe("ohm.zeroDivide");
  });
});

describe("voltageDivider", () => {
  it("splits evenly for equal resistors", () => {
    const result = voltageDivider({ vin: 12, r1: 10_000, r2: 10_000 });
    expect(result.vout).toBeCloseTo(6, 10);
    expect(result.ratio).toBeCloseTo(0.5, 10);
    expect(result.current).toBeCloseTo(0.0006, 12);
    expect(result.loaded).toBe(false);
  });

  it("drops under load", () => {
    const open = voltageDivider({ vin: 12, r1: 10_000, r2: 10_000 });
    const loaded = voltageDivider({ vin: 12, r1: 10_000, r2: 10_000, load: 10_000 });
    expect(loaded.vout).toBeLessThan(open.vout);
    expect(loaded.lowerLeg).toBeCloseTo(5000, 6);
    expect(loaded.vout).toBeCloseTo(4, 10);
    expect(loaded.loadPower).toBeCloseTo((4 * 4) / 10_000, 12);
  });

  it("rejects a zero or negative leg", () => {
    expect(codeOf(() => voltageDivider({ vin: 5, r1: 0, r2: 10 }))).toBe(
      "ohm.positiveResistance"
    );
    expect(codeOf(() => voltageDivider({ vin: 5, r1: 10, r2: 10, load: 0 }))).toBe("div.load");
  });
});

describe("batteryLife", () => {
  it("divides usable capacity by the draw", () => {
    const result = batteryLife({ capacityMah: 2000, voltage: 3.7, loadMa: 500, usable: 0.8 });
    expect(result.hours).toBeCloseTo(3.2, 10);
    expect(result.wh).toBeCloseTo(7.4, 10);
    expect(result.averagePower).toBeCloseTo(1.85, 10);
    expect(result.usableMah).toBeCloseTo(1600, 10);
  });

  it("accepts a wattage instead of a current", () => {
    const result = batteryLife({ capacityMah: 2000, voltage: 5, loadW: 1, usable: 1 });
    expect(result.loadMa).toBeCloseTo(200, 10);
    expect(result.hours).toBeCloseTo(10, 10);
  });

  it("checks every input", () => {
    expect(codeOf(() => batteryLife({ capacityMah: 0, voltage: 5, loadMa: 100 }))).toBe(
      "bat.capacity"
    );
    expect(codeOf(() => batteryLife({ capacityMah: 2000, voltage: 5, loadMa: 0 }))).toBe("bat.load");
    expect(codeOf(() => batteryLife({ capacityMah: 2000, voltage: 5, loadMa: 1, usable: 2 }))).toBe(
      "bat.usable"
    );
  });
});

describe("splitDuration", () => {
  it("splits hours into days, hours and minutes", () => {
    expect(splitDuration(54.5)).toEqual({ days: 2, hours: 6, minutes: 30 });
    expect(splitDuration(0.25)).toEqual({ days: 0, hours: 0, minutes: 15 });
  });
});
