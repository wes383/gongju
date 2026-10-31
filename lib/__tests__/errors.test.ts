import { describe, expect, it } from "vitest";
import { codedError, errorText, isCodedError, safe } from "@/lib/errors";
import { formatJwtTime } from "@/lib/encoding";

describe("codedError", () => {
  it("carries a code and positional params", () => {
    const err = codedError("radix.digit", "z", 36);
    expect(isCodedError(err)).toBe(true);
    expect(err.code).toBe("radix.digit");
    expect(err.params).toEqual(["z", 36]);
  });
});

describe("errorText", () => {
  it("translates a known code per locale", () => {
    const err = codedError("radix.range");
    expect(errorText(err, "zh")).toContain("2");
    expect(errorText(err, "en")).toMatch(/between 2 and 36/i);
  });

  it("fills placeholders in order", () => {
    const err = codedError("radix.digit", "z", 36);
    expect(errorText(err, "en")).toContain("z");
    expect(errorText(err, "en")).toContain("36");
  });

  it("falls back to the code when it is unknown", () => {
    expect(errorText(codedError("nope.missing"), "en")).toBe("nope.missing");
  });

  it("keeps plain error messages", () => {
    expect(errorText(new Error("boom"), "en")).toBe("boom");
    expect(errorText(null, "en")).toBe("");
  });
});

describe("safe", () => {
  it("captures a thrown error instead of propagating it", () => {
    const { value, error } = safe(() => {
      throw codedError("image.tooLarge");
    });
    expect(value).toBeNull();
    expect(isCodedError(error) && error.code).toBe("image.tooLarge");
  });

  it("returns the value when nothing throws", () => {
    expect(safe(() => 42)).toEqual({ value: 42, error: null });
  });
});

describe("formatJwtTime", () => {
  it("formats a valid claim", () => {
    expect(formatJwtTime(1767225600)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("returns an empty string for an unusable claim", () => {
    expect(formatJwtTime(Number.NaN)).toBe("");
  });
});
