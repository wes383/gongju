import { describe, expect, it } from "vitest";
import { isCodedError } from "@/lib/errors";
import { stockPlan, type StockInput } from "@/lib/inventory";

const BASE: StockInput = {
  onHand: 300,
  inbound: 0,
  dailySales: 20,
  leadDays: 15,
  safetyDays: 7,
  coverDays: 30,
  moq: 100,
};

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return isCodedError(error) ? error.code : "uncoded";
  }
  return "no-error";
}

describe("stockPlan", () => {
  it("measures cover, reorder point and the order itself", () => {
    const result = stockPlan(BASE);
    expect(result.availableDays).toBe(15);
    expect(result.reorderPoint).toBe(440);
    expect(result.daysUntilReorder).toBe(-7);
    expect(result.targetUnits).toBe(900);
    expect(result.rawNeed).toBe(600);
    expect(result.suggestedQty).toBe(600);
  });

  it("flags stock that runs out inside the lead time", () => {
    expect(stockPlan(BASE).status).toBe("stockout");
    expect(stockPlan({ ...BASE, onHand: 400 }).status).toBe("reorder");
    expect(stockPlan({ ...BASE, onHand: 500 }).status).toBe("ok");
    expect(stockPlan({ ...BASE, onHand: 0 }).status).toBe("out");
  });

  it("counts units already on the way", () => {
    const result = stockPlan({ ...BASE, onHand: 100, inbound: 300 });
    expect(result.rawNeed).toBe(500);
    expect(result.suggestedQty).toBe(500);
    expect(result.daysUntilReorder).toBe(-2);
  });

  it("rounds the order up to the supplier minimum", () => {
    const result = stockPlan({ ...BASE, moq: 250 });
    expect(result.rawNeed).toBe(600);
    expect(result.suggestedQty).toBe(750);
  });

  it("orders nothing when the shelf already covers the target", () => {
    const result = stockPlan({ ...BASE, onHand: 2000 });
    expect(result.rawNeed).toBe(-1100);
    expect(result.suggestedQty).toBe(0);
  });

  it("rejects input that cannot describe a stock position", () => {
    expect(codeOf(() => stockPlan({ ...BASE, dailySales: 0 }))).toBe("stock.daily");
    expect(codeOf(() => stockPlan({ ...BASE, onHand: -1 }))).toBe("stock.onHand");
    expect(codeOf(() => stockPlan({ ...BASE, leadDays: 400 }))).toBe("stock.days");
    expect(codeOf(() => stockPlan({ ...BASE, moq: -5 }))).toBe("stock.moq");
  });
});
