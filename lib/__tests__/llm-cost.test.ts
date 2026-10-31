import { describe, expect, it } from "vitest";
import {
  formatCount,
  formatMoney,
  llmCost,
  moneyDecimals,
  parseNumber,
  requestsForBudget,
} from "@/lib/llm-cost";

const rates = { inputPrice: 3, outputPrice: 15 };

describe("llmCost", () => {
  it("prices input and output per million tokens", () => {
    const cost = llmCost(rates, { inputTokens: 1200, outputTokens: 400, requests: 1000 });
    expect(cost.input).toBeCloseTo(0.0036, 8);
    expect(cost.output).toBeCloseTo(0.006, 8);
    expect(cost.perRequest).toBeCloseTo(0.0096, 8);
    expect(cost.total).toBeCloseTo(9.6, 8);
  });

  it("treats gaps and negatives as zero", () => {
    const cost = llmCost({ inputPrice: -1, outputPrice: NaN }, {
      inputTokens: 1000,
      outputTokens: 1000,
      requests: 10,
    });
    expect(cost.total).toBe(0);
  });

  it("scales with the number of requests", () => {
    const single = llmCost(rates, { inputTokens: 500, outputTokens: 500, requests: 1 });
    const bulk = llmCost(rates, { inputTokens: 500, outputTokens: 500, requests: 250 });
    expect(bulk.total).toBeCloseTo(single.total * 250, 8);
  });
});

describe("requestsForBudget", () => {
  it("floors to whole requests", () => {
    expect(requestsForBudget(10, 0.0096)).toBe(1041);
  });

  it("returns Infinity when a request costs nothing", () => {
    expect(requestsForBudget(10, 0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("formatting", () => {
  it("keeps enough decimals for tiny amounts", () => {
    expect(moneyDecimals(0.000015)).toBe(6);
    expect(moneyDecimals(0.25)).toBe(4);
    expect(moneyDecimals(42)).toBe(2);
    expect(formatMoney(0.000015, "USD", "en")).toBe("$0.000015");
  });

  it("switches the symbol with the currency", () => {
    expect(formatMoney(12.5, "CNY", "en")).toBe("¥12.50");
    expect(formatCount(1234567, "en")).toBe("1,234,567");
  });

  it("parses separators people actually type", () => {
    expect(parseNumber("1,200")).toBe(1200);
    expect(parseNumber(" 0.15 ")).toBe(0.15);
    expect(parseNumber("")).toBe(0);
    expect(parseNumber("abc")).toBe(0);
  });
});
