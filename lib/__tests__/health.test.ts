import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import {
  ACTIVITY_FACTORS,
  bmr,
  bmrComparison,
  goalCalories,
  macroPlan,
  tdee,
  waterTarget,
} from "@/lib/health";

const MAN = { sex: "male" as const, age: 30, heightCm: 180, weightKg: 75 };
const WOMAN = { ...MAN, sex: "female" as const };

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("bmr", () => {
  it("matches Mifflin-St Jeor for both sexes", () => {
    // 750 + 1125 − 150, then +5 / −161
    expect(bmr(MAN)).toBe(1730);
    expect(bmr(WOMAN)).toBe(1564);
  });

  it("matches the revised Harris-Benedict equation", () => {
    expect(bmr(MAN, "harris")).toBe(1787);
    expect(bmr(WOMAN, "harris")).toBe(1569);
  });

  it("uses lean mass for Katch-McArdle", () => {
    expect(bmr({ ...MAN, bodyFat: 20 }, "katch")).toBe(1666);
  });

  it("refuses Katch-McArdle without a body fat figure", () => {
    expect(codeOf(() => bmr(MAN, "katch"))).toBe("health.bodyFat");
    expect(codeOf(() => bmr({ ...MAN, bodyFat: 0 }, "katch"))).toBe("health.bodyFat");
  });

  it("rejects impossible bodies", () => {
    expect(codeOf(() => bmr({ ...MAN, age: 5 }))).toBe("health.age");
    expect(codeOf(() => bmr({ ...MAN, heightCm: 0 }))).toBe("health.height");
    expect(codeOf(() => bmr({ ...MAN, weightKg: 500 }))).toBe("health.weight");
  });

  it("leaves a null for the formula that cannot run", () => {
    expect(bmrComparison(MAN)).toEqual({ mifflin: 1730, harris: 1787, katch: null });
  });
});

describe("tdee", () => {
  it("multiplies by the activity factor", () => {
    expect(tdee(1730, "moderate")).toBe(Math.round(1730 * 1.55));
    expect(tdee(1730, "sedentary")).toBe(2076);
    expect(ACTIVITY_FACTORS.veryActive).toBe(1.9);
  });
});

describe("macroPlan", () => {
  it("splits a cutting budget into protein, fat and carbs", () => {
    const plan = macroPlan({ calories: 2000, weightKg: 70, goal: "cut" });
    expect(plan.proteinG).toBe(140);
    expect(plan.proteinKcal).toBe(560);
    expect(plan.fatKcal).toBe(500);
    expect(plan.carbKcal).toBe(940);
    expect(plan.carbG).toBe(235);
    expect(plan.carbClamped).toBe(false);
  });

  it("never reports negative carbs", () => {
    const plan = macroPlan({ calories: 600, weightKg: 90, goal: "cut", proteinPerKg: 2 });
    expect(plan.carbKcal).toBe(0);
    expect(plan.carbG).toBe(0);
    expect(plan.carbClamped).toBe(true);
  });

  it("rejects a budget that cannot feed anyone", () => {
    expect(codeOf(() => macroPlan({ calories: 100, weightKg: 70 }))).toBe("health.calories");
    expect(codeOf(() => macroPlan({ calories: 2000, weightKg: 70, proteinPerKg: 9 }))).toBe(
      "health.protein"
    );
  });

  it("shifts the budget by goal", () => {
    expect(goalCalories(2500, "cut")).toBe(2000);
    expect(goalCalories(2500, "maintain")).toBe(2500);
    expect(goalCalories(2500, "bulk")).toBe(2750);
  });
});

describe("waterTarget", () => {
  it("adds sweat replacement to the body-weight baseline", () => {
    const target = waterTarget(70, 60);
    expect(target.baseMl).toBe(2450);
    expect(target.exerciseMl).toBe(720);
    expect(target.ml).toBe(3170);
    expect(target.glasses).toBe(13);
  });

  it("raises the target in heat", () => {
    expect(waterTarget(70, 0, true).ml).toBe(2695);
  });

  it("rejects a negative workout", () => {
    expect(codeOf(() => waterTarget(70, -10))).toBe("health.exercise");
  });
});
