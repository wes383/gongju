/**
 * 编码 / 解码核心算法。
 * 全部在浏览器端执行，不依赖任何服务端接口。
 */

/* ══════════════════════════════════════════════════════════════
   Base64
   ══════════════════════════════════════════════════════════════ */

const CHUNK = 0x8000;

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return binary;
}

export interface Base64Options {
  /** 使用 URL 安全字符集（+ → -, / → _，去掉尾部 =） */
  urlSafe?: boolean;
  /** 每 76 个字符换行（MIME 风格） */
  lineBreaks?: boolean;
}

export function encodeBase64(text: string, opts: Base64Options = {}): string {
  const bytes = new TextEncoder().encode(text);
  let out = btoa(bytesToBinary(bytes));
  if (opts.urlSafe) out = out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  if (opts.lineBreaks) out = out.replace(/(.{76})/g, "$1\n").trimEnd();
  return out;
}

export function decodeBase64(input: string): string {
  let s = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!s) return "";
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) {
    throw new Error("包含非法字符，这不是合法的 Base64 字符串");
  }
  const pad = s.length % 4;
  if (pad === 1) throw new Error("长度不合法（Base64 长度应为 4 的倍数）");
  if (pad) s += "=".repeat(4 - pad);

  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("解码成功但内容不是合法的 UTF-8 文本（可能是二进制数据）");
  }
}

/* ══════════════════════════════════════════════════════════════
   URL 编码
   ══════════════════════════════════════════════════════════════ */

export type UrlEncodeMode = "component" | "uri" | "form";

export function encodeUrl(text: string, mode: UrlEncodeMode): string {
  if (mode === "component") return encodeURIComponent(text);
  if (mode === "uri") return encodeURI(text);
  return encodeURIComponent(text).replace(/%20/g, "+");
}

export function decodeUrl(text: string, mode: UrlEncodeMode): string {
  const src = mode === "form" ? text.replace(/\+/g, " ") : text;
  try {
    return decodeURIComponent(src);
  } catch {
    // 容忍残缺的 % 序列：只解码合法的部分
    return src.replace(/(%[0-9A-Fa-f]{2})+/g, (m) => {
      try {
        return decodeURIComponent(m);
      } catch {
        return m;
      }
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   HTML 实体
   ══════════════════════════════════════════════════════════════ */

/** 常用命名实体（解码用；编码只产出最基础的 5 个） */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  ldquo: "“",
  rdquo: "”",
  lsquo: "‘",
  rsquo: "’",
  times: "×",
  divide: "÷",
  plusmn: "±",
  deg: "°",
  micro: "µ",
  para: "¶",
  sect: "§",
  middot: "·",
  bull: "•",
  dagger: "†",
  Dagger: "‡",
  permil: "‰",
  prime: "′",
  Prime: "″",
  larr: "←",
  rarr: "→",
  uarr: "↑",
  darr: "↓",
  harr: "↔",
  rArr: "⇒",
  lArr: "⇐",
  hArr: "⇔",
  infin: "∞",
  ne: "≠",
  le: "≤",
  ge: "≥",
  asymp: "≈",
  equiv: "≡",
  sum: "∑",
  prod: "∏",
  radic: "√",
  part: "∂",
  int: "∫",
  isin: "∈",
  notin: "∉",
  cap: "∩",
  cup: "∪",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  curren: "¤",
  sup2: "²",
  sup3: "³",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  iexcl: "¡",
  iquest: "¿",
  szlig: "ß",
  agrave: "à",
  aacute: "á",
  eacute: "é",
  egrave: "è",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  ntilde: "ñ",
  uuml: "ü",
  ouml: "ö",
  auml: "ä",
  ccedil: "ç",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  sigma: "σ",
  omega: "ω",
  Omega: "Ω",
  Delta: "Δ",
  ensp: "\u2002",
  emsp: "\u2003",
  thinsp: "\u2009",
  zwnj: "\u200c",
  zwj: "\u200d",
  shy: "\u00ad",
};

export interface HtmlEntityOptions {
  /** 同时把非 ASCII 字符转成数字实体 */
  encodeNonAscii?: boolean;
  /** 使用十六进制数字实体（默认十进制） */
  hex?: boolean;
}

export function encodeHtmlEntities(text: string, opts: HtmlEntityOptions = {}): string {
  let out = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  if (opts.encodeNonAscii) {
    out = out.replace(/[^\x00-\x7F]/g, (ch) => {
      const code = ch.codePointAt(0)!;
      return opts.hex ? `&#x${code.toString(16).toUpperCase()};` : `&#${code};`;
    });
  }
  return out;
}

export function decodeHtmlEntities(text: string): string {
  return text.replace(
    /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (match, body: string) => {
      if (body.startsWith("#")) {
        const isHex = body[1] === "x" || body[1] === "X";
        const code = parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return NAMED_ENTITIES[body] ?? match;
    }
  );
}

/* ══════════════════════════════════════════════════════════════
   Unicode 转义
   ══════════════════════════════════════════════════════════════ */

export type UnicodeFormat = "js" | "html" | "codepoint";

export interface UnicodeOptions {
  format: UnicodeFormat;
  /** 只转换 ASCII 之外的字符 */
  nonAsciiOnly?: boolean;
}

function toJsEscape(code: number): string {
  if (code <= 0xffff) return `\\u${code.toString(16).toUpperCase().padStart(4, "0")}`;
  // 补充平面：输出代理对
  const v = code - 0x10000;
  const hi = 0xd800 + (v >> 10);
  const lo = 0xdc00 + (v & 0x3ff);
  return `\\u${hi.toString(16).toUpperCase()}\\u${lo.toString(16).toUpperCase()}`;
}

export function textToUnicode(text: string, opts: UnicodeOptions): string {
  const { format, nonAsciiOnly } = opts;
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    const ascii = code < 0x80;
    if (nonAsciiOnly && ascii) {
      out += ch;
      continue;
    }
    if (format === "js") out += toJsEscape(code);
    else if (format === "html") out += `&#${code};`;
    else out += `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
  }
  return out;
}

export function unicodeToText(input: string): string {
  return input.replace(
    /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|&#(\d+);|&#[xX]([0-9a-fA-F]+);|U\+([0-9a-fA-F]{4,6})|0[xX]([0-9a-fA-F]{2,6})\b/g,
    (match, braced, js, dec, hexEnt, uplus, hexNum) => {
      const raw = braced ?? js ?? dec ?? hexEnt ?? uplus ?? hexNum;
      const base = dec !== undefined ? 10 : 16;
      const code = parseInt(raw, base);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
  );
}

/* ══════════════════════════════════════════════════════════════
   十六进制 ↔ 字符串
   ══════════════════════════════════════════════════════════════ */

export type HexSeparator = "none" | "space" | "comma" | "0x";

export function textToHex(
  text: string,
  opts: { upper?: boolean; separator?: HexSeparator } = {}
): string {
  const { upper = false, separator = "none" } = opts;
  const bytes = new TextEncoder().encode(text);
  const parts = Array.from(bytes, (b) => {
    const h = b.toString(16).padStart(2, "0");
    return upper ? h.toUpperCase() : h;
  });
  if (separator === "none") return parts.join("");
  if (separator === "space") return parts.join(" ");
  if (separator === "comma") return parts.join(",");
  return parts.map((p) => `0x${p}`).join(" ");
}

export function hexToText(input: string): string {
  const cleaned = input
    .replace(/0[xX]/g, "")
    .replace(/[^0-9a-fA-F]/g, "");
  if (!cleaned) return "";
  if (cleaned.length % 2 !== 0) {
    throw new Error("十六进制字符数为奇数，无法按字节解析（每个字节需要 2 个字符）");
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("字节序列不是合法的 UTF-8 文本（可能是二进制数据）");
  }
}

/* ══════════════════════════════════════════════════════════════
   进制转换（BigInt，支持大整数）
   ══════════════════════════════════════════════════════════════ */

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function parseInBase(value: string, base: number): bigint {
  if (base < 2 || base > 36) throw new Error("进制需在 2–36 之间");

  let body = value.trim().replace(/[\s_]/g, "");
  if (!body) throw new Error("请输入数值");

  const negative = body.startsWith("-");
  if (negative || body.startsWith("+")) body = body.slice(1);

  // 允许 0x / 0b / 0o 前缀（只在进制匹配时剥离）
  const lower = body.toLowerCase();
  if (base === 16 && lower.startsWith("0x")) body = body.slice(2);
  else if (base === 2 && lower.startsWith("0b")) body = body.slice(2);
  else if (base === 8 && lower.startsWith("0o")) body = body.slice(2);

  if (!body) throw new Error("请输入数值");

  let result = 0n;
  for (const ch of body) {
    const d = DIGITS.indexOf(ch.toLowerCase());
    if (d < 0 || d >= base) {
      throw new Error(`字符 “${ch}” 不是 ${base} 进制的合法数字`);
    }
    result = result * BigInt(base) + BigInt(d);
  }
  return negative ? -result : result;
}

export function toBase(value: bigint, base: number, upper = false): string {
  if (base < 2 || base > 36) throw new Error("进制需在 2–36 之间");
  if (value === 0n) return "0";
  const negative = value < 0n;
  let n = negative ? -value : value;
  const b = BigInt(base);
  let out = "";
  while (n > 0n) {
    out = DIGITS[Number(n % b)] + out;
    n /= b;
  }
  if (upper) out = out.toUpperCase();
  return negative ? `-${out}` : out;
}

/* ══════════════════════════════════════════════════════════════
   JWT
   ══════════════════════════════════════════════════════════════ */

export interface DecodedJwt {
  header: unknown;
  payload: unknown;
  signature: string;
  headerRaw: string;
  payloadRaw: string;
}

function base64UrlDecodeToString(part: string): string {
  let s = part.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s += "=".repeat(4 - pad);
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function decodeJwt(token: string): DecodedJwt {
  const trimmed = token.trim().replace(/^Bearer\s+/i, "");
  const parts = trimmed.split(".");
  if (parts.length < 2) {
    throw new Error("JWT 至少应包含两段（Header.Payload），当前格式不正确");
  }
  if (parts.length > 3) {
    throw new Error("JWT 最多三段（Header.Payload.Signature），当前段数过多");
  }

  const parse = (part: string, name: string): unknown => {
    let json: string;
    try {
      json = base64UrlDecodeToString(part);
    } catch {
      throw new Error(`${name} 段不是合法的 Base64URL 编码`);
    }
    try {
      return JSON.parse(json);
    } catch {
      throw new Error(`${name} 段不是合法的 JSON`);
    }
  };

  return {
    header: parse(parts[0], "Header"),
    payload: parse(parts[1], "Payload"),
    signature: parts[2] ?? "",
    headerRaw: parts[0],
    payloadRaw: parts[1],
  };
}

/** 把 JWT 时间声明（秒）格式化为本地时间 */
export function formatJwtTime(seconds: number): string {
  const d = new Date(seconds * 1000);
  if (Number.isNaN(d.getTime())) return "无效时间";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ══════════════════════════════════════════════════════════════
   Query String
   ══════════════════════════════════════════════════════════════ */

export interface QueryRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

let rowSeq = 0;
export function newQueryRow(key = "", value = ""): QueryRow {
  rowSeq += 1;
  return { id: `row-${rowSeq}`, key, value, enabled: true };
}

export function parseQueryString(input: string): QueryRow[] {
  const raw = input.trim();
  if (!raw) return [];

  let qs = raw;
  const qIndex = raw.indexOf("?");
  if (qIndex >= 0) {
    qs = raw.slice(qIndex + 1);
    const hashIndex = qs.indexOf("#");
    if (hashIndex >= 0) qs = qs.slice(0, hashIndex);
  } else if (raw.includes("://")) {
    try {
      return parseQueryString(`?${new URL(raw).searchParams.toString()}`);
    } catch {
      /* 交给下面的通用解析 */
    }
  }

  const rows: QueryRow[] = [];
  for (const pair of qs.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const rawKey = eq >= 0 ? pair.slice(0, eq) : pair;
    const rawValue = eq >= 0 ? pair.slice(eq + 1) : "";
    const dec = (s: string) => {
      const t = s.replace(/\+/g, " ");
      try {
        return decodeURIComponent(t);
      } catch {
        return t;
      }
    };
    rows.push(newQueryRow(dec(rawKey), dec(rawValue)));
  }
  return rows;
}

export function buildQueryString(
  rows: QueryRow[],
  opts: { encode?: boolean; sort?: boolean } = {}
): string {
  const { encode = true, sort = false } = opts;
  let list = rows.filter((r) => r.enabled && r.key.trim() !== "");
  if (sort) list = [...list].sort((a, b) => a.key.localeCompare(b.key));

  return list
    .map((r) => {
      const k = encode ? encodeURIComponent(r.key) : r.key;
      if (r.value === "") return k;
      const v = encode ? encodeURIComponent(r.value) : r.value;
      return `${k}=${v}`;
    })
    .join("&");
}

/** 把可能抛错的转换包成 { value, error }，供渲染层直接消费 */
export function safe<T>(fn: () => T): { value: T | null; error: string | null } {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ══════════════════════════════════════════════════════════════
   JSON 语法高亮（输出区展示用）
   ══════════════════════════════════════════════════════════════ */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 给 JSON 字符串加上 span，配合 dangerouslySetInnerHTML 使用 */
export function highlightJson(json: string): string {
  const escaped = escapeHtml(json);
  return escaped.replace(
    /(&quot;(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\&])*&quot;)(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (match, str, colon, bool) => {
      if (str) {
        if (colon) {
          return `<span class="text-blue-fg">${str}</span>${colon}`;
        }
        return `<span class="text-green-fg">${str}</span>`;
      }
      if (bool) return `<span class="text-orange-fg">${match}</span>`;
      return `<span class="text-palette-violet">${match}</span>`;
    }
  );
}
