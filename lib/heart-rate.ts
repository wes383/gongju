/**
 * Maximum heart rate estimates and the five training zones built from them.
 *
 * The three formulas disagree by several beats per minute by design; showing
 * the spread is more honest than presenting one number as the truth.
 */

import { codedError } from "./errors";

export type HrFormula = "classic" | "tanaka" | "gulati";

export type ZoneMethod = "max" | "reserve";

export type ZoneId = "z1" | "z2" | "z3" | "z4" | "z5";

export interface HeartZone {
  id: ZoneId;
  low: number;
  high: number;
  /** Percent of the reference (max or heart-rate reserve) at each edge */
  lowPct: number;
  highPct: number;
}

const AGE_RANGE: [number, number] = [10, 120];

export function maxHeartRate(age: number, formula: HrFormula = "tanaka"): number {
  if (!Number.isFinite(age) || age < AGE_RANGE[0] || age > AGE_RANGE[1]) {
    throw codedError("health.age", String(AGE_RANGE[0]), String(AGE_RANGE[1]));
  }
  if (formula === "classic") return Math.round(220 - age);
  if (formula === "gulati") return Math.round(206 - 0.88 * age);
  return Math.round(208 - 0.7 * age);
}

export function maxHeartRateComparison(age: number): Record<HrFormula, number> {
  return {
    classic: maxHeartRate(age, "classic"),
    tanaka: maxHeartRate(age, "tanaka"),
    gulati: maxHeartRate(age, "gulati"),
  };
}

/** Lower edge of each zone; Z5 runs up to the maximum */
const ZONE_EDGES: [ZoneId, number, number][] = [
  ["z1", 0.5, 0.6],
  ["z2", 0.6, 0.7],
  ["z3", 0.7, 0.8],
  ["z4", 0.8, 0.9],
  ["z5", 0.9, 1],
];

/**
 * Five zones as beats per minute.
 *
 * `max` uses plain percentages of HRmax. `reserve` (Karvonen) works off the
 * heart-rate reserve, which is what a resting pulse buys you: the same effort
 * lands on a higher number, and the zones track fitness changes.
 */
export function heartZones(
  maxHr: number,
  restingHr: number | null = null,
  method: ZoneMethod = "max"
): HeartZone[] {
  if (!Number.isFinite(maxHr) || maxHr < 100 || maxHr > 230) throw codedError("hr.max");
  const reserve = method === "reserve";
  if (reserve) {
    if (restingHr === null || !Number.isFinite(restingHr) || restingHr < 30 || restingHr > 120) {
      throw codedError("hr.resting");
    }
    if (restingHr >= maxHr) throw codedError("hr.restingAbove");
  }

  const base = reserve ? (restingHr as number) : 0;
  const span = reserve ? maxHr - (restingHr as number) : maxHr;
  return ZONE_EDGES.map(([id, lowPct, highPct]) => ({
    id,
    low: Math.round(base + lowPct * span),
    high: Math.round(base + highPct * span),
    lowPct,
    highPct,
  }));
}

/** Zone 2 — the conversational band most endurance plans are built around */
export function zoneTwo(maxHr: number, restingHr: number | null = null, method: ZoneMethod = "max"): HeartZone {
  return heartZones(maxHr, restingHr, method)[1];
}
