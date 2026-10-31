/**
 * Exchange rates from Frankfurter (https://frankfurter.dev).
 *
 * The API is keyless and sends `access-control-allow-origin: *`, so the browser
 * can call it directly — no proxy, nothing of the user's is uploaded. Rates come
 * from central banks, are quoted once per working day, and are cached locally so
 * toggling currencies does not hammer the endpoint.
 */
import { codedError } from "./errors";

export interface Currency {
  code: string;
  symbol: string;
  zh: string;
  en: string;
}

/** Curated set: the currencies people actually convert between */
export const CURRENCIES: Currency[] = [
  { code: "USD", symbol: "$", zh: "美元", en: "US Dollar" },
  { code: "CNY", symbol: "¥", zh: "人民币", en: "Chinese Yuan" },
  { code: "EUR", symbol: "€", zh: "欧元", en: "Euro" },
  { code: "JPY", symbol: "¥", zh: "日元", en: "Japanese Yen" },
  { code: "GBP", symbol: "£", zh: "英镑", en: "British Pound" },
  { code: "HKD", symbol: "HK$", zh: "港币", en: "Hong Kong Dollar" },
  { code: "TWD", symbol: "NT$", zh: "新台币", en: "New Taiwan Dollar" },
  { code: "KRW", symbol: "₩", zh: "韩元", en: "South Korean Won" },
  { code: "SGD", symbol: "S$", zh: "新加坡元", en: "Singapore Dollar" },
  { code: "AUD", symbol: "A$", zh: "澳元", en: "Australian Dollar" },
  { code: "CAD", symbol: "C$", zh: "加元", en: "Canadian Dollar" },
  { code: "NZD", symbol: "NZ$", zh: "新西兰元", en: "New Zealand Dollar" },
  { code: "CHF", symbol: "CHF", zh: "瑞士法郎", en: "Swiss Franc" },
  { code: "THB", symbol: "฿", zh: "泰铢", en: "Thai Baht" },
  { code: "MYR", symbol: "RM", zh: "马来西亚林吉特", en: "Malaysian Ringgit" },
  { code: "IDR", symbol: "Rp", zh: "印尼盾", en: "Indonesian Rupiah" },
  { code: "PHP", symbol: "₱", zh: "菲律宾比索", en: "Philippine Peso" },
  { code: "VND", symbol: "₫", zh: "越南盾", en: "Vietnamese Dong" },
  { code: "INR", symbol: "₹", zh: "印度卢比", en: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", zh: "阿联酋迪拉姆", en: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", zh: "沙特里亚尔", en: "Saudi Riyal" },
  { code: "TRY", symbol: "₺", zh: "土耳其里拉", en: "Turkish Lira" },
  { code: "RUB", symbol: "₽", zh: "俄罗斯卢布", en: "Russian Ruble" },
  { code: "BRL", symbol: "R$", zh: "巴西雷亚尔", en: "Brazilian Real" },
  { code: "MXN", symbol: "MX$", zh: "墨西哥比索", en: "Mexican Peso" },
  { code: "ZAR", symbol: "R", zh: "南非兰特", en: "South African Rand" },
  { code: "SEK", symbol: "kr", zh: "瑞典克朗", en: "Swedish Krona" },
  { code: "NOK", symbol: "kr", zh: "挪威克朗", en: "Norwegian Krone" },
  { code: "DKK", symbol: "kr", zh: "丹麦克朗", en: "Danish Krone" },
  { code: "PLN", symbol: "zł", zh: "波兰兹罗提", en: "Polish Zloty" },
  { code: "CZK", symbol: "Kč", zh: "捷克克朗", en: "Czech Koruna" },
  { code: "HUF", symbol: "Ft", zh: "匈牙利福林", en: "Hungarian Forint" },
  { code: "ILS", symbol: "₪", zh: "以色列新谢克尔", en: "Israeli New Shekel" },
  { code: "EGP", symbol: "E£", zh: "埃及镑", en: "Egyptian Pound" },
  { code: "NGN", symbol: "₦", zh: "尼日利亚奈拉", en: "Nigerian Naira" },
  { code: "ARS", symbol: "AR$", zh: "阿根廷比索", en: "Argentine Peso" },
  { code: "MOP", symbol: "MOP$", zh: "澳门元", en: "Macanese Pataca" },
  { code: "KWD", symbol: "KD", zh: "科威特第纳尔", en: "Kuwaiti Dinar" },
  { code: "QAR", symbol: "QR", zh: "卡塔尔里亚尔", en: "Qatari Riyal" },
  { code: "PKR", symbol: "₨", zh: "巴基斯坦卢比", en: "Pakistani Rupee" },
  { code: "BDT", symbol: "৳", zh: "孟加拉塔卡", en: "Bangladeshi Taka" },
  { code: "LKR", symbol: "₨", zh: "斯里兰卡卢比", en: "Sri Lankan Rupee" },
];

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
