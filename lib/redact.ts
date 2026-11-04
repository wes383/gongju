/**
 * Detection and redaction of common personal identifiers.
 *
 * Everything is regex plus a checksum, so results are a best-effort assist and
 * never a guarantee: the UI says so. Patterns are evaluated with lookarounds
 * instead of word boundaries because Chinese text has no spaces around numbers.
 */

import type { Locale } from "./i18n";

export type SensitiveKind = "phone" | "idcard" | "ssn" | "email" | "bankcard" | "ipv4";
export type RedactMode = "mask" | "replace" | "keep-format";

export interface SensitiveMatch {
  kind: SensitiveKind;
  /** Offsets into the original text, end exclusive */
  start: number;
  end: number;
  value: string;
}

export interface RedactOptions {
  mode: RedactMode;
  kinds: SensitiveKind[];
  locale: Locale;
}

export const SENSITIVE_KINDS: { value: SensitiveKind; zh: string; en: string }[] = [
  { value: "phone", zh: "手机号", en: "Phone" },
  { value: "idcard", zh: "身份证号", en: "ID number" },
  { value: "ssn", zh: "SSN", en: "SSN" },
  { value: "bankcard", zh: "银行卡号", en: "Bank card" },
  { value: "email", zh: "邮箱", en: "Email" },
  { value: "ipv4", zh: "IPv4 地址", en: "IPv4" },
];

export const ALL_KINDS: SensitiveKind[] = SENSITIVE_KINDS.map((kind) => kind.value);

const LABELS: Record<Locale, Record<SensitiveKind, string>> = {
  zh: {
    phone: "[手机号]",
    idcard: "[身份证号]",
    ssn: "[SSN]",
    bankcard: "[银行卡号]",
    email: "[邮箱]",
    ipv4: "[IP 地址]",
  },
  en: {
    phone: "[PHONE]",
    idcard: "[ID]",
    ssn: "[SSN]",
    bankcard: "[CARD]",
    email: "[EMAIL]",
    ipv4: "[IP]",
  },
};

// Mainland mobile numbers, plus North American numbers. NANP numbers only match
// when they keep their separators, otherwise any 10-digit run would qualify.
const PHONE =
  /(?<![\d+])(?:(?:\+?86[-\s]?)?1[3-9]\d{9}|(?:\+?1[-\s.]?)?(?:\(\d{3}\)[-\s.]?|\d{3}[-\s.])\d{3}[-\s.]\d{4})(?!\d)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const ID_CARD = /(?<![\dA-Za-z])(?:\d{17}[\dXx]|\d{15})(?![\dA-Za-z])/g;
// US social security numbers are written with dashes; requiring them keeps
// invoice and order numbers out of the results.
const SSN = /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/g;
const BANK_CARD = /(?<!\d)(?:\d[ -]?){15,18}\d(?!\d)/g;
const IPV4 =
  /(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?![\d.])/g;

/** GB 11643 check digit: weighted sum mod 11 mapped through a fixed table. */
export function isValidIdCard(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length === 15) return /^\d{15}$/.test(normalized);
  if (!/^\d{17}[\dXx]$/.test(normalized)) return false;

  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = "10X98765432";
  let sum = 0;
  for (let i = 0; i < 17; i += 1) sum += Number(normalized[i]) * weights[i];
  return checks[sum % 11] === normalized[17].toUpperCase();
}

/**
 * US SSN rules: area 001–899 except 666, group not 00, serial not 0000.
 * Area 900 and above is reserved, so those are rejected as well.
 */
export function isValidSsn(value: string): boolean {
  const match = /^(\d{3})-(\d{2})-(\d{4})$/.exec(value.trim());
  if (!match) return false;
  const area = Number(match[1]);
  const group = Number(match[2]);
  const serial = Number(match[3]);
  return area >= 1 && area <= 899 && area !== 666 && group !== 0 && serial !== 0;
}

/** Luhn checksum, which keeps random 16-digit runs out of the results. */
export function isValidBankCard(value: string): boolean {
  const digits = value.replace(/[ -]/g, "");
  if (!/^\d{16,19}$/.test(digits)) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

const PRIORITY: Record<SensitiveKind, number> = {
  idcard: 5,
  ssn: 5,
  bankcard: 4,
  phone: 3,
  email: 2,
  ipv4: 1,
};

function collect(text: string, pattern: RegExp, kind: SensitiveKind, accept?: (v: string) => boolean) {
  const found: SensitiveMatch[] = [];
  pattern.lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    if (!value || match.index === undefined) continue;
    if (accept && !accept(value)) continue;
    found.push({ kind, start: match.index, end: match.index + value.length, value });
  }
  return found;
}

/**
 * Find every candidate, then keep the most specific one where ranges overlap:
 * an 18-digit ID number also matches the bank-card pattern.
 */
export function findSensitive(text: string, kinds: SensitiveKind[] = ALL_KINDS): SensitiveMatch[] {
  if (!text) return [];
  const wanted = new Set(kinds);
  const candidates: SensitiveMatch[] = [];

  if (wanted.has("idcard")) candidates.push(...collect(text, ID_CARD, "idcard", isValidIdCard));
  if (wanted.has("ssn")) candidates.push(...collect(text, SSN, "ssn", isValidSsn));
  if (wanted.has("bankcard")) {
    candidates.push(...collect(text, BANK_CARD, "bankcard", isValidBankCard));
  }
  if (wanted.has("phone")) candidates.push(...collect(text, PHONE, "phone"));
  if (wanted.has("email")) candidates.push(...collect(text, EMAIL, "email"));
  if (wanted.has("ipv4")) candidates.push(...collect(text, IPV4, "ipv4"));

  candidates.sort(
    (a, b) =>
      PRIORITY[b.kind] - PRIORITY[a.kind] ||
      a.start - b.start ||
      b.end - b.start - (a.end - a.start)
  );

  const accepted: SensitiveMatch[] = [];
  for (const candidate of candidates) {
    if (accepted.some((other) => candidate.start < other.end && other.start < candidate.end)) continue;
    accepted.push(candidate);
  }

  return accepted.sort((a, b) => a.start - b.start);
}

/** Keep the first and last `tail` digits, star out everything in between. */
function maskDigits(value: string, keepHead: number, keepTail: number): string {
  const positions: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    if (/\d/.test(value[i])) positions.push(i);
  }
  const chars = value.split("");
  positions.forEach((position, index) => {
    if (index >= keepHead && index < positions.length - keepTail) chars[position] = "*";
  });
  return chars.join("");
}

function maskEmail(value: string): string {
  const at = value.lastIndexOf("@");
  if (at <= 0) return "*".repeat(value.length);
  return `${value[0]}***${value.slice(at)}`;
}

function maskIpv4(value: string): string {
  const parts = value.split(".");
  if (parts.length !== 4) return "*".repeat(value.length);
  return `${parts[0]}.${parts[1]}.*.*`;
}

/** Partial masking: enough of the original shape stays to recognise the value. */
export function maskValue(value: string, kind: SensitiveKind): string {
  switch (kind) {
    case "phone":
      return maskDigits(value, 3, 4);
    case "idcard":
      return maskDigits(value, 6, 4);
    case "ssn":
      return maskDigits(value, 0, 4);
    case "bankcard":
      return maskDigits(value, 0, 4);
    case "email":
      return maskEmail(value);
    case "ipv4":
      return maskIpv4(value);
  }
}

/** Overwrite every letter and digit but keep separators, so the layout survives. */
function keepFormat(value: string): string {
  return value.replace(/[0-9A-Za-z]/g, "*");
}

function replacementFor(match: SensitiveMatch, options: RedactOptions): string {
  switch (options.mode) {
    case "mask":
      return maskValue(match.value, match.kind);
    case "keep-format":
      return keepFormat(match.value);
    case "replace":
      return LABELS[options.locale][match.kind];
  }
}

export function redactText(
  text: string,
  options: RedactOptions
): { text: string; matches: SensitiveMatch[] } {
  const matches = findSensitive(text, options.kinds);
  if (matches.length === 0) return { text, matches };

  // Replace from the end so earlier offsets stay valid
  let output = text;
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const match = matches[i];
    output = output.slice(0, match.start) + replacementFor(match, options) + output.slice(match.end);
  }
  return { text: output, matches };
}

/** Count per kind, in the canonical order used by the UI. */
export function countByKind(
  matches: SensitiveMatch[],
  kinds: SensitiveKind[] = ALL_KINDS
): { kind: SensitiveKind; count: number }[] {
  return kinds.map((kind) => ({
    kind,
    count: matches.filter((match) => match.kind === kind).length,
  }));
}
