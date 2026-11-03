/**
 * Mortgage amortisation: 等额本息 (annuity) and 等额本金 (equal principal),
 * with optional lump-sum prepayment.
 *
 * All maths is closed-form — no simulation — so the schedule can be rebuilt on
 * every keystroke without a worker.
 */

import { round2 } from "./tax";

export type RepaymentMethod = "annuity" | "equal-principal";

export interface Prepayment {
  /** Pay the lump sum right after this instalment */
  afterMonth: number;
  amount: number;
  /** shorten = keep the payment and finish earlier, reduce = keep the term */
  mode: "shorten" | "reduce";
}

export interface MortgageInput {
  principal: number;
  /** Annual interest rate in percent, e.g. 3.1 */
  annualRate: number;
  years: number;
  method: RepaymentMethod;
  prepayment?: Prepayment | null;
}

export interface Installment {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  /** Optional lump sum paid in this month */
  extra: number;
  balance: number;
}

export interface MortgageResult {
  rows: Installment[];
  months: number;
  firstPayment: number;
  lastPayment: number;
  /** Monthly payment for 等额本息; null for 等额本金 where it varies */
  fixedPayment: number | null;
  totalInterest: number;
  totalPayment: number;
  /** Interest saved by the prepayment, compared with the same loan without one */
  interestSaved: number;
  /** Months saved by the prepayment */
  monthsSaved: number;
}

/** Monthly rate from an annual percentage */
export function monthlyRate(annualRate: number): number {
  return Math.max(0, annualRate) / 100 / 12;
}

/** Annuity payment for a loan of `principal` over `months` */
export function annuityPayment(principal: number, rate: number, months: number): number {
  if (months <= 0) return 0;
  if (rate === 0) return principal / months;
  const factor = (1 + rate) ** months;
  return (principal * rate * factor) / (factor - 1);
}

/** Number of payments needed to clear `balance`, given a fixed payment */
function paymentsFor(balance: number, rate: number, payment: number): number {
  if (balance <= 0) return 0;
  if (rate === 0) return Math.ceil(balance / payment);
  const interest = balance * rate;
  if (payment <= interest) return Number.POSITIVE_INFINITY;
  return Math.ceil(-Math.log(1 - interest / payment) / Math.log(1 + rate));
}

export function buildSchedule(input: MortgageInput): MortgageResult {
  const principal = Math.max(0, input.principal);
  const rate = monthlyRate(input.annualRate);
  const plannedMonths = Math.max(1, Math.round(Math.max(0, input.years) * 12));
  const prepayment =
    input.prepayment && input.prepayment.amount > 0 && input.prepayment.afterMonth >= 1
      ? input.prepayment
      : null;

  const rows: Installment[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPayment = 0;
  let payment = input.method === "annuity" ? annuityPayment(principal, rate, plannedMonths) : 0;
  let principalPart = input.method === "equal-principal" ? principal / plannedMonths : 0;
  let endMonth = plannedMonths;

  // Hard stop keeps a pathological input (payment below the interest) finite
  const limit = 1200;
  for (let month = 1; month <= endMonth && balance > 0.005 && month <= limit; month += 1) {
    const interest = balance * rate;
    let principalThis = input.method === "annuity" ? payment - interest : principalPart;
    if (principalThis <= 0) principalThis = balance;
    if (principalThis > balance) principalThis = balance;

    const scheduled = principalThis + interest;
    balance -= principalThis;

    let extra = 0;
    if (prepayment && month === prepayment.afterMonth && balance > 0) {
      extra = Math.min(prepayment.amount, balance);
      balance -= extra;
      const left = endMonth - month;
      if (left > 0 && balance > 0.005) {
        if (prepayment.mode === "reduce") {
          payment = annuityPayment(balance, rate, left);
          principalPart = balance / left;
        } else {
          const needed = paymentsFor(balance, rate, payment);
          const nextLeft = Number.isFinite(needed)
            ? Math.max(1, Math.min(left, needed))
            : left;
          endMonth = month + nextLeft;
          principalPart = balance / nextLeft;
        }
      }
    }

    totalInterest += interest;
    totalPayment += scheduled + extra;
    rows.push({
      month,
      payment: round2(scheduled + extra),
      principal: round2(principalThis + extra),
      interest: round2(interest),
      extra: round2(extra),
      balance: round2(Math.max(0, balance)),
    });
  }

  const baseline = prepayment ? buildSchedule({ ...input, prepayment: null }) : null;

  return {
    rows,
    months: rows.length,
    firstPayment: rows[0]?.payment ?? 0,
    lastPayment: rows[rows.length - 1]?.payment ?? 0,
    fixedPayment: input.method === "annuity" ? round2(annuityPayment(principal, rate, plannedMonths)) : null,
    totalInterest: round2(totalInterest),
    totalPayment: round2(totalPayment),
    interestSaved: baseline ? round2(baseline.totalInterest - totalInterest) : 0,
    monthsSaved: baseline ? baseline.months - rows.length : 0,
  };
}

export interface YearGroup {
  year: number;
  principal: number;
  interest: number;
  payment: number;
  balance: number;
}

/** Roll the monthly schedule up to calendar-year rows for the summary table */
export function groupByYear(rows: Installment[]): YearGroup[] {
  const groups: YearGroup[] = [];
  rows.forEach((row, index) => {
    const year = Math.floor(index / 12) + 1;
    let group = groups[groups.length - 1];
    if (!group || group.year !== year) {
      group = { year, principal: 0, interest: 0, payment: 0, balance: row.balance };
      groups.push(group);
    }
    group.principal = round2(group.principal + row.principal);
    group.interest = round2(group.interest + row.interest);
    group.payment = round2(group.payment + row.payment);
    group.balance = row.balance;
  });
  return groups;
}

export const RATE_PRESETS: { id: string; zh: string; en: string; rate: number }[] = [
  { id: "fund", zh: "公积金贷款 2.60%", en: "Housing fund 2.60%", rate: 2.6 },
  { id: "first", zh: "首套商贷 3.10%", en: "First home 3.10%", rate: 3.1 },
  { id: "second", zh: "二套商贷 3.60%", en: "Second home 3.60%", rate: 3.6 },
];
