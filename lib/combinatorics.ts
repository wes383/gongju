/**
 * Exact counting helpers for the permutations & combinations tool.
 *
 * Every result is a BigInt. C(2000, 1000) already has 600 digits and 2000! has
 * 5736, so a double would silently drop the tail of exactly the answers people
 * paste into a report. Inputs are capped instead (MAX_N / MAX_DP_N): one
 * keystroke must never start a multi-second loop inside a render pass.
 */

import { codedError } from "./errors";

export type CountId =
  | "permutation"
  | "combination"
  | "permutationRepeat"
  | "combinationRepeat"
  | "factorial"
  | "derangement"
  | "catalan"
  | "stirling"
  | "bell";

/** Largest n accepted by the single-loop routines */
export const MAX_N = 2000;
/** Largest n for the O(n²) Stirling table, which allocates a row at every step */
export const MAX_DP_N = 200;

function countInt(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw codedError("comb.notInteger", label);
  return value;
}

function countN(value: number, limit = MAX_N): number {
  const n = countInt(value, "n");
  if (n > limit) throw codedError("comb.tooLarge", limit);
  return n;
}

export function factorial(n: number): bigint {
  const top = countN(n);
  let out = 1n;
  for (let i = 2; i <= top; i += 1) out *= BigInt(i);
  return out;
}

export function permutation(n: number, k: number): bigint {
  const top = countN(n);
  const pick = countInt(k, "k");
  if (pick > top) throw codedError("comb.kRange");
  let out = 1n;
  for (let i = 0; i < pick; i += 1) out *= BigInt(top - i);
  return out;
}

/**
 * Multiplicative form of n pick k: every division is exact at that point, so
 * the intermediate stays small and no cancellation pass is needed.
 */
function binomial(top: number, pick: number): bigint {
  const kk = Math.min(pick, top - pick);
  let out = 1n;
  for (let i = 1; i <= kk; i += 1) out = (out * BigInt(top - kk + i)) / BigInt(i);
  return out;
}

export function combination(n: number, k: number): bigint {
  const top = countN(n);
  const pick = countInt(k, "k");
  if (pick > top) throw codedError("comb.kRange");
  return binomial(top, pick);
}

/** n^k: order matters and items may repeat, so this is plain exponentiation */
export function permutationWithRepetition(n: number, k: number): bigint {
  const base = countN(n);
  const power = countN(k);
  return BigInt(base) ** BigInt(power);
}

/** Stars and bars: C(n + k − 1, k). No ways at all when there are no boxes. */
export function combinationWithRepetition(n: number, k: number): bigint {
  const boxes = countN(n);
  const pick = countN(k);
  if (boxes === 0) return pick === 0 ? 1n : 0n;
  return binomial(boxes + pick - 1, pick);
}

/** Nothing in its own place: D(n) = (n − 1)(D(n − 1) + D(n − 2)) */
export function derangement(n: number): bigint {
  const top = countN(n);
  if (top === 0) return 1n;
  let prev = 1n; // D(0)
  let current = 0n; // D(1)
  for (let i = 2; i <= top; i += 1) {
    const next = BigInt(i - 1) * (prev + current);
    prev = current;
    current = next;
  }
  return current;
}

export function catalan(n: number): bigint {
  const top = countN(n);
  return binomial(2 * top, top) / BigInt(top + 1);
}

/** One row of Stirling numbers of the second kind: S(n, 0..n) */
function stirlingRow(n: number): bigint[] {
  let row: bigint[] = [1n];
  for (let i = 1; i <= n; i += 1) {
    const next: bigint[] = new Array<bigint>(i + 1).fill(0n);
    for (let j = 1; j <= i; j += 1) {
      next[j] = (row[j] ?? 0n) * BigInt(j) + (row[j - 1] ?? 0n);
    }
    row = next;
  }
  return row;
}

/**
 * Ways to split n distinct items into exactly k non-empty groups. A k outside
 * 0..n is a legitimate zero rather than an input error, so it returns 0n.
 */
export function stirlingSecond(n: number, k: number): bigint {
  const top = countN(n, MAX_DP_N);
  const parts = countInt(k, "k");
  if (parts > top) return 0n;
  return stirlingRow(top)[parts] ?? 0n;
}

export function bell(n: number): bigint {
  const top = countN(n, MAX_DP_N);
  return stirlingRow(top).reduce((sum, value) => sum + value, 0n);
}

/** Digits in the decimal representation, counting the sign as free */
export function digitCount(value: bigint): number {
  const text = value < 0n ? (-value).toString() : value.toString();
  return text.length;
}

/** 1234567 → "1,234,567" */
export function groupDigits(value: bigint): string {
  const negative = value < 0n;
  const text = (negative ? -value : value).toString();
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    if (i > 0 && (text.length - i) % 3 === 0) out += ",";
    out += text[i];
  }
  return negative ? `-${out}` : out;
}

/**
 * Six significant digits plus a base-10 exponent, for values whose full form
 * would be thousands of characters. Trailing zeros in the mantissa are dropped
 * so 1e+21 stays readable.
 */
export function scientific(value: bigint, digits = 6): string {
  const negative = value < 0n;
  const text = (negative ? -value : value).toString();
  const exponent = text.length - 1;
  const fraction = text.slice(1, digits).replace(/0+$/, "");
  const mantissa = fraction ? `${text[0]}.${fraction}` : text[0];
  return `${negative ? "-" : ""}${mantissa}e+${exponent}`;
}

/**
 * Exact digits up to `maxDigits`, scientific notation beyond it — a 5736-digit
 * factorial inside a table row is noise, not information.
 */
export function formatCount(value: bigint, maxDigits = 24): string {
  return digitCount(value) <= maxDigits ? groupDigits(value) : scientific(value);
}

/** Notation used as the left-hand side, e.g. `C(10, 3)` */
export function callOf(id: CountId, n: number, k: number): string {
  switch (id) {
    case "permutation":
      return `P(${n}, ${k})`;
    case "combination":
      return `C(${n}, ${k})`;
    case "permutationRepeat":
      return `${n}^${k}`;
    case "combinationRepeat":
      return `C(${n} + ${k} - 1, ${k})`;
    case "factorial":
      return `${n}!`;
    case "derangement":
      return `!${n}`;
    case "catalan":
      return `C(${2 * n}, ${n}) / ${n + 1}`;
    case "stirling":
      return `S(${n}, ${k})`;
    case "bell":
      return `B(${n})`;
  }
}

/** The symbolic formula behind each count — notation, so it needs no locale */
export function formulaOf(id: CountId): string {
  switch (id) {
    case "permutation":
      return "n! / (n − k)!";
    case "combination":
      return "n! / (k! × (n − k)!)";
    case "permutationRepeat":
      return "n^k";
    case "combinationRepeat":
      return "C(n + k − 1, k)";
    case "factorial":
      return "n!";
    case "derangement":
      return "!n = (n − 1)(!(n − 1) + !(n − 2))";
    case "catalan":
      return "C(2n, n) / (n + 1)";
    case "stirling":
      return "S(n, k) = k × S(n − 1, k) + S(n − 1, k − 1)";
    case "bell":
      return "B(n) = S(n, 0) + S(n, 1) + … + S(n, n)";
  }
}

/** The operations that read k as well as n */
const K_OPS: CountId[] = [
  "permutation",
  "combination",
  "permutationRepeat",
  "combinationRepeat",
  "stirling",
];

export function needsK(id: CountId): boolean {
  return K_OPS.includes(id);
}
