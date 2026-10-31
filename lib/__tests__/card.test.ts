import { describe, expect, it } from "vitest";
import {
  analyzeCard,
  detectBrand,
  formatCard,
  luhnCheck,
  luhnCheckDigit,
  luhnSum,
  normalizeCard,
} from "@/lib/card";

const card = (prefix: string, length: number) =>
  prefix + "0".repeat(length - prefix.length - 1) + luhnCheckDigit(prefix + "0".repeat(length - prefix.length - 1));

describe("luhn", () => {
  it("accepts well-known test numbers", () => {
    for (const number of [
      "4111111111111111",
      "4242424242424242",
      "5555555555554444",
      "378282246310005",
      "6011111111111117",
      "30569309025904",
      "3530111333300000",
    ]) {
      expect(luhnCheck(number)).toBe(true);
    }
  });

  it("rejects a single altered digit", () => {
    expect(luhnCheck("4111111111111112")).toBe(false);
    expect(luhnSum("4111111111111112") % 10).toBe(1);
  });

  it("computes the missing check digit", () => {
    expect(luhnCheckDigit("411111111111111")).toBe(1);
    expect(luhnCheckDigit("7992739871")).toBe(3);
    expect(luhnCheck(`${card("62", 16)}`)).toBe(true);
  });

  it("requires at least two digits", () => {
    expect(luhnCheck("")).toBe(false);
    expect(luhnCheck("0")).toBe(false);
  });
});

describe("normalizeCard", () => {
  it("drops spaces, dashes and full-width digits", () => {
    expect(normalizeCard("4111 1111-1111 1111").digits).toBe("4111111111111111");
    expect(normalizeCard("４１１１１１１１１１１１１１１１").digits).toBe("4111111111111111");
  });

  it("reports characters it cannot use", () => {
    const result = normalizeCard("4111 1111 1111 111a");
    expect(result.digits).toBe("411111111111111");
    expect(result.invalidChars).toEqual(["a"]);
  });
});

describe("detectBrand", () => {
  it("maps prefixes to issuers", () => {
    expect(detectBrand("4111111111111111").id).toBe("visa");
    expect(detectBrand("5555555555554444").id).toBe("mastercard");
    expect(detectBrand("2221000000000009").id).toBe("mastercard");
    expect(detectBrand("378282246310005").id).toBe("amex");
    expect(detectBrand("3530111333300000").id).toBe("jcb");
    expect(detectBrand("6011111111111117").id).toBe("discover");
    expect(detectBrand("30569309025904").id).toBe("diners");
    expect(detectBrand("5018000000000009").id).toBe("maestro");
    expect(detectBrand("2200000000000004").id).toBe("mir");
    expect(detectBrand("6212345678901234").id).toBe("unionpay");
    expect(detectBrand("9999999999999999").id).toBe("unknown");
    expect(detectBrand("").id).toBe("unknown");
  });
});

describe("formatCard", () => {
  it("groups by four digits", () => {
    expect(formatCard("4111111111111111", "visa")).toBe("4111 1111 1111 1111");
    expect(formatCard("6212345678901234", "unionpay")).toBe("6212 3456 7890 1234");
  });

  it("uses the issuer layout for Amex and Diners", () => {
    expect(formatCard("378282246310005", "amex")).toBe("3782 822463 10005");
    expect(formatCard("30569309025904", "diners")).toBe("3056 930902 5904");
  });
});

describe("analyzeCard", () => {
  it("marks a complete, well-formed number valid", () => {
    const result = analyzeCard("4111 1111 1111 1111");
    expect(result.valid).toBe(true);
    expect(result.luhnOk).toBe(true);
    expect(result.lengthOk).toBe(true);
    expect(result.digits).toHaveLength(16);
    expect(result.bin).toBe("411111");
    expect(result.last4).toBe("1111");
    expect(result.actualCheckDigit).toBe(1);
    expect(result.expectedCheckDigit).toBe(1);
  });

  it("flags a wrong check digit", () => {
    const result = analyzeCard("4111111111111112");
    expect(result.luhnOk).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.expectedCheckDigit).toBe(1);
    expect(result.actualCheckDigit).toBe(2);
  });

  it("flags a length the issuer does not use", () => {
    const result = analyzeCard(card("4", 17));
    expect(result.brand).toBe("visa");
    expect(result.luhnOk).toBe(true);
    expect(result.lengthOk).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("reports short input instead of failing Luhn", () => {
    const result = analyzeCard("4111");
    expect(result.tooShort).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.expectedCheckDigit).toBe(9);
  });

  it("keeps invalid characters visible", () => {
    const result = analyzeCard("4111 1111 1111 111x");
    expect(result.invalidChars).toEqual(["x"]);
    expect(result.valid).toBe(false);
  });

  it("handles empty input", () => {
    const result = analyzeCard("");
    expect(result.digits).toBe("");
    expect(result.brand).toBe("unknown");
    expect(result.actualCheckDigit).toBeNull();
    expect(result.expectedCheckDigit).toBeNull();
    expect(result.valid).toBe(false);
  });
});
