/**
 * Cost math for LLM API usage. Prices are supplied by the user — nothing here
 * assumes a vendor rate card, so the numbers stay correct when pricing changes.
 */

export type Currency = "USD" | "CNY";

export interface LlmRates {
  /** Price per 1M input tokens */
  inputPrice: number;
  /** Price per 1M output tokens */
  outputPrice: number;
}

export interface LlmUsage {
  /** Input tokens per request */
  inputTokens: number;
  /** Output tokens per request */
  outputTokens: number;
  /** How many requests to price */
  requests: number;
}

export interface LlmCost {
  input: number;
  output: number;
  perRequest: number;
  total: number;
}

const MILLION = 1_000_000;

function positive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function llmCost(rates: LlmRates, usage: LlmUsage): LlmCost {
  const input = (positive(rates.inputPrice) * positive(usage.inputTokens)) / MILLION;
  const output = (positive(rates.outputPrice) * positive(usage.outputTokens)) / MILLION;
  const perRequest = input + output;
  return { input, output, perRequest, total: perRequest * positive(usage.requests) };
}

/** How many requests a budget covers; Infinity when a request is free */
export function requestsForBudget(budget: number, perRequest: number): number {
  if (!Number.isFinite(perRequest) || perRequest <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor(positive(budget) / perRequest);
}

/**
 * Small amounts need more decimals than large ones: $0.000015 is meaningless
 * once rounded to two places, while $1,234.56 does not need six.
 */
export function moneyDecimals(value: number): number {
  const abs = Math.abs(value);
  if (abs === 0) return 2;
  if (abs < 0.01) return 6;
  if (abs < 1) return 4;
  return 2;
}

export function formatMoney(value: number, currency: Currency, locale: string): string {
  if (!Number.isFinite(value)) return "—";
  const symbol = currency === "USD" ? "$" : "¥";
  const digits = moneyDecimals(value);
  return `${symbol}${value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })}`;
}

export function formatCount(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "∞";
  return Math.floor(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
}

/** Parse a user-typed number, tolerating thousands separators and spaces */
export function parseNumber(input: string): number {
  const cleaned = input.replace(/[\s,_]/g, "");
  if (cleaned === "") return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}
