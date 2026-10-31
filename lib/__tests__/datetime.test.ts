import { describe, expect, it } from "vitest";
import {
  addToDate,
  addWorkdays,
  countWorkdays,
  daysInMonth,
  diffDates,
  isWeekend,
  parseInstant,
  timestampOf,
} from "@/lib/datetime";

describe("daysInMonth", () => {
  it("handles leap years", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe("addToDate", () => {
  it("adds days and months", () => {
    const start = new Date(2026, 0, 31);
    expect(addToDate(start, 1, "day").getDate()).toBe(1);
    // 31 January + 1 month clamps to the last day of February
    const nextMonth = addToDate(start, 1, "month");
    expect(nextMonth.getMonth()).toBe(1);
    expect(nextMonth.getDate()).toBe(28);
    expect(addToDate(start, 1, "year").getFullYear()).toBe(2027);
  });
});

describe("workdays", () => {
  it("flags weekends", () => {
    expect(isWeekend(new Date(2026, 0, 3))).toBe(true); // Saturday
    expect(isWeekend(new Date(2026, 0, 5))).toBe(false); // Monday
  });

  it("skips weekends when adding workdays", () => {
    const monday = new Date(2026, 0, 5);
    const result = addWorkdays(monday, 5);
    expect(isWeekend(result)).toBe(false);
    expect(result.getTime()).toBeGreaterThan(monday.getTime());
  });

  it("counts workdays between two dates", () => {
    const from = new Date(2026, 0, 5); // Monday
    const to = new Date(2026, 0, 12); // next Monday
    expect(countWorkdays(from, to)).toBeGreaterThanOrEqual(5);
  });
});

describe("diffDates", () => {
  it("breaks the difference into calendar units", () => {
    const result = diffDates(new Date(2025, 0, 15), new Date(2026, 2, 20));
    expect(result.years).toBe(1);
    expect(result.months).toBe(2);
    expect(result.days).toBeGreaterThan(0);
  });
});

describe("timestamps", () => {
  it("reports seconds and milliseconds for the same instant", () => {
    const date = new Date(2026, 0, 1, 12, 0, 0);
    expect(timestampOf(date, "s")).toBe(Math.floor(date.getTime() / 1000));
    expect(timestampOf(date, "ms")).toBe(date.getTime());
  });

  it("parses a numeric timestamp", () => {
    const parsed = parseInstant("1767225600");
    expect(parsed).not.toBeNull();
    expect(parsed?.date.getTime()).toBe(1767225600000);
  });

  it("rejects garbage", () => {
    expect(parseInstant("not a date")).toBeNull();
  });
});
