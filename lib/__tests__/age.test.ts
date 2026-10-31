import { describe, expect, it } from "vitest";
import { ageBetween, birthdayIn, zodiacOf } from "@/lib/age";

describe("ageBetween", () => {
  it("counts whole years, months and days", () => {
    const result = ageBetween(new Date(2000, 1, 1), new Date(2001, 2, 1));
    expect(result).toMatchObject({ years: 1, months: 1, days: 0, totalMonths: 13 });
  });

  it("does not spill over from the 31st", () => {
    // 31 Jan + 1 month is the last day of February, so 1 Mar is 1 month 1 day
    const result = ageBetween(new Date(2023, 0, 31), new Date(2023, 2, 1));
    expect(result).toMatchObject({ years: 0, months: 1, days: 1 });
  });

  it("gives zero days on the birthday itself", () => {
    const result = ageBetween(new Date(2000, 5, 15), new Date(2026, 5, 15));
    expect(result).toMatchObject({ years: 26, months: 0, days: 0, daysToNextBirthday: 0 });
    expect(result?.nextAge).toBe(26);
  });

  it("counts total days across a leap year", () => {
    const result = ageBetween(new Date(2024, 0, 1), new Date(2025, 0, 1));
    expect(result?.totalDays).toBe(366);
  });

  it("counts weeks from the total days", () => {
    const result = ageBetween(new Date(2024, 0, 1), new Date(2024, 0, 15));
    expect(result).toMatchObject({ totalDays: 14, totalWeeks: 2 });
  });

  it("finds the next birthday in the same year", () => {
    const result = ageBetween(new Date(2000, 1, 1), new Date(2026, 9, 31));
    expect(result?.daysToNextBirthday).toBe(93);
    expect(result?.nextAge).toBe(27);
  });

  it("rejects a birthday in the future", () => {
    expect(ageBetween(new Date(2030, 0, 1), new Date(2026, 0, 1))).toBeNull();
  });

  it("rejects invalid dates", () => {
    expect(ageBetween(new Date("nope"), new Date(2026, 0, 1))).toBeNull();
  });
});

describe("birthdayIn", () => {
  it("moves a leap day to 28 February in common years", () => {
    const birthday = birthdayIn(2025, new Date(2024, 1, 29));
    expect(birthday.getMonth()).toBe(1);
    expect(birthday.getDate()).toBe(28);
  });

  it("keeps 29 February in leap years", () => {
    expect(birthdayIn(2024, new Date(2024, 1, 29)).getDate()).toBe(29);
  });
});

describe("zodiacOf", () => {
  it("maps month and day to a sign", () => {
    expect(zodiacOf(7, 3)).toBe("cancer");
    expect(zodiacOf(1, 10)).toBe("capricorn");
    expect(zodiacOf(1, 20)).toBe("aquarius");
    expect(zodiacOf(12, 22)).toBe("capricorn");
    expect(zodiacOf(12, 21)).toBe("sagittarius");
  });
});
