/**
 * Small everyday calculators: percentages and BMI.
 *
 * Kept free of React so the edge cases (division by zero, inverted ranges) can
 * be unit tested directly.
 */

/* ══════════════════════════════════════════════════════════════
   Percentages
   ══════════════════════════════════════════════════════════════ */

/** How many percent `part` is of `whole`; NaN when `whole` is 0 */
export function percentOf(part: number, whole: number): number {
  if (whole === 0) return NaN;
  return (part / whole) * 100;
}

/** `rate` percent of `base` */
export function percentValue(base: number, rate: number): number {
  return (base * rate) / 100;
}

/** Relative change from `from` to `to`, in percent; NaN when `from` is 0 */
export function percentChange(from: number, to: number): number {
  if (from === 0) return NaN;
  return ((to - from) / Math.abs(from)) * 100;
}

/** `base` increased or decreased by `rate` percent */
export function applyPercent(base: number, rate: number, direction: "increase" | "decrease"): number {
  const delta = (base * rate) / 100;
  return direction === "increase" ? base + delta : base - delta;
}

/* ══════════════════════════════════════════════════════════════
   BMI
   ══════════════════════════════════════════════════════════════ */

export type BmiStandard = "who" | "cn";

export type BmiCategoryId = "underweight" | "normal" | "overweight" | "obese1" | "obese2" | "obese3";

export interface BmiBand {
  /** Upper bound, exclusive */
  max: number;
  id: BmiCategoryId;
}

/**
 * WHO cut-offs, plus the Chinese adult standard (WS/T 428-2013), which puts the
 * overweight line at 24 and obesity at 28 instead of 25 and 30.
 */
export const BMI_BANDS: Record<BmiStandard, BmiBand[]> = {
  who: [
    { max: 18.5, id: "underweight" },
    { max: 25, id: "normal" },
    { max: 30, id: "overweight" },
    { max: 35, id: "obese1" },
    { max: 40, id: "obese2" },
    { max: Infinity, id: "obese3" },
  ],
  cn: [
    { max: 18.5, id: "underweight" },
    { max: 24, id: "normal" },
    { max: 28, id: "overweight" },
    { max: Infinity, id: "obese1" },
  ],
};

/** Weight (kg) and height (cm) to BMI; NaN for a non-positive height */
export function bmi(weightKg: number, heightCm: number): number {
  if (!(heightCm > 0) || !(weightKg > 0)) return NaN;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(value: number, standard: BmiStandard = "who"): BmiCategoryId {
  const band = BMI_BANDS[standard].find((item) => value < item.max);
  // `value` is NaN or the last band is Infinity, so only the fallback is left
  return band ? band.id : "obese3";
}

/** Weight range (kg) that keeps BMI inside the normal band for this height */
export function healthyWeightRange(
  heightCm: number,
  standard: BmiStandard = "who"
): { min: number; max: number } {
  const heightM = heightCm / 100;
  if (!(heightM > 0)) return { min: NaN, max: NaN };
  const bands = BMI_BANDS[standard];
  const normal = bands.find((band) => band.id === "normal")!;
  const lower = bands[0].max;
  return {
    min: lower * heightM * heightM,
    // The band upper bound is exclusive, so shave off a tenth to keep the
    // quoted range inside "normal" instead of landing on "overweight"
    max: (normal.max - 0.1) * heightM * heightM,
  };
}
