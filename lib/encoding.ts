import { decode as decodeEntities, escape as escapeEntities } from "he";

/**
 * Encoding / decoding primitives. Everything runs in the browser,
 * no server round-trip is involved.
 */

/** Error carrying an i18n key so the UI can translate it on render */
export interface CodedError extends Error {
  code: string;
  params: (string | number)[];
}

function codecError(code: string, ...params: (string | number)[]): CodedError {
  const err = new Error(code) as CodedError;
  err.code = code;
  err.params = params;
  return err;
}

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
  /** URL-safe alphabet: + to -, / to _, trailing = stripped */
  urlSafe?: boolean;
  /** Wrap at 76 characters (MIME style) */
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
    throw codecError("base64.invalidChars");
  }
  const pad = s.length % 4;
  if (pad === 1) throw codecError("base64.badLength");
  if (pad) s += "=".repeat(4 - pad);

  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw codecError("base64.notUtf8");
  }
}

/* ══════════════════════════════════════════════════════════════
   URL encoding
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
    // Tolerate broken % sequences: decode only the valid runs
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
   HTML entities
   ══════════════════════════════════════════════════════════════ */

export interface HtmlEntityOptions {
  /** Also convert non-ASCII characters to numeric entities */
  encodeNonAscii?: boolean;
  /** Emit hex numeric entities instead of decimal */
  hex?: boolean;
}

/** Escape the characters that are unsafe in HTML; everything else is left alone */
export function encodeHtmlEntities(text: string, opts: HtmlEntityOptions = {}): string {
  let out = escapeEntities(text);

  if (opts.encodeNonAscii) {
    out = out.replace(/[^\x00-\x7F]/g, (ch) => {
      const code = ch.codePointAt(0)!;
      return opts.hex ? `&#x${code.toString(16).toUpperCase()};` : `&#${code};`;
    });
  }
  return out;
}

/** Decode every HTML5 named entity plus decimal and hex numeric references */
export function decodeHtmlEntities(text: string): string {
  return decodeEntities(text);
}

/* ══════════════════════════════════════════════════════════════
   Unicode escapes
   ══════════════════════════════════════════════════════════════ */

export type UnicodeFormat = "js" | "html" | "codepoint";

export interface UnicodeOptions {
  format: UnicodeFormat;
  /** Only escape characters outside ASCII */
  nonAsciiOnly?: boolean;
}

function toJsEscape(code: number): string {
  if (code <= 0xffff) return `\\u${code.toString(16).toUpperCase().padStart(4, "0")}`;
  // Supplementary planes: emit a surrogate pair
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
   Hex <-> string
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
    throw codecError("hex.oddLength");
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw codecError("hex.notUtf8");
  }
}

/* ══════════════════════════════════════════════════════════════
   Base conversion (BigInt, no overflow)
   ══════════════════════════════════════════════════════════════ */

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function parseInBase(value: string, base: number): bigint {
  if (base < 2 || base > 36) throw codecError("radix.range");

  let body = value.trim().replace(/[\s_]/g, "");
  if (!body) throw codecError("radix.empty");

  const negative = body.startsWith("-");
  if (negative || body.startsWith("+")) body = body.slice(1);

  // Allow a 0x / 0b / 0o prefix, stripped only when it matches the base
  const lower = body.toLowerCase();
  if (base === 16 && lower.startsWith("0x")) body = body.slice(2);
  else if (base === 2 && lower.startsWith("0b")) body = body.slice(2);
  else if (base === 8 && lower.startsWith("0o")) body = body.slice(2);

  if (!body) throw codecError("radix.empty");

  let result = 0n;
  for (const ch of body) {
    const d = DIGITS.indexOf(ch.toLowerCase());
    if (d < 0 || d >= base) {
      throw codecError("radix.digit", ch, base);
    }
    result = result * BigInt(base) + BigInt(d);
  }
  return negative ? -result : result;
}

export function toBase(value: bigint, base: number, upper = false): string {
  if (base < 2 || base > 36) throw codecError("radix.range");
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
    throw codecError("jwt.parts");
  }
  if (parts.length > 3) {
    throw codecError("jwt.tooMany");
  }

  const parse = (part: string, name: string): unknown => {
    let json: string;
    try {
      json = base64UrlDecodeToString(part);
    } catch {
      throw codecError("jwt.base64", name);
    }
    try {
      return JSON.parse(json);
    } catch {
      throw codecError("jwt.json", name);
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

/** Format a JWT time claim (seconds) in local time */
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
      /* fall through to the generic parser below */
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

/** Wrap a throwing transform into { value, error } for direct use in render */
export function safe<T>(fn: () => T): { value: T | null; error: Error | null } {
  try {
    return { value: fn(), error: null };
  } catch (e) {
    return { value: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/* ══════════════════════════════════════════════════════════════
   JSON syntax highlighting (for read-only output panes)
   ══════════════════════════════════════════════════════════════ */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap JSON tokens in spans; output is escaped, safe for dangerouslySetInnerHTML */
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
