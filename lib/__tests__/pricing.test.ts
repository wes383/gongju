import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import { discountStack, pricing, type PricingInput } from "@/lib/pricing";

const BASE: PricingInput = {
  price: 100,
  cost: 30,
  commissionPct: 5,
  paymentPct: 0.6,
  shipping: 6,
  packaging: 2,
  adCost: 10,
  returnRatePct: 5,
};

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("pricing", () => {
  it("splits a unit's revenue into every variable cost", () => {
    const result = pricing(BASE);
    expect(result.revenue).toBeCloseTo(95, 6);
    expect(result.cogs).toBeCloseTo(28.5, 6);
    expect(result.fees).toBeCloseTo(5.32, 6);
    expect(result.logistics).toBe(8);
    expect(result.ads).toBe(10);
    expect(result.profit).toBeCloseTo(43.18, 6);
    expect(result.marginPct).toBeCloseTo(43.18, 6);
    expect(result.markup).toBeCloseTo(3.3333, 4);
  });

  it("leaves shipping and ads unrefunded but refunds the commission", () => {
    // With no returns the whole price is kept; a 100% return rate has no
    // break-even price at all.
    expect(pricing({ ...BASE, returnRatePct: 0 }).profit).toBeCloseTo(46.4, 6);
    expect(codeOf(() => pricing({ ...BASE, returnRatePct: 100 }))).toBe("shop.returnAll");
  });

  it("reports the contribution before ads and the ROAS it implies", () => {
    const result = pricing(BASE);
    expect(result.maxAdCost).toBeCloseTo(53.18, 6);
    expect(result.contributionPct).toBeCloseTo(55.9789, 4);
    expect(result.breakEvenRoas).toBeCloseTo(95 / 53.18, 6);
  });

  it("finds the price where profit is zero", () => {
    const result = pricing(BASE);
    expect(result.breakEvenPrice).toBeCloseTo(51.851, 3);
    const atBreakEven = pricing({ ...BASE, price: result.breakEvenPrice });
    expect(atBreakEven.profit).toBeCloseTo(0, 6);
  });

  it("has no markup multiple without a cost", () => {
    expect(pricing({ ...BASE, cost: 0 }).markup).toBeNull();
  });

  it("rejects prices and rates that cannot work", () => {
    expect(codeOf(() => pricing({ ...BASE, price: 0 }))).toBe("shop.price");
    expect(codeOf(() => pricing({ ...BASE, cost: -1 }))).toBe("shop.cost");
    expect(codeOf(() => pricing({ ...BASE, commissionPct: 60, paymentPct: 40 }))).toBe("shop.rate");
    expect(codeOf(() => pricing({ ...BASE, returnRatePct: 120 }))).toBe("shop.return");
  });
});

describe("discountStack", () => {
  it("applies the store discount, both coupons and the subsidy in order", () => {
    const result = discountStack({
      price: 200,
      discountPct: 100,
      shopCoupon: { threshold: 199, off: 20 },
      platformCoupon: { threshold: 100, off: 10 },
      subsidyPct: 5,
      cost: 80,
    });

    expect(result.steps.map((step) => step.after)).toEqual([200, 180, 170, 161.5]);
    expect(result.payable).toBeCloseTo(161.5, 6);
    expect(result.subsidy).toBeCloseTo(8.5, 6);
    expect(result.merchantRevenue).toBeCloseTo(170, 6);
    expect(result.totalOff).toBeCloseTo(38.5, 6);
    expect(result.effectivePct).toBeCloseTo(80.75, 6);
    expect(result.profit).toBeCloseTo(90, 6);
    expect(result.marginPct).toBeCloseTo(52.9412, 4);
  });

  it("skips a coupon whose threshold is not met", () => {
    const result = discountStack({
      price: 150,
      discountPct: 90,
      shopCoupon: { threshold: 200, off: 30 },
    });
    expect(result.steps[1].applied).toBe(false);
    expect(result.steps[1].off).toBe(0);
    expect(result.payable).toBeCloseTo(135, 6);
  });

  it("stacks a repeatable marketplace coupon once per full threshold", () => {
    const result = discountStack({
      price: 250,
      discountPct: 100,
      platformCoupon: { threshold: 100, off: 10, repeat: true },
    });
    expect(result.steps[2].off).toBe(20);
    expect(result.payable).toBeCloseTo(230, 6);
  });

  it("never lets a discount push the price below zero", () => {
    const result = discountStack({
      price: 100,
      discountPct: 100,
      shopCoupon: { threshold: 0, off: 200 },
    });
    expect(result.payable).toBe(0);
    expect(result.effectivePct).toBe(0);
    expect(result.profit).toBeNull();
  });

  it("rejects impossible discounts", () => {
    expect(codeOf(() => discountStack({ price: 10, discountPct: 120 }))).toBe("discount.percent");
    expect(codeOf(() => discountStack({ price: 0, discountPct: 100 }))).toBe("discount.price");
    expect(
      codeOf(() => discountStack({ price: 10, discountPct: 100, shopCoupon: { threshold: -1, off: 5 } }))
    ).toBe("discount.threshold");
  });
});
