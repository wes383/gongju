/**
 * Parcel chargeable weight: volumetric weight from the box dimensions, the
 * billed weight after rounding, and the freight cost at a given rate.
 *
 * Couriers apply their own divisors (5000, 6000, 8000) and rounding rules, so
 * both are inputs rather than constants.
 */

import { codedError } from "./errors";

export interface ParcelInput {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  actualKg: number;
  /** Volumetric divisor, e.g. 6000 for most express couriers */
  divisor: number;
  /** Billing step in kilograms, e.g. 0.5 or 1 */
  roundTo: number;
  /** Freight rate per billed kilogram, 0 to skip the cost */
  ratePerKg?: number;
}

export interface ParcelResult {
  volumeCm3: number;
  /** Length × width × height ÷ divisor */
  volumetricKg: number;
  /** The larger of actual and volumetric, before rounding */
  rawChargeableKg: number;
  /** Chargeable weight after the billing step */
  billedKg: number;
  /** Volumetric weight ÷ actual weight, null when actual is zero */
  ratio: number | null;
  /** True when the courier bills on volume rather than scale weight */
  byVolume: boolean;
  /** Billed weight × rate, null when no rate was given */
  cost: number | null;
}

const size = (value: number, key: string): number => {
  if (!Number.isFinite(value) || value < 1 || value > 300) throw codedError(key);
  return value;
};

export function parcelCharge(input: ParcelInput): ParcelResult {
  const lengthCm = size(input.lengthCm, "parcel.size");
  const widthCm = size(input.widthCm, "parcel.size");
  const heightCm = size(input.heightCm, "parcel.size");

  const actualKg = input.actualKg;
  if (!Number.isFinite(actualKg) || actualKg <= 0 || actualKg > 2000) {
    throw codedError("parcel.weight");
  }

  if (!Number.isFinite(input.divisor) || input.divisor < 1000 || input.divisor > 12000) {
    throw codedError("parcel.divisor");
  }
  if (!Number.isFinite(input.roundTo) || input.roundTo < 0.01 || input.roundTo > 10) {
    throw codedError("parcel.round");
  }

  const rate = input.ratePerKg ?? 0;
  if (!Number.isFinite(rate) || rate < 0) throw codedError("parcel.rate");

  const volumeCm3 = lengthCm * widthCm * heightCm;
  const volumetricKg = volumeCm3 / input.divisor;
  const rawChargeableKg = Math.max(actualKg, volumetricKg);
  // The epsilon keeps 1.0000001 kg from rounding up to the next whole kilo.
  const billedKg = Math.ceil(rawChargeableKg / input.roundTo - 1e-9) * input.roundTo;

  return {
    volumeCm3,
    volumetricKg,
    rawChargeableKg,
    billedKg: Math.round(billedKg * 1000) / 1000,
    ratio: actualKg > 0 ? volumetricKg / actualKg : null,
    byVolume: volumetricKg > actualKg,
    cost: rate > 0 ? billedKg * rate : null,
  };
}
