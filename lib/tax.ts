/**
 * China individual income tax (IIT) for salaries.
 *
 * Uses the cumulative withholding method that has applied to 综合所得 since
 * 2019: the monthly taxable amount is accumulated, the bracket table is applied
 * to the running total, and the tax already withheld is subtracted.
 *
 * Rates are the statutory ones; the standard deduction (5,000 CNY/month) and
 * the social-insurance base limits are city-specific, so callers pass the
 * employee contribution in instead of guessing it.
 */

export interface Bracket {
  /** Upper bound of the band; null for the top band */
  upTo: number | null;
  rate: number;
  /** 速算扣除数 — makes the band arithmetic one subtraction */
  quick: number;
}

/** 综合所得年度税率表, also used for the cumulative withholding base */
export const ANNUAL_BRACKETS: Bracket[] = [
  { upTo: 36_000, rate: 0.03, quick: 0 },
  { upTo: 144_000, rate: 0.1, quick: 2_520 },
  { upTo: 300_000, rate: 0.2, quick: 16_920 },
  { upTo: 420_000, rate: 0.25, quick: 31_920 },
  { upTo: 660_000, rate: 0.3, quick: 52_920 },
  { upTo: 960_000, rate: 0.35, quick: 85_920 },
  { upTo: null, rate: 0.45, quick: 181_920 },
];

/** 全年一次性奖金按月换算后的税率表 (单独计税) */
export const BONUS_BRACKETS: Bracket[] = [
  { upTo: 3_000, rate: 0.03, quick: 0 },
  { upTo: 12_000, rate: 0.1, quick: 210 },
  { upTo: 25_000, rate: 0.2, quick: 1_410 },
  { upTo: 35_000, rate: 0.25, quick: 2_660 },
  { upTo: 55_000, rate: 0.3, quick: 4_410 },
  { upTo: 80_000, rate: 0.35, quick: 7_160 },
  { upTo: null, rate: 0.45, quick: 15_160 },
];

/** Standard deduction: 5,000 CNY per month */
export const MONTHLY_STANDARD_DEDUCTION = 5_000;

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Progressive tax on a taxable amount, rounded to cents */
export function taxFromBrackets(taxable: number, brackets: Bracket[] = ANNUAL_BRACKETS): number {
  if (!Number.isFinite(taxable) || taxable <= 0) return 0;
  const band = brackets.find((b) => b.upTo === null || taxable <= b.upTo) ?? brackets[brackets.length - 1];
  return round2(Math.max(0, taxable * band.rate - band.quick));
}

/** Rate that applies to the next yuan of income */
export function marginalRate(taxable: number, brackets: Bracket[] = ANNUAL_BRACKETS): number {
  const band = brackets.find((b) => b.upTo === null || taxable <= b.upTo) ?? brackets[brackets.length - 1];
  return band.rate;
}

export interface SalaryInput {
  /** Gross salary before any deduction */
  monthlyGross: number;
  /** Employee-side social insurance + housing fund, per month */
  monthlySocial: number;
  /** Special additional deductions (子女教育, 房贷利息, 赡养老人 …), per month */
  monthlySpecial: number;
  /** Other pre-tax deductions such as enterprise annuity, per month */
  monthlyOther?: number;
  months?: number;
}

export interface SalaryRow {
  month: number;
  gross: number;
  social: number;
  special: number;
  /** Taxable income for this month, before accumulation */
  taxable: number;
  /** Running taxable income for the year */
  cumTaxable: number;
  /** Tax withheld for this month */
  tax: number;
  /** Running tax withheld */
  cumTax: number;
  /** Money that actually reaches the bank account */
  net: number;
}

export interface SalarySummary {
  rows: SalaryRow[];
  grossTotal: number;
  socialTotal: number;
  taxTotal: number;
  netTotal: number;
  /** Average net per month */
  netMonthly: number;
  /** Effective tax rate over gross income */
  effectiveRate: number;
  /** Total deductions from gross, excluding tax */
  deductionTotal: number;
}

/** Month-by-month cumulative withholding table */
export function withholdTable(input: SalaryInput): SalarySummary {
  const months = Math.max(1, Math.min(12, Math.floor(input.months ?? 12)));
  const gross = Math.max(0, input.monthlyGross);
  const social = Math.max(0, input.monthlySocial);
  const special = Math.max(0, input.monthlySpecial);
  const other = Math.max(0, input.monthlyOther ?? 0);
  const deduction = social + special + other + MONTHLY_STANDARD_DEDUCTION;

  const rows: SalaryRow[] = [];
  let cumTaxable = 0;
  let cumTax = 0;

  for (let month = 1; month <= months; month += 1) {
    cumTaxable = round2(gross * month - deduction * month);
    const cumDue = taxFromBrackets(cumTaxable);
    const tax = round2(Math.max(0, cumDue - cumTax));
    cumTax = round2(cumTax + tax);
    rows.push({
      month,
      gross: round2(gross),
      social: round2(social),
      special: round2(special + other),
      taxable: round2(Math.max(0, gross - deduction)),
      cumTaxable,
      tax,
      cumTax,
      net: round2(gross - social - tax),
    });
  }

  const grossTotal = round2(gross * months);
  const socialTotal = round2(social * months);
  const taxTotal = round2(cumTax);
  const netTotal = round2(grossTotal - socialTotal - taxTotal);

  return {
    rows,
    grossTotal,
    socialTotal,
    taxTotal,
    netTotal,
    netMonthly: round2(netTotal / months),
    effectiveRate: grossTotal > 0 ? taxTotal / grossTotal : 0,
    deductionTotal: round2((social + special + other) * months),
  };
}

export interface BonusComparison {
  bonus: number;
  /** Annual salary taxable income, i.e. gross − social − deductions */
  salaryTaxable: number;
  separate: { bonusTax: number; salaryTax: number; totalTax: number; netBonus: number };
  combined: { totalTax: number; netBonus: number };
  /** Which option pays less total tax */
  better: "separate" | "combined";
  saving: number;
}

/**
 * Tax on an annual one-off bonus using 单独计税.
 *
 * The bonus is divided by 12 only to pick the band; the whole amount is then
 * taxed at that band's rate minus its quick deduction.
 */
export function bonusSeparateTax(bonus: number): number {
  if (!Number.isFinite(bonus) || bonus <= 0) return 0;
  const average = bonus / 12;
  const band =
    BONUS_BRACKETS.find((b) => b.upTo === null || average <= b.upTo) ??
    BONUS_BRACKETS[BONUS_BRACKETS.length - 1];
  return round2(Math.max(0, bonus * band.rate - band.quick));
}

/**
 * Compare 单独计税 against folding the bonus into 综合所得.
 *
 * The separate option taxes the salary and the bonus independently; the
 * combined option adds the bonus to the annual taxable salary and taxes the sum
 * with the annual table.
 */
export function compareBonus(bonus: number, salaryTaxable: number): BonusComparison {
  const salary = Math.max(0, salaryTaxable);
  const amount = Math.max(0, bonus);
  const salaryTax = taxFromBrackets(salary);
  const separateBonusTax = bonusSeparateTax(amount);
  const combinedTotal = taxFromBrackets(salary + amount);

  const separate = {
    bonusTax: separateBonusTax,
    salaryTax,
    totalTax: round2(salaryTax + separateBonusTax),
    netBonus: round2(amount - separateBonusTax),
  };
  const combined = {
    totalTax: combinedTotal,
    netBonus: round2(amount - Math.max(0, combinedTotal - salaryTax)),
  };
  const better = separate.totalTax <= combined.totalTax ? "separate" : "combined";
  return {
    bonus: amount,
    salaryTaxable: salary,
    separate,
    combined,
    better,
    saving: round2(Math.abs(separate.totalTax - combined.totalTax)),
  };
}

export interface SocialRates {
  pension: number;
  medical: number;
  unemployment: number;
  housingFund: number;
}

/** Typical employee-side rates; cities differ, so the UI keeps them editable */
export const DEFAULT_EMPLOYEE_RATES: SocialRates = {
  pension: 0.08,
  medical: 0.02,
  unemployment: 0.005,
  housingFund: 0.07,
};

export interface SocialBreakdown {
  pension: number;
  medical: number;
  unemployment: number;
  housingFund: number;
  total: number;
  /** Effective rate against the contribution base */
  effectiveRate: number;
}

export function estimateSocial(base: number, rates: SocialRates = DEFAULT_EMPLOYEE_RATES): SocialBreakdown {
  const safeBase = Math.max(0, base);
  const pension = round2(safeBase * rates.pension);
  const medical = round2(safeBase * rates.medical);
  const unemployment = round2(safeBase * rates.unemployment);
  const housingFund = round2(safeBase * rates.housingFund);
  const total = round2(pension + medical + unemployment + housingFund);
  return {
    pension,
    medical,
    unemployment,
    housingFund,
    total,
    effectiveRate: safeBase > 0 ? total / safeBase : 0,
  };
}
