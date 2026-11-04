import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import {
  apertureFor,
  depthOfField,
  exposureValue,
  formatShutter,
  getSensor,
  ndShutter,
  ndStops,
  parseShutter,
  SENSORS,
  shutterFor,
  shutterStops,
  stopsBetween,
} from "@/lib/photo";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (isCodedError(error)) return error.code;
    return "uncoded";
  }
  return "no-error";
}

describe("exposure", () => {
  it("matches the sunny-16 reading", () => {
    const { ev } = exposureValue({ aperture: 16, shutter: 1 / 125, iso: 100 });
    expect(ev).toBeCloseTo(14.97, 2);
  });

  it("keeps the settings EV and shifts the scene EV with ISO", () => {
    const base = exposureValue({ aperture: 16, shutter: 1 / 125, iso: 100 });
    const pushed = exposureValue({ aperture: 16, shutter: 1 / 125, iso: 400 });
    expect(pushed.ev).toBeCloseTo(base.ev, 10);
    // The same settings at ISO 400 correspond to a scene two stops darker
    expect(pushed.ev100).toBeCloseTo(base.ev - 2, 10);
    // To meter the same scene at ISO 400 the shutter has to be two stops faster
    expect(exposureValue({ aperture: 16, shutter: 1 / 500, iso: 400 }).ev100).toBeCloseTo(
      base.ev100,
      10
    );
  });

  it("round-trips between shutter and aperture at the same EV", () => {
    const { ev } = exposureValue({ aperture: 2.8, shutter: 1 / 500, iso: 100 });
    expect(shutterFor(ev, 2.8)).toBeCloseTo(1 / 500, 12);
    expect(apertureFor(ev, 1 / 500)).toBeCloseTo(2.8, 12);
  });

  it("counts whole stops between apertures", () => {
    expect(
      stopsBetween(
        { aperture: 4, shutter: 1 / 125, iso: 100 },
        { aperture: 8, shutter: 1 / 125, iso: 100 }
      )
    ).toBeCloseTo(2, 10);
  });

  it("rejects a zero aperture or shutter", () => {
    expect(codeOf(() => exposureValue({ aperture: 0, shutter: 0.01, iso: 100 }))).toBe(
      "photo.aperture"
    );
    expect(codeOf(() => exposureValue({ aperture: 2, shutter: 0, iso: 100 }))).toBe("photo.shutter");
    expect(codeOf(() => exposureValue({ aperture: 2, shutter: 0.01, iso: 0 }))).toBe("photo.iso");
  });
});

describe("formatShutter", () => {
  it("uses fractions below a second and minutes above sixty", () => {
    expect(formatShutter(1 / 125)).toBe("1/125");
    expect(formatShutter(2.5)).toBe('2.5"');
    expect(formatShutter(90)).toBe('1\'30"');
    expect(formatShutter(0)).toBe("—");
  });

  it("snaps half-stop results onto the nearest full stop a camera can set", () => {
    expect(formatShutter(1 / 62.5)).toBe("1/60");
    expect(formatShutter(1 / 31.25)).toBe("1/30");
    // An unusual speed stays as it is rather than being bent to a full stop
    expect(formatShutter(1 / 100)).toBe("1/100");
  });
});

describe("parseShutter", () => {
  it("accepts fractions, decimals and second marks", () => {
    expect(parseShutter("1/125")).toBeCloseTo(0.008, 10);
    expect(parseShutter("0.008")).toBeCloseTo(0.008, 10);
    expect(parseShutter("2\"")).toBe(2);
    expect(parseShutter("1.5s")).toBe(1.5);
  });

  it("rejects nonsense", () => {
    expect(codeOf(() => parseShutter(""))).toBe("photo.shutter");
    expect(codeOf(() => parseShutter("fast"))).toBe("photo.shutter");
    expect(codeOf(() => parseShutter("0"))).toBe("photo.shutter");
  });
});

describe("depthOfField", () => {
  it("reproduces the standard 50 mm f/1.8 chart at 3 m on full frame", () => {
    const dof = depthOfField({ focal: 50, aperture: 1.8, distance: 3, sensorId: "full" });
    expect(dof.hyperfocal).toBeCloseTo(48.2, 1);
    expect(dof.near).toBeCloseTo(2.83, 2);
    expect(dof.far).toBeCloseTo(3.2, 2);
    expect(dof.total).toBeCloseTo(0.37, 2);
    expect(dof.equivalent).toBeCloseTo(50, 6);
  });

  it("gives an unbounded far limit past the hyperfocal distance", () => {
    const dof = depthOfField({ focal: 24, aperture: 11, distance: 10, sensorId: "full" });
    expect(dof.hyperfocal).toBeLessThan(10);
    expect(dof.far).toBe(Number.POSITIVE_INFINITY);
    expect(dof.total).toBe(Number.POSITIVE_INFINITY);
  });

  it("scales the equivalent focal length with the crop factor", () => {
    const dof = depthOfField({ focal: 50, aperture: 2.8, distance: 2, sensorId: "m43" });
    expect(dof.equivalent).toBeCloseTo(100, 0);
    expect(dof.coc).toBeLessThan(getSensor("full").coc);
  });

  it("checks the inputs", () => {
    expect(codeOf(() => depthOfField({ focal: 0, aperture: 2, distance: 1, sensorId: "full" }))).toBe(
      "photo.focal"
    );
    expect(
      codeOf(() => depthOfField({ focal: 50, aperture: 2, distance: 0, sensorId: "full" }))
    ).toBe("photo.distance");
    expect(codeOf(() => getSensor("nope" as "full"))).toBe("photo.sensor");
  });
});

describe("sensors", () => {
  it("derives the circle of confusion from the diagonal", () => {
    const full = getSensor("full");
    expect(full.coc).toBeCloseTo(Math.hypot(36, 24) / 1500, 12);
    expect(full.crop).toBeCloseTo(1, 10);
    expect(SENSORS.map((sensor) => sensor.id)).toContain("m43");
  });
});

describe("ND filters", () => {
  it("turns a reduction factor into stops", () => {
    expect(ndStops(2)).toBeCloseTo(1, 10);
    expect(ndStops(1000)).toBeCloseTo(9.966, 3);
  });

  it("extends the shutter by two to the stops", () => {
    expect(ndShutter(1 / 125, 10)).toBeCloseTo(8.192, 3);
    expect(ndShutter(1 / 60, 0)).toBeCloseTo(1 / 60, 12);
    expect(shutterStops(1 / 125, 8.192)).toBeCloseTo(10, 3);
  });

  it("refuses nonsense factors", () => {
    expect(codeOf(() => ndStops(1))).toBe("photo.nd");
    expect(codeOf(() => ndShutter(1 / 125, -1))).toBe("photo.ndStops");
  });
});
