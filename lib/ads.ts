/**
 * Paid-traffic metrics: the funnel from impression to paid order, plus the
 * return on ad spend and the break-even line implied by the gross margin.
 */

import { codedError } from "./errors";

export interface AdsInput {
  spend: number;
  impressions: number;
  clicks: number;
  orders: number;
  /** Average order value */
  aov: number;
  /** Gross margin before ad spend, percent */
  marginPct: number;
}

export interface AdsResult {
  revenue: number;
  impressions: number;
  clicks: number;
  orders: number;
  /** Click-through rate, percent */
  ctr: number;
  /** Cost per click, null when there were no clicks */
  cpc: number | null;
  /** Click-to-order rate, percent */
  cvr: number;
  /** Cost per acquisition, null when there were no orders */
  cpa: number | null;
  /** Revenue ÷ spend */
  roas: number;
  /** Ad spend ÷ revenue, percent */
  acos: number;
  /** Impression-to-order rate, percent */
  overallPct: number;
  /** Gross profit left after ad spend */
  adProfit: number;
  /** ROAS that only covers the ad spend, null when margin is zero */
  breakEvenRoas: number | null;
  /** Highest CPA that still breaks even, null when margin is zero */
  breakEvenCpa: number | null;
  /** Orders needed to cover the spend, null when margin is zero */
  breakEvenOrders: number | null;
  /** Orders still missing to break even, 0 when already there */
  missingOrders: number;
  profitable: boolean;
}

export function adsMetrics(input: AdsInput): AdsResult {
  const spend = input.spend;
  if (!Number.isFinite(spend) || spend <= 0) throw codedError("ads.spend");

  const impressions = input.impressions;
  if (!Number.isFinite(impressions) || impressions <= 0) throw codedError("ads.impressions");

  const clicks = input.clicks;
  if (!Number.isFinite(clicks) || clicks < 0 || clicks > impressions) {
    throw codedError("ads.clicks");
  }

  const orders = input.orders;
  if (!Number.isFinite(orders) || orders < 0 || orders > clicks) {
    throw codedError("ads.orders");
  }

  const aov = input.aov;
  if (!Number.isFinite(aov) || aov <= 0) throw codedError("ads.aov");

  if (!Number.isFinite(input.marginPct) || input.marginPct < 0 || input.marginPct > 100) {
    throw codedError("ads.margin");
  }
  const margin = input.marginPct / 100;

  const revenue = orders * aov;
  const grossProfit = revenue * margin;
  const adProfit = grossProfit - spend;
  const breakEvenRoas = margin > 0 ? 1 / margin : null;
  const breakEvenCpa = margin > 0 ? aov * margin : null;
  const breakEvenOrders =
    breakEvenCpa !== null && breakEvenCpa > 0 ? Math.ceil(spend / breakEvenCpa) : null;

  return {
    revenue,
    impressions,
    clicks,
    orders,
    ctr: (clicks / impressions) * 100,
    cpc: clicks > 0 ? spend / clicks : null,
    cvr: clicks > 0 ? (orders / clicks) * 100 : 0,
    cpa: orders > 0 ? spend / orders : null,
    roas: revenue / spend,
    acos: revenue > 0 ? (spend / revenue) * 100 : 0,
    overallPct: (orders / impressions) * 100,
    adProfit,
    breakEvenRoas,
    breakEvenCpa,
    breakEvenOrders,
    missingOrders: breakEvenOrders === null ? 0 : Math.max(0, breakEvenOrders - orders),
    profitable: adProfit >= 0,
  };
}
