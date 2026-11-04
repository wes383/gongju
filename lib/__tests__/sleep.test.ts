import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import { bedTimes, formatClock, parseClock, splitHours, wakeTimes } from "@/lib/sleep";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("parseClock", () => {
  it("reads 24-hour times", () => {
    expect(parseClock("23:30")).toBe(1410);
    expect(parseClock("00:00")).toBe(0);
    expect(parseClock("7:05")).toBe(425);
  });

  it("rejects out-of-range times", () => {
    expect(codeOf(() => parseClock("24:00"))).toBe("sleep.time");
    expect(codeOf(() => parseClock("23:60"))).toBe("sleep.time");
    expect(codeOf(() => parseClock("late"))).toBe("sleep.time");
  });
});

describe("formatClock", () => {
  it("wraps past midnight in both directions", () => {
    expect(formatClock(435)).toBe("07:15");
    expect(formatClock(-45)).toBe("23:15");
    expect(formatClock(1440 + 90)).toBe("01:30");
  });
});

describe("wakeTimes", () => {
  it("adds the latency and whole cycles to a 23:30 bedtime", () => {
    const slots = wakeTimes("23:30");
    expect(slots).toHaveLength(4);
    // 23:30 + 15 min + 4 × 90 min = 05:45
    expect(formatClock(slots[0].clock)).toBe("05:45");
    expect(formatClock(slots[1].clock)).toBe("07:15");
    expect(slots[1].totalMinutes).toBe(465);
  });

  it("rejects an absurd latency or cycle", () => {
    expect(codeOf(() => wakeTimes("23:30", -1))).toBe("sleep.latency");
    expect(codeOf(() => wakeTimes("23:30", 200))).toBe("sleep.latency");
    expect(codeOf(() => wakeTimes("23:30", 15, 30))).toBe("sleep.cycle");
  });
});

describe("bedTimes", () => {
  it("counts backwards from the alarm", () => {
    const slots = bedTimes("07:00");
    expect(formatClock(slots[1].clock)).toBe("23:15");
    expect(formatClock(slots[3].clock)).toBe("20:15");
  });
});

describe("splitHours", () => {
  it("splits a duration into hours and minutes", () => {
    expect(splitHours(465)).toEqual({ hours: 7, minutes: 45 });
    expect(splitHours(90)).toEqual({ hours: 1, minutes: 30 });
  });
});
