import { describe, expect, it } from "vitest";
import { annuityPayment, buildSchedule, groupByYear, monthlyRate } from "@/lib/mortgage";

describe("annuityPayment", () => {
  it("matches the standard 30-year, 1M loan", () => {
    // 1,000,000 at 3.1% over 360 months ≈ 4,269.5 per month
    const payment = annuityPayment(1_000_000, monthlyRate(3.1), 360);
    expect(payment).toBeGreaterThan(4_200);
    expect(payment).toBeLessThan(4_350);
  });

  it("divides evenly at a zero rate", () => {
    expect(annuityPayment(360_000, 0, 360)).toBe(1_000);
  });
});

describe("buildSchedule", () => {
  it("pays the loan off exactly", () => {
    const result = buildSchedule({ principal: 1_000_000, annualRate: 3.1, years: 30, method: "annuity" });
    expect(result.rows).toHaveLength(360);
    expect(result.rows[result.rows.length - 1].balance).toBe(0);
    expect(result.totalPayment).toBeCloseTo(1_000_000 + result.totalInterest, 0);
  });

  it("keeps the payment flat for 等额本息", () => {
    const result = buildSchedule({ principal: 500_000, annualRate: 3.1, years: 20, method: "annuity" });
    const payments = result.rows.slice(0, 200).map((row) => row.payment);
    expect(Math.max(...payments) - Math.min(...payments)).toBeLessThan(1);
  });

  it("starts high and falls for 等额本金", () => {
    const result = buildSchedule({ principal: 500_000, annualRate: 3.1, years: 20, method: "equal-principal" });
    expect(result.firstPayment).toBeGreaterThan(result.lastPayment);
    expect(result.fixedPayment).toBeNull();
    expect(result.totalInterest).toBeLessThan(
      buildSchedule({ principal: 500_000, annualRate: 3.1, years: 20, method: "annuity" }).totalInterest
    );
  });

  it("shortens the term when the prepayment keeps the payment", () => {
    const base = buildSchedule({ principal: 1_000_000, annualRate: 3.1, years: 30, method: "annuity" });
    const result = buildSchedule({
      principal: 1_000_000,
      annualRate: 3.1,
      years: 30,
      method: "annuity",
      prepayment: { afterMonth: 60, amount: 200_000, mode: "shorten" },
    });
    expect(result.months).toBeLessThan(base.months);
    expect(result.interestSaved).toBeGreaterThan(0);
    expect(result.monthsSaved).toBe(base.months - result.months);
  });

  it("lowers the monthly payment when the term is kept", () => {
    const result = buildSchedule({
      principal: 1_000_000,
      annualRate: 3.1,
      years: 30,
      method: "annuity",
      prepayment: { afterMonth: 60, amount: 200_000, mode: "reduce" },
    });
    expect(result.months).toBe(360);
    expect(result.rows[61].payment).toBeLessThan(result.rows[0].payment);
  });

  it("groups twelve instalments into a year", () => {
    const result = buildSchedule({ principal: 240_000, annualRate: 0, years: 2, method: "annuity" });
    const years = groupByYear(result.rows);
    expect(years).toHaveLength(2);
    expect(years[0].principal).toBe(120_000);
  });
});
