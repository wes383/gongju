import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import { roundUpWidth, traceCurrent, traceWidth } from "@/lib/pcb";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (isCodedError(error)) return error.code;
    return "uncoded";
  }
  return "no-error";
}

describe("traceWidth", () => {
  it("matches the IPC-2221 chart for 3 A at 10 °C on 1 oz outer copper", () => {
    const result = traceWidth({ current: 3, deltaT: 10, copperOz: 1, layer: "external" });
    // The published curve sits near 50 mil ≈ 1.27 mm; the fit lands a bit higher
    expect(result.widthMil).toBeGreaterThan(52);
    expect(result.widthMil).toBeLessThan(56);
    expect(result.widthMm).toBeCloseTo(result.widthMil * 0.0254, 10);
  });

  it("needs twice the width on an inner layer", () => {
    const external = traceWidth({ current: 2, deltaT: 10, copperOz: 1, layer: "external" });
    const internal = traceWidth({ current: 2, deltaT: 10, copperOz: 1, layer: "internal" });
    expect(internal.areaMil2).toBeGreaterThan(external.areaMil2 * 2.5);
    expect(internal.widthMm).toBeGreaterThan(external.widthMm);
  });

  it("halves the width with twice the copper", () => {
    const one = traceWidth({ current: 2, deltaT: 10, copperOz: 1, layer: "external" });
    const two = traceWidth({ current: 2, deltaT: 10, copperOz: 2, layer: "external" });
    expect(two.widthMm).toBeCloseTo(one.widthMm / 2, 10);
    expect(two.thicknessMm).toBeCloseTo(one.thicknessMm * 2, 10);
  });

  it("reports the drop over the given length", () => {
    const result = traceWidth({
      current: 3,
      deltaT: 10,
      copperOz: 1,
      layer: "external",
      lengthMm: 50,
    });
    expect(result.resistance).toBeGreaterThan(0);
    expect(result.voltageDrop).toBeCloseTo(3 * result.resistance, 12);
    expect(result.powerLoss).toBeCloseTo(9 * result.resistance, 12);
    expect(result.tempC).toBe(30);
  });

  it("checks its inputs", () => {
    expect(codeOf(() => traceWidth({ current: 0, deltaT: 10, copperOz: 1, layer: "external" }))).toBe(
      "pcb.current"
    );
    expect(codeOf(() => traceWidth({ current: 1, deltaT: 0, copperOz: 1, layer: "external" }))).toBe(
      "pcb.deltaT"
    );
    expect(
      codeOf(() =>
        traceWidth({ current: 1, deltaT: 10, copperOz: 4 as unknown as 1, layer: "external" })
      )
    ).toBe("pcb.copper");
  });
});

describe("traceCurrent", () => {
  it("inverts traceWidth", () => {
    const width = traceWidth({ current: 3, deltaT: 10, copperOz: 1, layer: "external" });
    expect(traceCurrent(width.widthMm, 1, 10, "external")).toBeCloseTo(3, 6);
  });
});

describe("roundUpWidth", () => {
  it("rounds up to the next 0.05 mm", () => {
    expect(roundUpWidth(1.371)).toBeCloseTo(1.4, 10);
    expect(roundUpWidth(0.301)).toBeCloseTo(0.35, 10);
    expect(roundUpWidth(0)).toBe(0);
  });
});
