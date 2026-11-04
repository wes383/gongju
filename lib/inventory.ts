/**
 * Stock cover and replenishment: how long the shelf lasts, when to place the
 * next purchase order, and how many units to order so the quantity lands on a
 * multiple of the supplier's minimum.
 */

import { codedError } from "./errors";

export type StockStatus = "ok" | "reorder" | "stockout" | "out";

export interface StockInput {
  /** Units on the shelf right now */
  onHand: number;
  /** Units already ordered but not received */
  inbound: number;
  /** Units sold per day */
  dailySales: number;
  /** Supplier lead time in days */
  leadDays: number;
  /** Extra days of cover kept as a buffer */
  safetyDays: number;
  /** Days of demand one order should cover after arrival */
  coverDays: number;
  /** Minimum order quantity, 0 for none */
  moq: number;
}

export interface StockResult {
  /** Days the shelf lasts with no further intake */
  availableDays: number;
  /** Units that must be on hand when ordering to survive the lead time */
  reorderPoint: number;
  /** Days until the stock reaches the reorder point, negative when already past */
  daysUntilReorder: number;
  /** Units needed to reach the target cover after arrival */
  rawNeed: number;
  /** Order quantity rounded up to the supplier's minimum */
  suggestedQty: number;
  /** Stock level the order aims for, including the lead time */
  targetUnits: number;
  status: StockStatus;
}

function clampDays(value: number, key: string, max: number): number {
  if (!Number.isFinite(value) || value < 0 || value > max) throw codedError(key, String(max));
  return value;
}

export function stockPlan(input: StockInput): StockResult {
  const daily = input.dailySales;
  if (!Number.isFinite(daily) || daily <= 0) throw codedError("stock.daily");

  const onHand = input.onHand;
  if (!Number.isFinite(onHand) || onHand < 0) throw codedError("stock.onHand");
  const inbound = input.inbound;
  if (!Number.isFinite(inbound) || inbound < 0) throw codedError("stock.onHand");

  const lead = clampDays(input.leadDays, "stock.days", 365);
  const safety = clampDays(input.safetyDays, "stock.days", 730);
  const cover = clampDays(input.coverDays, "stock.days", 730);

  const moq = input.moq;
  if (!Number.isFinite(moq) || moq < 0 || moq > 1e6) throw codedError("stock.moq");

  const availableDays = onHand / daily;
  const reorderPoint = daily * (lead + safety);
  const daysUntilReorder = (onHand + inbound - reorderPoint) / daily;

  const targetUnits = daily * (lead + cover);
  const rawNeed = targetUnits - onHand - inbound;
  const suggestedQty =
    rawNeed <= 0 ? 0 : moq > 0 ? Math.ceil(rawNeed / moq) * moq : Math.ceil(rawNeed);

  let status: StockStatus = "ok";
  if (onHand <= 0) status = "out";
  else if (availableDays <= lead) status = "stockout";
  else if (availableDays <= lead + safety) status = "reorder";

  return {
    availableDays,
    reorderPoint,
    daysUntilReorder,
    rawNeed,
    suggestedQty,
    targetUnits,
    status,
  };
}
