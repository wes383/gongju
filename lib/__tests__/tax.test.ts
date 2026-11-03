import { describe, expect, it } from "vitest";
import {
  bonusSeparateTax,
  compareBonus,
  estimateSocial,
  taxFromBrackets,
  withholdTable,
} from "@/lib/tax";

describe("taxFromBrackets", () => {
  it("applies the statutory bands", () => {
    expect(taxFromBrackets(0)).toBe(0);
    expect(taxFromBrackets(36_000)).toBe(1_080);
    expect(taxFromBrackets(36_001)).toBeCloseTo(1_080.1, 2);
    expect(taxFromBrackets(144_000)).toBe(11_880);
    expect(taxFromBrackets(1_000_000)).toBeCloseTo(268_080, 2);
  });

  it("treats negative taxable income as zero", () => {
    expect(taxFromBrackets(-5_000)).toBe(0);
  });
});

describe("withholdTable", () => {
  it("withholds more as the cumulative income climbs", () => {
    const result = withholdTable({
      monthlyGross: 20_000,
      monthlySocial: 3_000,
      monthlySpecial: 2_000,
    });
    expect(result.rows).toHaveLength(12);
    // 240,000 gross − 60,000 standard − 36,000 social − 24,000 special = 120,000
    expect(result.rows[11].cumTaxable).toBe(120_000);
    expect(result.taxTotal).toBeCloseTo(9_480, 2);
    expect(result.rows[0].tax).toBeLessThan(result.rows[11].tax);
    expect(result.netMonthly).toBeCloseTo((240_000 - 36_000 - 9_480) / 12, 2);
  });

  it("pays no tax below the standard deduction", () => {
    const result = withholdTable({ monthlyGross: 5_000, monthlySocial: 0, monthlySpecial: 0 });
    expect(result.taxTotal).toBe(0);
    expect(result.netTotal).toBe(60_000);
  });

  it("supports a partial year", () => {
    const result = withholdTable({
      monthlyGross: 30_000,
      monthlySocial: 4_000,
      monthlySpecial: 1_000,
      months: 6,
    });
    expect(result.rows).toHaveLength(6);
    expect(result.grossTotal).toBe(180_000);
  });
});

describe("bonusSeparateTax", () => {
  it("taxes the whole bonus at the band picked by bonus / 12", () => {
    expect(bonusSeparateTax(36_000)).toBe(1_080);
    // One yuan more crosses into the 10% band — the classic cliff
    expect(bonusSeparateTax(36_001)).toBeCloseTo(3_390.1, 2);
  });

  it("returns zero for no bonus", () => {
    expect(bonusSeparateTax(0)).toBe(0);
  });
});

describe("compareBonus", () => {
  it("prefers folding a large bonus into comprehensive income", () => {
    const result = compareBonus(100_000, 0);
    expect(result.separate.bonusTax).toBeCloseTo(9_790, 2);
    expect(result.combined.totalTax).toBeCloseTo(7_480, 2);
    expect(result.better).toBe("combined");
    expect(result.saving).toBeCloseTo(2_310, 2);
  });

  it("prefers the separate option when the salary already fills a low band", () => {
    const result = compareBonus(20_000, 200_000);
    expect(result.better).toBe("separate");
  });
});

describe("estimateSocial", () => {
  it("splits the employee contribution by rate", () => {
    const result = estimateSocial(10_000);
    expect(result.pension).toBe(800);
    expect(result.medical).toBe(200);
    expect(result.unemployment).toBe(50);
    expect(result.housingFund).toBe(700);
    expect(result.total).toBe(1_750);
    expect(result.effectiveRate).toBeCloseTo(0.175, 4);
  });
});
