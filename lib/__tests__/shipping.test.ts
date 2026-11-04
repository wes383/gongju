import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import { parcelCharge, type ParcelInput } from "@/lib/shipping";

const BASE: ParcelInput = {
  lengthCm: 50,
  widthCm: 40,
  heightCm: 30,
  actualKg: 8,
  divisor: 6000,
  roundTo: 0.5,
  ratePerKg: 12,
};

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("parcelCharge", () => {
  it("bills the volumetric weight when the box is bulky", () => {
    const result = parcelCharge(BASE);
    expect(result.volumeCm3).toBe(60000);
    expect(result.volumetricKg).toBeCloseTo(10, 6);
    expect(result.rawChargeableKg).toBe(10);
    expect(result.billedKg).toBe(10);
    expect(result.byVolume).toBe(true);
    expect(result.ratio).toBeCloseTo(1.25, 6);
    expect(result.cost).toBe(120);
  });

  it("bills the scale weight when the parcel is dense", () => {
    const result = parcelCharge({ ...BASE, lengthCm: 20, widthCm: 20, heightCm: 20, actualKg: 15 });
    expect(result.volumetricKg).toBeCloseTo(1.3333, 4);
    expect(result.billedKg).toBe(15);
    expect(result.byVolume).toBe(false);
  });

  it("rounds up to the billing step", () => {
    expect(parcelCharge({ ...BASE, lengthCm: 10, widthCm: 10, heightCm: 10, actualKg: 1.2 }).billedKg).toBe(1.5);
    expect(
      parcelCharge({
        ...BASE,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        actualKg: 1.2,
        roundTo: 1,
      }).billedKg
    ).toBe(2);
  });

  it("does not push an exact weight into the next step", () => {
    const result = parcelCharge({
      ...BASE,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      actualKg: 1,
      roundTo: 1,
    });
    expect(result.billedKg).toBe(1);
  });

  it("skips the freight cost without a rate", () => {
    expect(parcelCharge({ ...BASE, ratePerKg: 0 }).cost).toBeNull();
    expect(parcelCharge({ ...BASE, ratePerKg: undefined }).cost).toBeNull();
  });

  it("rejects dimensions and divisors outside the supported range", () => {
    expect(codeOf(() => parcelCharge({ ...BASE, lengthCm: 0 }))).toBe("parcel.size");
    expect(codeOf(() => parcelCharge({ ...BASE, heightCm: 400 }))).toBe("parcel.size");
    expect(codeOf(() => parcelCharge({ ...BASE, actualKg: 0 }))).toBe("parcel.weight");
    expect(codeOf(() => parcelCharge({ ...BASE, divisor: 500 }))).toBe("parcel.divisor");
    expect(codeOf(() => parcelCharge({ ...BASE, roundTo: 0 }))).toBe("parcel.round");
    expect(codeOf(() => parcelCharge({ ...BASE, ratePerKg: -1 }))).toBe("parcel.rate");
  });
});
