/**
 * Body metrics: basal metabolic rate, daily energy need, macronutrient split
 * and a fluid target.
 *
 * Every formula here is a population estimate, not a measurement — the UI says
 * so, and the numbers are rounded to a precision the inputs can support.
 */

import { codedError } from "./errors";

export type Sex = "male" | "female";

export type ActivityId = "sedentary" | "light" | "moderate" | "active" | "veryActive";

export type FormulaId = "mifflin" | "harris" | "katch";

export interface BodyInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  /** Body fat percentage, 0–70. Only Katch-McArdle needs it. */
  bodyFat?: number | null;
}

/** Multipliers from the Harris-Benedict activity scale, still the common set */
export const ACTIVITY_FACTORS: Record<ActivityId, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

const AGE_RANGE: [number, number] = [10, 120];
const HEIGHT_RANGE: [number, number] = [50, 260];
const WEIGHT_RANGE: [number, number] = [20, 400];

function checkBody(input: BodyInput): void {
  const { age, heightCm, weightKg } = input;
  if (!Number.isFinite(age) || age < AGE_RANGE[0] || age > AGE_RANGE[1]) {
    throw codedError("health.age", String(AGE_RANGE[0]), String(AGE_RANGE[1]));
  }
  if (!Number.isFinite(heightCm) || heightCm < HEIGHT_RANGE[0] || heightCm > HEIGHT_RANGE[1]) {
    throw codedError("health.height", String(HEIGHT_RANGE[0]), String(HEIGHT_RANGE[1]));
  }
  if (!Number.isFinite(weightKg) || weightKg < WEIGHT_RANGE[0] || weightKg > WEIGHT_RANGE[1]) {
    throw codedError("health.weight", String(WEIGHT_RANGE[0]), String(WEIGHT_RANGE[1]));
  }
}

/**
 * Mifflin-St Jeor (1990), the one most dietitians use today because it lands
 * closest to indirect calorimetry for people who are not extremely lean or
 * extremely heavy.
 */
function mifflin(input: BodyInput): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return input.sex === "male" ? base + 5 : base - 161;
}

/** Harris-Benedict as revised by Roza & Shizgal (1984) */
function harris(input: BodyInput): number {
  if (input.sex === "male") {
    return 88.362 + 13.397 * input.weightKg + 4.799 * input.heightCm - 5.677 * input.age;
  }
  return 447.593 + 9.247 * input.weightKg + 3.098 * input.heightCm - 4.33 * input.age;
}

/** Katch-McArdle: works off lean mass, so it needs a body fat reading */
function katch(input: BodyInput): number {
  const fat = input.bodyFat;
  if (fat === null || fat === undefined || !Number.isFinite(fat) || fat <= 0 || fat >= 70) {
    throw codedError("health.bodyFat");
  }
  return 370 + 21.6 * (input.weightKg * (1 - fat / 100));
}

/** Basal metabolic rate in kcal/day */
export function bmr(input: BodyInput, formula: FormulaId = "mifflin"): number {
  checkBody(input);
  const value = formula === "harris" ? harris(input) : formula === "katch" ? katch(input) : mifflin(input);
  return Math.round(value);
}

/** All three estimates at once, so the spread is visible instead of hidden */
export function bmrComparison(input: BodyInput): Record<FormulaId, number | null> {
  const out: Record<FormulaId, number | null> = { mifflin: null, harris: null, katch: null };
  for (const id of ["mifflin", "harris", "katch"] as FormulaId[]) {
    try {
      out[id] = bmr(input, id);
    } catch {
      out[id] = null;
    }
  }
  return out;
}

/** Total daily energy expenditure */
export function tdee(basal: number, activity: ActivityId): number {
  const factor = ACTIVITY_FACTORS[activity];
  if (!factor) throw codedError("health.activity");
  return Math.round(basal * factor);
}

export type GoalId = "cut" | "maintain" | "bulk";

export interface MacroInput {
  calories: number;
  weightKg: number;
  goal?: GoalId;
  /** Grams of protein per kilogram of body weight */
  proteinPerKg?: number;
  /** Share of the calorie budget that goes to fat, 0–1 */
  fatShare?: number;
}

export interface MacroPlan {
  calories: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  proteinKcal: number;
  fatKcal: number;
  carbKcal: number;
  proteinPct: number;
  fatPct: number;
  carbPct: number;
  /** Protein + fat already fill the budget, so carbs were clamped to zero */
  carbClamped: boolean;
}

/** Defaults that match the usual guidance for each goal */
const GOAL_PROTEIN: Record<GoalId, number> = { cut: 2, maintain: 1.6, bulk: 1.8 };

export function macroPlan(input: MacroInput): MacroPlan {
  const { calories, weightKg } = input;
  if (!Number.isFinite(calories) || calories < 500) throw codedError("health.calories");
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw codedError("health.weight", "20", "400");

  const goal = input.goal ?? "maintain";
  const perKg = input.proteinPerKg ?? GOAL_PROTEIN[goal];
  if (!Number.isFinite(perKg) || perKg <= 0 || perKg > 4) throw codedError("health.protein");

  const fatShare = input.fatShare ?? 0.25;
  if (!Number.isFinite(fatShare) || fatShare < 0.1 || fatShare > 0.6) throw codedError("health.fat");

  const proteinKcal = perKg * weightKg * 4;
  const fatKcal = calories * fatShare;
  const carbKcal = calories - proteinKcal - fatKcal;
  const clamped = carbKcal < 0;
  const carbs = Math.max(0, carbKcal);

  const proteinG = perKg * weightKg;
  const fatG = fatKcal / 9;
  const carbG = carbs / 4;
  const pct = (kcal: number) => Math.round((kcal / calories) * 1000) / 10;

  return {
    calories,
    proteinG: Math.round(proteinG * 10) / 10,
    fatG: Math.round(fatG * 10) / 10,
    carbG: Math.round(carbG * 10) / 10,
    proteinKcal: Math.round(proteinKcal),
    fatKcal: Math.round(fatKcal),
    carbKcal: Math.round(carbs),
    proteinPct: pct(proteinKcal),
    fatPct: pct(fatKcal),
    carbPct: pct(carbs),
    carbClamped: clamped,
  };
}

/** Goal calorie targets relative to maintenance, as the usual ±20% band */
export function goalCalories(maintenance: number, goal: GoalId): number {
  if (!Number.isFinite(maintenance) || maintenance <= 0) throw codedError("health.calories");
  if (goal === "cut") return Math.round(maintenance * 0.8);
  if (goal === "bulk") return Math.round(maintenance * 1.1);
  return Math.round(maintenance);
}

export interface WaterTarget {
  /** Millilitres per day */
  ml: number;
  min: number;
  max: number;
  /** 250 ml glasses */
  glasses: number;
  baseMl: number;
  exerciseMl: number;
}

/**
 * Rough fluid target: 35 ml per kilogram of body weight, plus replacement for
 * sweat. ACSM puts sweat loss at roughly 0.5–1 L per hour of moderate exercise,
 * so 12 ml per minute sits in the middle of that band.
 */
export function waterTarget(
  weightKg: number,
  exerciseMinutes = 0,
  hot = false
): WaterTarget {
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw codedError("health.weight", "20", "400");
  if (!Number.isFinite(exerciseMinutes) || exerciseMinutes < 0 || exerciseMinutes > 600) {
    throw codedError("health.exercise");
  }
  const base = weightKg * 35;
  const exercise = exerciseMinutes * 12;
  const climate = hot ? 1.1 : 1;
  const ml = (base + exercise) * climate;
  return {
    ml: Math.round(ml),
    min: Math.round(ml * 0.9),
    max: Math.round(ml * 1.1),
    glasses: Math.round(ml / 250),
    baseMl: Math.round(base * climate),
    exerciseMl: Math.round(exercise * climate),
  };
}
