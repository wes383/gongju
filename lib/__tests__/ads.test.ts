import { describe, expect, it } from "vitest";
import { adsMetrics, type AdsInput } from "@/lib/ads";
import { isCodedError } from "@/lib/errors";

const BASE: AdsInput = {
  spend: 1000,
  impressions: 100000,
  clicks: 2000,
  orders: 100,
  aov: 150,
  marginPct: 40,
};

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("adsMetrics", () => {
  it("turns the funnel into the usual traffic and cost ratios", () => {
    const result = adsMetrics(BASE);
    expect(result.revenue).toBe(15000);
    expect(result.ctr).toBeCloseTo(2, 6);
    expect(result.cpc).toBeCloseTo(0.5, 6);
    expect(result.cvr).toBeCloseTo(5, 6);
    expect(result.cpa).toBeCloseTo(10, 6);
    expect(result.roas).toBeCloseTo(15, 6);
    expect(result.acos).toBeCloseTo(6.6667, 4);
    expect(result.overallPct).toBeCloseTo(0.1, 6);
  });

  it("subtracts ad spend from the gross profit it produced", () => {
    const result = adsMetrics(BASE);
    expect(result.adProfit).toBeCloseTo(5000, 6);
    expect(result.profitable).toBe(true);
  });

  it("derives the break-even ROAS from the margin", () => {
    const result = adsMetrics(BASE);
    expect(result.breakEvenRoas).toBeCloseTo(2.5, 6);
    expect(result.breakEvenCpa).toBeCloseTo(60, 6);
    expect(result.breakEvenOrders).toBe(17);
    expect(result.missingOrders).toBe(0);
  });

  it("counts the orders still missing when the campaign loses money", () => {
    const result = adsMetrics({ ...BASE, orders: 5, aov: 100, marginPct: 30 });
    expect(result.revenue).toBe(500);
    expect(result.adProfit).toBeCloseTo(-850, 6);
    expect(result.profitable).toBe(false);
    expect(result.breakEvenCpa).toBeCloseTo(30, 6);
    expect(result.breakEvenOrders).toBe(34);
    expect(result.missingOrders).toBe(29);
  });

  it("returns null costs when clicks or orders are zero", () => {
    const result = adsMetrics({ ...BASE, clicks: 0, orders: 0 });
    expect(result.cpc).toBeNull();
    expect(result.cpa).toBeNull();
    expect(result.cvr).toBe(0);
    expect(result.roas).toBe(0);
  });

  it("has no break-even line at a zero margin", () => {
    const result = adsMetrics({ ...BASE, marginPct: 0 });
    expect(result.breakEvenRoas).toBeNull();
    expect(result.breakEvenOrders).toBeNull();
  });

  it("rejects numbers that cannot describe a funnel", () => {
    expect(codeOf(() => adsMetrics({ ...BASE, spend: 0 }))).toBe("ads.spend");
    expect(codeOf(() => adsMetrics({ ...BASE, impressions: 0 }))).toBe("ads.impressions");
    expect(codeOf(() => adsMetrics({ ...BASE, clicks: 200000 }))).toBe("ads.clicks");
    expect(codeOf(() => adsMetrics({ ...BASE, orders: 5000 }))).toBe("ads.orders");
    expect(codeOf(() => adsMetrics({ ...BASE, aov: 0 }))).toBe("ads.aov");
    expect(codeOf(() => adsMetrics({ ...BASE, marginPct: 130 }))).toBe("ads.margin");
  });
});
