import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import {
  formatDuration,
  formatPace,
  METRES_PER_MILE,
  paceFromKmh,
  paceOf,
  parsePace,
  riegel,
  splits,
  timeOf,
} from "@/lib/running";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("paceOf", () => {
  it("turns a 10K in 50:00 into 5:00 /km", () => {
    const pace = paceOf(10000, 3000);
    expect(pace.secondsPerKm).toBeCloseTo(300, 6);
    expect(pace.kmh).toBeCloseTo(12, 6);
    expect(formatPace(pace.secondsPerKm)).toBe("5:00");
    expect(pace.secondsPerMile / 60).toBeCloseTo(8.047, 2);
  });

  it("rejects zero distance or time", () => {
    expect(codeOf(() => paceOf(0, 3000))).toBe("run.distance");
    expect(codeOf(() => paceOf(10000, 0))).toBe("run.time");
  });
});

describe("paceFromKmh", () => {
  it("inverts a speed", () => {
    expect(paceFromKmh(12).secondsPerKm).toBeCloseTo(300, 6);
    expect(paceFromKmh(METRES_PER_MILE / 1000 * 10).secondsPerMile).toBeCloseTo(360, 6);
  });
});

describe("timeOf", () => {
  it("gives the marathon time for a 5:00 pace", () => {
    expect(timeOf(42195, 300)).toBeCloseTo(12658.5, 1);
  });
});

describe("formatPace", () => {
  it("pads the seconds and carries past 59.5", () => {
    expect(formatPace(272)).toBe("4:32");
    expect(formatPace(299.6)).toBe("5:00");
    expect(formatPace(0)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("drops the hour field under an hour", () => {
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(2630)).toBe("43:50");
  });
});

describe("parsePace", () => {
  it("reads mm:ss, bare minutes and per-mile suffixes", () => {
    expect(parsePace("4:32")).toBe(272);
    expect(parsePace("4.5")).toBe(270);
    expect(parsePace("9:05/mi")!).toBeCloseTo(545 / (METRES_PER_MILE / 1000), 6);
    expect(parsePace("5:00", "mi")!).toBeCloseTo(300 / (METRES_PER_MILE / 1000), 6);
  });

  it("refuses nonsense", () => {
    expect(parsePace("")).toBeNull();
    expect(parsePace("fast")).toBeNull();
    expect(parsePace("4:75")).toBeNull();
    expect(parsePace("0:00")).toBeNull();
  });
});

describe("riegel", () => {
  it("predicts a 10K from a 20-minute 5K", () => {
    // 1200 × 2^1.06
    expect(riegel(1200, 5000, 10000)).toBeCloseTo(2501.92, 1);
  });
});

describe("splits", () => {
  it("cuts a 10K at 5:00 into ten even kilometres", () => {
    const list = splits(3000, 10000, 1000);
    expect(list).toHaveLength(10);
    expect(list[0].seconds).toBeCloseTo(300, 6);
    expect(list[9].cumulative).toBeCloseTo(3000, 6);
  });

  it("ends with the leftover part", () => {
    const list = splits(1000, 2500, 1000);
    expect(list.map((split) => split.meters)).toEqual([1000, 1000, 500]);
    expect(list[2].seconds).toBeCloseTo(200, 6);
  });
});
