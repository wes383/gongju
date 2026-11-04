import { afterEach, describe, expect, it, vi } from "vitest";
import { isCodedError } from "@/lib/errors";
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

/* ══════════════════════════════════════════════════════════════
   Live rates: a single unreachable host must not break the tool
   ══════════════════════════════════════════════════════════════ */

const FRANKFURTER_BODY = { date: "2026-11-04", base: "USD", quote: "CNY", rate: 6.6637 };
const CURRENCY_API_BODY = { date: "2026-11-03", usd: { cny: 6.67, btc: 0.000015 } };
const ER_API_BODY = {
  result: "success",
  time_last_update_utc: "Wed, 04 Nov 2026 00:02:31 +0000",
  rates: { CNY: 6.65 },
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function hostOf(input: unknown): string {
  return String(input);
}

/** A fresh module per test: the rate cache and the preferred source are module state */
async function loadModule() {
  vi.resetModules();
  return import("../currency");
}

async function codeOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchRate", () => {
  it("uses the first source when it answers", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(FRANKFURTER_BODY));
    vi.stubGlobal("fetch", fetchMock);

    const { fetchRate } = await loadModule();
    const quote = await fetchRate("usd", "cny");

    expect(quote).toMatchObject({
      base: "USD",
      quote: "CNY",
      rate: 6.6637,
      date: "2026-11-04",
      source: "frankfurter",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the CDN table when the first host is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        if (hostOf(input).includes("frankfurter")) throw new TypeError("Failed to fetch");
        return jsonResponse(CURRENCY_API_BODY);
      })
    );

    const { fetchRate } = await loadModule();
    const quote = await fetchRate("USD", "CNY");

    expect(quote.source).toBe("currency-api");
    expect(quote.rate).toBeCloseTo(6.67, 6);
    expect(quote.date).toBe("2026-11-03");
  });

  it("reaches the third source when the first two have nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = hostOf(input);
        if (url.includes("frankfurter")) return jsonResponse({}, 404);
        if (url.includes("jsdelivr")) return jsonResponse({ date: "2026-11-03", usd: {} });
        return jsonResponse(ER_API_BODY);
      })
    );

    const { fetchRate } = await loadModule();
    const quote = await fetchRate("USD", "CNY");

    expect(quote.source).toBe("er-api");
    expect(quote.rate).toBeCloseTo(6.65, 6);
    // The proxy date format is normalised to a day string
    expect(quote.date).toBe("2026-11-04");
  });

  it("converts crypto pairs the central-bank source cannot quote", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        if (hostOf(input).includes("frankfurter")) return jsonResponse({}, 404);
        return jsonResponse(CURRENCY_API_BODY);
      })
    );

    const { fetchRate } = await loadModule();
    const quote = await fetchRate("USD", "BTC");

    expect(quote.rate).toBeCloseTo(0.000015, 9);
    expect(quote.source).toBe("currency-api");
  });

  it("separates 'nothing answered' from 'no rate for this pair'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    expect(await codeOf(async () => (await loadModule()).fetchRate("USD", "CNY"))).toBe("currency.unreachable");

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: unknown) => {
        const url = hostOf(input);
        if (url.includes("frankfurter")) return jsonResponse({ date: "2026-11-04", rate: 0 });
        if (url.includes("jsdelivr")) return jsonResponse({ date: "2026-11-03", usd: { cny: 0 } });
        return jsonResponse({ result: "success", rates: {} });
      })
    );
    expect(await codeOf(async () => (await loadModule()).fetchRate("USD", "CNY"))).toBe("currency.unsupported");
  });

  it("shows an expired cache instead of failing when every source is down", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T00:00:00Z"));

    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(FRANKFURTER_BODY)));
    const { fetchRate } = await loadModule();
    await fetchRate("USD", "CNY");

    // Past the six-hour freshness window, with the network gone
    vi.setSystemTime(new Date("2026-11-04T07:00:00Z"));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );

    const quote = await fetchRate("USD", "CNY");
    expect(quote.stale).toBe(true);
    expect(quote.rate).toBe(6.6637);
  });

  it("short-circuits the identity pair without touching the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { fetchRate } = await loadModule();
    const quote = await fetchRate("usd", "usd");

    expect(quote.rate).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
