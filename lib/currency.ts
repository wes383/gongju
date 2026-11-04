/**
 * Exchange rates from Frankfurter (https://frankfurter.dev).
 *
 * The API is keyless and sends `access-control-allow-origin: *`, so the browser
 * can call it directly — no proxy, nothing of the user's is uploaded. Rates come
 * from central banks, are quoted once per working day, and are cached locally so
 * toggling currencies does not hammer the endpoint.
 *
 * Names and symbols are not hand-written: `Intl.DisplayNames` already ships the
 * CLDR currency list, so a new code gets a localized name for free. Only the
 * codes Intl knows nothing about (crypto) carry a small table of their own.
 */
import { codedError } from "./errors";
import type { Locale } from "./i18n";

export interface Currency {
  code: string;
  /** Localized name, resolved through Intl at read time */
  name: string;
  /** Narrow symbol, or the code itself when Intl has no glyph for it */
  symbol: string;
}

/**
 * Every code the rate source lists, captured on 2026-10-31. Baked in so the
 * picker is complete on first paint; `refreshCodes` widens it when the source
 * adds a currency (it gained CNH and XCG, and dropped BGN and HRK, in 2026).
 */
export const CURRENCY_CODES: string[] = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD",
  "BCH", "BDT", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTC", "BTN", "BWP",
  "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CMD", "CNH", "CNY", "COP", "CRC", "CUP",
  "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "ETH", "EUR", "FJD",
  "FKP", "GBP", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL",
  "HTG", "HUF", "IDR", "ILS", "IMP", "INR", "IQD", "IRR", "ISK", "JEP", "JMD", "JOD",
  "JPY", "KES", "KGS", "KHR", "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP",
  "LKR", "LRD", "LSL", "LTC", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP",
  "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR",
  "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD",
  "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SOS", "SRD",
  "SSP", "STN", "SVC", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD",
  "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF",
  "XAG", "XAU", "XCD", "XCG", "XDR", "XOF", "XPD", "XPF", "XPT", "XRP", "YER", "ZAR",
  "ZMW", "ZWG",
];

/** Crypto: not in CLDR, so Intl would only echo the code back */
const EXTRA_NAMES: Record<string, Record<Locale, string>> = {
  BCH: { zh: "比特现金", en: "Bitcoin Cash" },
  BTC: { zh: "比特币", en: "Bitcoin" },
  ETH: { zh: "以太坊", en: "Ethereum" },
  LTC: { zh: "莱特币", en: "Litecoin" },
  XRP: { zh: "瑞波币", en: "Ripple" },
};

const INTL_LOCALE: Record<Locale, string> = { zh: "zh-CN", en: "en-US" };

const nameCache = new Map<Locale, Intl.DisplayNames>();

function displayNames(locale: Locale): Intl.DisplayNames {
  let names = nameCache.get(locale);
  if (!names) {
    names = new Intl.DisplayNames([INTL_LOCALE[locale]], { type: "currency" });
    nameCache.set(locale, names);
  }
  return names;
}

/** Localized currency name; falls back to the code when Intl has none */
export function currencyName(code: string, locale: Locale): string {
  const extra = EXTRA_NAMES[code];
  if (extra) return extra[locale];
  try {
    return displayNames(locale).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Narrow symbol (`$` rather than `US$`); the code itself when there is none */
export function currencySymbol(code: string, locale: Locale): string {
  try {
    const parts = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(1);
    return parts.find((part) => part.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

export function toCurrency(code: string, locale: Locale): Currency {
  return { code, name: currencyName(code, locale), symbol: currencySymbol(code, locale) };
}

/** Sorted, de-duplicated union of two code lists */
export function mergeCodes(...lists: string[][]): string[] {
  return [...new Set(lists.flat())].sort();
}

/* ══════════════════════════════════════════════════════════════
   Live code list
   ══════════════════════════════════════════════════════════════ */

const LIST_API = "https://api.frankfurter.dev/v2/currencies";
const LIST_TTL = 24 * 60 * 60 * 1000;
const LIST_KEY = "gongju:fx:codes";

/**
 * The source's current code list, cached for a day. Returns null on any
 * failure — the baked-in list is already complete enough to work with, so a
 * refresh that cannot reach the network is not worth an error message.
 */
export async function refreshCodes(): Promise<string[] | null> {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as { codes?: unknown; at?: number };
      if (Array.isArray(cached.codes) && Date.now() - (cached.at ?? 0) < LIST_TTL) {
        return cached.codes as string[];
      }
    }
  } catch {
    // Private mode, corrupt entry: both fall through to the network
  }

  let rows: { iso_code?: unknown }[];
  try {
    const response = await fetch(LIST_API, {
      headers: { accept: "application/json" },
      signal: timeoutSignal(8000),
    });
    if (!response.ok) return null;
    rows = (await response.json()) as { iso_code?: unknown }[];
  } catch {
    return null;
  }

  const codes = rows
    .map((row) => row.iso_code)
    .filter((code): code is string => typeof code === "string" && /^[A-Z]{3}$/.test(code));
  if (codes.length === 0) return null;

  try {
    localStorage.setItem(LIST_KEY, JSON.stringify({ codes, at: Date.now() }));
  } catch {
    // Quota exhausted: the list is still returned, only the cache is skipped
  }
  return codes;
}

/* ══════════════════════════════════════════════════════════════
   Rates
   ══════════════════════════════════════════════════════════════ */

export interface RateQuote {
  /** Publication date reported by the API, YYYY-MM-DD */
  date: string;
  base: string;
  quote: string;
  rate: number;
}

export type RateSourceId = "frankfurter" | "currency-api" | "er-api";

/** Proper nouns: a source keeps its own name in both locales */
export const RATE_SOURCE_NAMES: Record<RateSourceId, string> = {
  frankfurter: "Frankfurter",
  "currency-api": "Currency API",
  "er-api": "ExchangeRate-API",
};

export const RATE_SOURCE_URLS: Record<RateSourceId, string> = {
  frankfurter: "https://frankfurter.dev",
  "currency-api": "https://github.com/fawazahmed0/exchange-api",
  "er-api": "https://www.exchangerate-api.com/docs/free",
};

export interface RateQuote {
  /** Publication date reported by the source, YYYY-MM-DD */
  date: string;
  base: string;
  quote: string;
  rate: number;
  /** Which service answered; absent for the identity pair */
  source?: RateSourceId;
  /** True when every source failed and this came from an expired cache */
  stale?: boolean;
}

const CACHE_TTL = 6 * 60 * 60 * 1000;
/** Oldest cached rate still worth showing when the network is gone */
const STALE_TTL = 30 * 24 * 60 * 60 * 1000;
const STORAGE_PREFIX = "gongju:fx:v2:";
const SOURCE_KEY = "gongju:fx:source";

interface CacheEntry {
  quote: RateQuote;
  at: number;
}

const memory = new Map<string, CacheEntry>();

function cacheKey(base: string, quote: string) {
  return `${base.toUpperCase()}:${quote.toUpperCase()}`;
}

function readEntry(key: string): CacheEntry | null {
  const hit = memory.get(key);
  if (hit) return hit;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CacheEntry>;
    if (typeof parsed?.at !== "number" || typeof parsed.quote?.rate !== "number") return null;
    const entry = parsed as CacheEntry;
    memory.set(key, entry);
    return entry;
  } catch {
    return null;
  }
}

function readFresh(key: string): RateQuote | null {
  const entry = readEntry(key);
  return entry && Date.now() - entry.at < CACHE_TTL ? entry.quote : null;
}

function writeCache(key: string, quote: RateQuote) {
  const entry: CacheEntry = { quote, at: Date.now() };
  memory.set(key, entry);
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Private mode and a full quota both land here; the memory cache still works
  }
}

/** `AbortSignal.timeout` is missing before Safari 16, so fall back to a controller */
function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(ms);
    }
  } catch {
    // Old implementation without the static: use the controller below
  }
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  } catch {
    return undefined;
  }
}

async function requestJson(url: string, ms: number): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: timeoutSignal(ms),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function positiveRate(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function isoDay(value: unknown): string {
  if (typeof value !== "string") return "";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value.slice(0, 10);
  return new Date(parsed).toISOString().slice(0, 10);
}

interface RateSource {
  id: RateSourceId;
  /** Milliseconds before we give up on this source and try the next */
  timeout: number;
  url: (base: string, quote: string) => string;
  parse: (data: unknown, base: string, quote: string) => RateQuote | null;
}

/**
 * Three independent services, tried in turn. Frankfurter carries central-bank
 * reference rates but sits behind one host; the CDN table covers crypto and
 * metals; the last one is a plain fiat table. Any of them is good enough to
 * convert money, so a single unreachable host must not break the tool.
 */
const SOURCES: RateSource[] = [
  {
    id: "frankfurter",
    timeout: 5000,
    url: (base, quote) =>
      `https://api.frankfurter.dev/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}`,
    parse: (data, base, quote) => {
      const root = record(data);
      const rate = positiveRate(root?.rate);
      if (!root || rate === null) return null;
      return { date: isoDay(root.date), base, quote, rate, source: "frankfurter" };
    },
  },
  {
    id: "currency-api",
    timeout: 6000,
    url: (base) =>
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.min.json`,
    parse: (data, base, quote) => {
      const root = record(data);
      const table = record(root?.[base.toLowerCase()]);
      const rate = positiveRate(table?.[quote.toLowerCase()]);
      if (!table || rate === null) return null;
      return { date: isoDay(root?.date), base, quote, rate, source: "currency-api" };
    },
  },
  {
    id: "er-api",
    timeout: 6000,
    url: (base) => `https://open.er-api.com/v6/latest/${base.toUpperCase()}`,
    parse: (data, base, quote) => {
      const root = record(data);
      if (root?.result !== "success") return null;
      const rate = positiveRate(record(root.rates)?.[quote.toUpperCase()]);
      if (rate === null) return null;
      return { date: isoDay(root.time_last_update_utc), base, quote, rate, source: "er-api" };
    },
  },
];

function isSourceId(value: unknown): value is RateSourceId {
  return value === "frankfurter" || value === "currency-api" || value === "er-api";
}

let preferredSource: RateSourceId | null | undefined;

function readPreferred(): RateSourceId | null {
  try {
    const raw = localStorage.getItem(SOURCE_KEY);
    return isSourceId(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Start with whichever service answered last: if one host is blocked on this
 * network, the next pair pays the timeout once rather than every time.
 */
function sourceOrder(): RateSource[] {
  if (preferredSource === undefined) preferredSource = readPreferred();
  const first = preferredSource ?? "frankfurter";
  return [
    SOURCES.find((source) => source.id === first)!,
    ...SOURCES.filter((source) => source.id !== first),
  ];
}

function rememberSource(id: RateSourceId) {
  preferredSource = id;
  try {
    localStorage.setItem(SOURCE_KEY, id);
  } catch {
    // A preference is a nicety, not state the tool depends on
  }
}

/** Walk the sources until one answers with a usable rate */
async function liveRate(base: string, quote: string): Promise<RateQuote> {
  let delivered = false;

  for (const source of sourceOrder()) {
    let data: unknown;
    try {
      data = await requestJson(source.url(base, quote), source.timeout);
    } catch {
      continue;
    }
    delivered = true;
    const parsed = source.parse(data, base, quote);
    if (parsed) {
      rememberSource(source.id);
      return parsed;
    }
  }

  // At least one service answered but none knows this pair, versus nothing
  // answered at all — the two cases need different advice.
  throw codedError(delivered ? "currency.unsupported" : "currency.unreachable");
}

/**
 * Latest rate for a pair. Same-currency pairs short-circuit to 1. `force`
 * skips the cache when the user asks for a refresh; if every source is down we
 * fall back to an expired cache entry and mark it stale rather than showing
 * nothing.
 */
export async function fetchRate(base: string, quote: string, force = false): Promise<RateQuote> {
  const from = base.toUpperCase();
  const to = quote.toUpperCase();
  if (from === to) return { date: "", base: from, quote: to, rate: 1 };

  const key = cacheKey(from, to);
  if (!force) {
    const cached = readFresh(key);
    if (cached) return cached;
  }

  try {
    const quote = await liveRate(from, to);
    writeCache(key, quote);
    return quote;
  } catch (error) {
    const entry = readEntry(key);
    if (entry && Date.now() - entry.at < STALE_TTL) return { ...entry.quote, stale: true };
    throw error;
  }
}
