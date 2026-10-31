/**
 * Luhn (mod 10) validation for payment card numbers plus issuer detection from
 * the leading IIN digits. Everything here is structural: a number that passes
 * may still not correspond to any real account.
 */

export type BrandId =
  | "visa"
  | "mastercard"
  | "amex"
  | "unionpay"
  | "jcb"
  | "discover"
  | "diners"
  | "maestro"
  | "mir"
  | "unknown";

export interface CardBrand {
  id: BrandId;
  /** Accepted total lengths, shortest first */
  lengths: number[];
  test: (digits: string) => boolean;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, index) => from + index);

/** Lengths accepted when the issuer is not recognised */
export const UNKNOWN_LENGTHS = range(12, 19);

/**
 * Ordered so that narrower ranges win: UnionPay claims the 62-prefix before
 * Discover's 622126–622925 block, and Maestro is checked before Mastercard.
 */
export const CARD_BRANDS: CardBrand[] = [
  { id: "visa", lengths: [13, 16, 19], test: (d) => d.startsWith("4") },
  { id: "amex", lengths: [15], test: (d) => /^3[47]/.test(d) },
  { id: "diners", lengths: [14, 16, 19], test: (d) => /^3(0[0-5]|[68])/.test(d) },
  { id: "jcb", lengths: [16, 17, 18, 19], test: (d) => /^35(2[89]|[3-8])/.test(d) },
  { id: "unionpay", lengths: [16, 17, 18, 19], test: (d) => d.startsWith("62") },
  {
    id: "maestro",
    lengths: range(12, 19),
    test: (d) => /^(5018|5020|5038|5893|6304|6759|676[1-3])/.test(d),
  },
  {
    id: "mastercard",
    lengths: [16],
    test: (d) => /^5[1-5]/.test(d) || (d.length >= 4 && Number(d.slice(0, 4)) >= 2221 && Number(d.slice(0, 4)) <= 2720),
  },
  { id: "mir", lengths: [16, 19], test: (d) => /^220[0-4]/.test(d) },
  {
    id: "discover",
    lengths: [16, 19],
    test: (d) => /^(6011|65|64[4-9])/.test(d),
  },
];

export const UNKNOWN_BRAND: CardBrand = {
  id: "unknown",
  lengths: UNKNOWN_LENGTHS,
  test: () => true,
};

export function detectBrand(digits: string): CardBrand {
  if (digits === "") return UNKNOWN_BRAND;
  return CARD_BRANDS.find((brand) => brand.test(digits)) ?? UNKNOWN_BRAND;
}

/** Strip separators, normalise full-width digits and report anything else */
export function normalizeCard(input: string): { digits: string; invalidChars: string[] } {
  const digits: string[] = [];
  const invalid = new Set<string>();

  for (const char of input.normalize("NFKC")) {
    if (char >= "0" && char <= "9") digits.push(char);
    else if (/[\s-]/.test(char)) continue;
    else invalid.add(char);
  }

  return { digits: digits.join(""), invalidChars: Array.from(invalid) };
}

export interface LuhnStep {
  digit: number;
  /** Index counted from the right, 0 being the check digit */
  position: number;
  doubled: boolean;
  /** Digit after doubling and subtracting 9 when needed */
  value: number;
}

/**
 * Per-digit breakdown, returned left to right so it reads like the number.
 * The check digit (rightmost) is never doubled.
 */
export function luhnSteps(digits: string): LuhnStep[] {
  const length = digits.length;
  return Array.from(digits, (char, index) => {
    const position = length - 1 - index;
    const digit = Number(char);
    const doubled = position % 2 === 1;
    const value = doubled ? (digit * 2 > 9 ? digit * 2 - 9 : digit * 2) : digit;
    return { digit, position, doubled, value };
  });
}

export function luhnSum(digits: string): number {
  return luhnSteps(digits).reduce((total, step) => total + step.value, 0);
}

export function luhnCheck(digits: string): boolean {
  if (!/^\d{2,}$/.test(digits)) return false;
  return luhnSum(digits) % 10 === 0;
}

/** Digit to append to `payload` so the whole number passes Luhn */
export function luhnCheckDigit(payload: string): number {
  const sum = luhnSum(`${payload}0`);
  return (10 - (sum % 10)) % 10;
}

/** Group digits the way the issuer prints them (Amex 4-6-5, Diners 4-6-4) */
export function formatCard(digits: string, brand: BrandId = "unknown"): string {
  const groups =
    brand === "amex"
      ? [4, 6, 5]
      : brand === "diners" && digits.length === 14
        ? [4, 6, 4]
        : null;

  if (!groups) return digits.replace(/(.{4})/g, "$1 ").trim();

  const parts: string[] = [];
  let offset = 0;
  for (const size of groups) {
    parts.push(digits.slice(offset, offset + size));
    offset += size;
  }
  if (offset < digits.length) parts.push(digits.slice(offset));
  return parts.filter(Boolean).join(" ");
}

export interface CardAnalysis {
  digits: string;
  formatted: string;
  brand: BrandId;
  /** Lengths accepted by the detected issuer */
  lengths: number[];
  lengthOk: boolean;
  /** Fewer digits than the shortest accepted length */
  tooShort: boolean;
  luhnOk: boolean;
  valid: boolean;
  invalidChars: string[];
  /** Check digit as entered (rightmost) */
  actualCheckDigit: number | null;
  /** Check digit the rest of the number implies */
  expectedCheckDigit: number | null;
  bin: string;
  last4: string;
  steps: LuhnStep[];
  sum: number;
}

export function analyzeCard(input: string): CardAnalysis {
  const { digits, invalidChars } = normalizeCard(input);
  const brand = detectBrand(digits);
  const steps = luhnSteps(digits);
  const sum = steps.reduce((total, step) => total + step.value, 0);
  const luhnOk = luhnCheck(digits);
  const lengthOk = brand.lengths.includes(digits.length);

  return {
    digits,
    formatted: formatCard(digits, brand.id),
    brand: brand.id,
    lengths: brand.lengths,
    lengthOk,
    tooShort: digits.length > 0 && digits.length < Math.min(...brand.lengths),
    luhnOk,
    valid: luhnOk && lengthOk,
    invalidChars,
    actualCheckDigit: digits.length > 0 ? Number(digits.slice(-1)) : null,
    expectedCheckDigit: digits.length >= 2 ? luhnCheckDigit(digits.slice(0, -1)) : null,
    bin: digits.slice(0, Math.min(6, digits.length)),
    last4: digits.slice(-4),
    steps,
    sum,
  };
}
