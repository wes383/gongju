import { describe, expect, it } from "vitest";
import { CURRENCY_CODES, currencyName, currencySymbol, mergeCodes, toCurrency } from "../currency";

describe("currencyName", () => {
  it("resolves well-known codes through Intl", () => {
    expect(currencyName("USD", "zh")).toBe("美元");
    expect(currencyName("USD", "en")).toBe("US Dollar");
    expect(currencyName("CNY", "zh")).toBe("人民币");
    expect(currencyName("JPY", "en")).toBe("Japanese Yen");
  });

  it("names the crypto codes Intl does not know", () => {
    expect(currencyName("BTC", "zh")).toBe("比特币");
    expect(currencyName("BTC", "en")).toBe("Bitcoin");
    expect(currencyName("ETH", "en")).toBe("Ethereum");
  });

  it("has a name for every shipped code", () => {
    for (const code of CURRENCY_CODES) {
      expect(currencyName(code, "zh")).not.toBe("");
      expect(currencyName(code, "en")).not.toBe("");
      expect(currencyName(code, "en")).not.toContain("undefined");
    }
  });
});

describe("currencySymbol", () => {
  it("prefers the narrow glyph", () => {
    expect(currencySymbol("USD", "en")).toBe("$");
    expect(currencySymbol("CNY", "zh")).toBe("¥");
    expect(currencySymbol("EUR", "en")).toBe("€");
    expect(currencySymbol("GBP", "en")).toBe("£");
  });

  it("falls back to the code when Intl has no glyph", () => {
    // KWD has no narrow symbol in CLDR; echoing the code is the only option
    expect(currencySymbol("KWD", "en")).toBe("KWD");
    expect(currencySymbol("XAU", "zh")).toBe("XAU");
  });

  it("never throws on an unknown code", () => {
    expect(() => currencySymbol("ZZZ", "en")).not.toThrow();
  });
});

describe("toCurrency", () => {
  it("bundles the code, name and symbol", () => {
    expect(toCurrency("EUR", "zh")).toEqual({ code: "EUR", name: "欧元", symbol: "€" });
  });
});

describe("mergeCodes", () => {
  it("sorts and drops duplicates", () => {
    expect(mergeCodes(["USD", "EUR"], ["EUR", "CNY"])).toEqual(["CNY", "EUR", "USD"]);
  });

  it("is idempotent when the live list matches the shipped one", () => {
    const merged = mergeCodes(CURRENCY_CODES, CURRENCY_CODES);
    expect(merged).toHaveLength(CURRENCY_CODES.length);
  });
});

describe("CURRENCY_CODES", () => {
  it("is sorted, unique and upper-case", () => {
    const sorted = [...CURRENCY_CODES].sort();
    expect(CURRENCY_CODES).toEqual(sorted);
    expect(new Set(CURRENCY_CODES).size).toBe(CURRENCY_CODES.length);
    for (const code of CURRENCY_CODES) expect(code).toMatch(/^[A-Z]{3}$/);
  });

  it("covers the majors plus metals and crypto", () => {
    for (const code of ["USD", "CNY", "EUR", "JPY", "GBP", "CNH", "XAU", "XAG", "BTC", "ETH"]) {
      expect(CURRENCY_CODES).toContain(code);
    }
  });
});
