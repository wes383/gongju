/**
 * Store economics: unit profit, break-even price, break-even ROAS and stacked
 * promotions.
 *
 * Nothing here rounds: the UI decides the precision. Every rate is entered as a
 * percentage (5 means 5%), which matches how sellers read fee schedules.
 */

import { codedError } from "./errors";

const MAX_MONEY = 1e9;

function money(value: number, key: string): number {
  if (!Number.isFinite(value) || value < 0 || value > MAX_MONEY) throw codedError(key);
  return value;
}

function rate(value: number, key: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw codedError(key);
  return value / 100;
}

export interface PricingInput {
  /** Listed price the buyer pays before any promotion */
  price: number;
  /** Landed cost per unit */
  cost: number;
  /** Marketplace commission, percent */
  commissionPct: number;
  /** Payment processor fee, percent */
  paymentPct: number;
  /** Outbound shipping the seller pays, per order */
  shipping: number;
  /** Packaging and inserts, per order */
  packaging: number;
  /** Advertising spend allocated to one order */
  adCost: number;
  /** Share of orders that come back, percent */
  returnRatePct: number;
}

export interface PricingResult {
  /** Money actually kept after refunds */
  revenue: number;
  cogs: number;
  fees: number;
  logistics: number;
  ads: number;
  /** Unit profit after every variable cost */
  profit: number;
  /** Profit as a share of the listed price */
  marginPct: number;
  /** Listed price divided by cost, null when cost is zero */
  markup: number | null;
  /** Price at which profit is exactly zero */
  breakEvenPrice: number;
  /** Revenue ÷ spend that keeps ads break-even, null when unprofitable anyway */
  breakEvenRoas: number | null;
  /** Ad spend per order the unit can still absorb */
  maxAdCost: number;
  /** Contribution left before ads, as a share of revenue */
  contributionPct: number;
}

/** Unit economics for one product at one price. */
export function pricing(input: PricingInput): PricingResult {
  const price = money(input.price, "shop.price");
  if (price <= 0) throw codedError("shop.price");
  const cost = money(input.cost, "shop.cost");
  const shipping = money(input.shipping, "shop.shipping");
  const packaging = money(input.packaging, "shop.shipping");
  const adCost = money(input.adCost, "shop.shipping");

  const commission = rate(input.commissionPct, "shop.rate");
  const payment = rate(input.paymentPct, "shop.rate");
  const feeRate = commission + payment;
  if (feeRate >= 1) throw codedError("shop.rate");

  const returns = rate(input.returnRatePct, "shop.return");
  if (returns >= 1) throw codedError("shop.returnAll");
  const sold = 1 - returns;

  // A returned order refunds the price and the commission, and the unit goes
  // back on the shelf, so both revenue and cost scale with `sold`. Shipping and
  // ads do not come back.
  const revenue = price * sold;
  const cogs = cost * sold;
  const fees = price * feeRate * sold;
  const logistics = shipping + packaging;
  const profit = revenue - cogs - fees - logistics - adCost;

  const contribution = revenue - cogs - fees - logistics;
  const contributionPct = revenue > 0 ? (contribution / revenue) * 100 : 0;

  const denominator = sold * (1 - feeRate);
  if (denominator <= 1e-12) throw codedError("shop.breakEven");
  const breakEvenPrice = (cost * sold + logistics + adCost) / denominator;

  return {
    revenue,
    cogs,
    fees,
    logistics,
    ads: adCost,
    profit,
    marginPct: (profit / price) * 100,
    markup: cost > 0 ? price / cost : null,
    breakEvenPrice,
    breakEvenRoas: contribution > 0 ? revenue / contribution : null,
    maxAdCost: contribution,
    contributionPct,
  };
}

export interface CouponRule {
  /** Minimum amount before the coupon can be used, 0 for none */
  threshold: number;
  /** Money taken off once the coupon applies */
  off: number;
  /** Marketplace coupons often stack once per full threshold */
  repeat?: boolean;
}

export type DiscountStepId = "discount" | "shopCoupon" | "platformCoupon" | "subsidy";

export interface DiscountStep {
  id: DiscountStepId;
  before: number;
  after: number;
  off: number;
  /** False when the threshold was missed or the rule is empty */
  applied: boolean;
}

export interface DiscountInput {
  price: number;
  /** Share of the price the buyer pays after the store discount, 0–100 */
  discountPct: number;
  shopCoupon?: CouponRule | null;
  platformCoupon?: CouponRule | null;
  /** Extra platform-funded subsidy on the amount left, percent */
  subsidyPct?: number;
  /** Unit cost, used only for the profit line; 0 hides it */
  cost?: number;
}

export interface DiscountResult {
  steps: DiscountStep[];
  /** What the buyer pays */
  payable: number;
  /** What the seller is settled, including the platform-funded subsidy */
  merchantRevenue: number;
  /** Buyer-facing saving, price − payable */
  totalOff: number;
  /** Payable as a share of the listed price, e.g. 64 means 6.4 折 */
  effectivePct: number;
  subsidy: number;
  /** Merchant revenue minus cost, null when no cost was given */
  profit: number | null;
  marginPct: number | null;
}

function applyCoupon(amount: number, rule: CouponRule | null | undefined): DiscountStep {
  if (!rule || rule.off <= 0) {
    return { id: "shopCoupon", before: amount, after: amount, off: 0, applied: false };
  }
  if (!Number.isFinite(rule.off) || rule.off < 0) throw codedError("discount.coupon");
  if (!Number.isFinite(rule.threshold) || rule.threshold < 0) throw codedError("discount.threshold");
  if (amount < rule.threshold) {
    return { id: "shopCoupon", before: amount, after: amount, off: 0, applied: false };
  }
  const times = rule.repeat && rule.threshold > 0 ? Math.floor(amount / rule.threshold) : 1;
  const off = Math.min(amount, rule.off * Math.max(1, times));
  return { id: "shopCoupon", before: amount, after: amount - off, off, applied: true };
}

/**
 * Apply a store discount, a shop coupon, a marketplace coupon and a
 * platform-funded subsidy in the order shoppers see them at checkout.
 */
export function discountStack(input: DiscountInput): DiscountResult {
  const price = money(input.price, "discount.price");
  if (price <= 0) throw codedError("discount.price");
  const discountRate = rate(input.discountPct, "discount.percent");
  const subsidyRate = rate(input.subsidyPct ?? 0, "discount.percent");

  const afterDiscount = price * discountRate;
  const steps: DiscountStep[] = [
    {
      id: "discount",
      before: price,
      after: afterDiscount,
      off: price - afterDiscount,
      applied: discountRate < 1,
    },
  ];

  const shop = applyCoupon(afterDiscount, input.shopCoupon);
  steps.push({ ...shop, id: "shopCoupon" });

  const platform = applyCoupon(shop.after, input.platformCoupon);
  steps.push({ ...platform, id: "platformCoupon" });

  const subsidy = platform.after * subsidyRate;
  steps.push({
    id: "subsidy",
    before: platform.after,
    after: platform.after - subsidy,
    off: subsidy,
    applied: subsidy > 0,
  });

  const payable = platform.after - subsidy;
  // The platform pays the subsidy on top, so the seller is settled at the
  // pre-subsidy amount.
  const merchantRevenue = payable + subsidy;

  const cost = input.cost === undefined ? 0 : money(input.cost, "shop.cost");
  const profit = cost > 0 ? merchantRevenue - cost : null;

  return {
    steps,
    payable,
    merchantRevenue,
    totalOff: price - payable,
    effectivePct: (payable / price) * 100,
    subsidy,
    profit,
    marginPct: profit === null || merchantRevenue <= 0 ? null : (profit / merchantRevenue) * 100,
  };
}
