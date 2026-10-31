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
      signal: AbortSignal.timeout(8000),
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

const API = "https://api.frankfurter.dev/v2/rate";
const CACHE_TTL = 6 * 60 * 60 * 1000;
const STORAGE_PREFIX = "gongju:fx:";

const memory = new Map<string, { quote: RateQuote; at: number }>();

function cacheKey(base: string, quote: string) {
  return `${base.toUpperCase()}:${quote.toUpperCase()}`;
}

function readCache(key: string): RateQuote | null {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.quote;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { quote: RateQuote; at: number };
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    memory.set(key, parsed);
    return parsed.quote;
  } catch {
    return null;
  }
}

function writeCache(key: string, quote: RateQuote) {
  const entry = { quote, at: Date.now() };
  memory.set(key, entry);
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Private mode and a full quota both land here; the memory cache still works
  }
}

/**
 * Latest published rate for a pair. Same-currency pairs short-circuit to 1.
 * `force` skips the cache when the user asks for a refresh.
 */
export async function fetchRate(base: string, quote: string, force = false): Promise<RateQuote> {
  const from = base.toUpperCase();
  const to = quote.toUpperCase();
  if (from === to) return { date: "", base: from, quote: to, rate: 1 };

  const key = cacheKey(from, to);
  if (!force) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  let response: Response;
  try {
    response = await fetch(`${API}/${from.toLowerCase()}/${to.toLowerCase()}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw codedError("currency.unreachable");
  }
  if (!response.ok) throw codedError("currency.unreachable");

  let data: RateQuote;
  try {
    data = (await response.json()) as RateQuote;
  } catch {
    throw codedError("currency.unreachable");
  }
  if (typeof data?.rate !== "number" || !Number.isFinite(data.rate)) {
    throw codedError("currency.unreachable");
  }

  writeCache(key, data);
  return data;
}
