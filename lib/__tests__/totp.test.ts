import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  currentTotp,
  isBase32,
  parseOtpAuthUri,
  totpAt,
  verifyTotp,
} from "@/lib/totp";

/** RFC 6238 test secret: the ASCII string "12345678901234567890" */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("base32", () => {
  it("round-trips bytes", () => {
    const bytes = new TextEncoder().encode("12345678901234567890");
    const encoded = base32Encode(bytes);
    expect(encoded).toBe(RFC_SECRET);
    expect(new TextDecoder().decode(base32Decode(encoded))).toBe("12345678901234567890");
  });

  it("ignores spaces, dashes and padding", () => {
    expect(base32Decode("JBSW Y3DP-EHPK3PXP==")).toEqual(base32Decode("JBSWY3DPEHPK3PXP"));
    expect(isBase32("jbswy3dp ehpk3pxp")).toBe(true);
    expect(isBase32("not-base32!")).toBe(false);
  });
});

describe("totpAt", () => {
  it("matches the RFC 6238 SHA-1 vector", async () => {
    const code = await totpAt({ secret: RFC_SECRET, digits: 8 }, 59_000);
    expect(code).toBe("94287082");
  });

  it("defaults to six digits", async () => {
    const code = await totpAt({ secret: "JBSWY3DPEHPK3PXP" }, Date.now());
    expect(code).toMatch(/^\d{6}$/);
  });

  it("changes when the period rolls over", async () => {
    const first = await totpAt({ secret: "JBSWY3DPEHPK3PXP", period: 30 }, 0);
    const second = await totpAt({ secret: "JBSWY3DPEHPK3PXP", period: 30 }, 30_000);
    expect(first).not.toBe(second);
  });
});

describe("currentTotp", () => {
  it("reports the remaining seconds and the next code", async () => {
    const result = await currentTotp({ secret: "JBSWY3DPEHPK3PXP", period: 30 }, 45_000);
    expect(result.remaining).toBe(15);
    expect(result.next).not.toBe(result.code);
  });
});

describe("verifyTotp", () => {
  it("accepts the current code and one step of drift", async () => {
    const options = { secret: "JBSWY3DPEHPK3PXP" };
    const now = 1_700_000_000_000;
    expect(await verifyTotp(await totpAt(options, now), options, 1, now)).toBe(true);
    expect(await verifyTotp(await totpAt(options, now - 30_000), options, 1, now)).toBe(true);
    expect(await verifyTotp("000000", options, 1, now)).toBe(false);
  });
});

describe("parseOtpAuthUri", () => {
  it("reads label, issuer and parameters", () => {
    const info = parseOtpAuthUri(
      "otpauth://totp/ACME%20Co:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=ACME%20Co&algorithm=SHA256&digits=8&period=60"
    );
    expect(info).toEqual({
      type: "totp",
      label: "ACME Co:alice@example.com",
      issuer: "ACME Co",
      secret: "JBSWY3DPEHPK3PXP",
      digits: 8,
      period: 60,
      algorithm: "SHA-256",
      counter: 0,
    });
  });

  it("rejects anything else", () => {
    expect(parseOtpAuthUri("https://example.com")).toBeNull();
    expect(parseOtpAuthUri("not a url")).toBeNull();
  });
});
