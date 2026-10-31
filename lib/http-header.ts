/**
 * HTTP header parsing and building.
 *
 * Header blocks are simple enough that a parser would be overkill: split on
 * CRLF, honour the obsolete line folding, and flag the lines that a browser
 * would reject instead of silently dropping them.
 */
import { codedError } from "./errors";
import type { Locale } from "./i18n";

export interface HeaderEntry {
  name: string;
  value: string;
}

export type HeaderIssueReason =
  | "noColon"
  | "emptyName"
  | "invalidName"
  | "spaceBeforeColon"
  | "orphanContinuation";

export interface HeaderIssue {
  /** 1-based line number in the pasted block */
  line: number;
  text: string;
  reason: HeaderIssueReason;
}

export interface ParsedHeaders {
  entries: HeaderEntry[];
  issues: HeaderIssue[];
}

/** RFC 9110 `token` — the characters a field name may contain */
const FIELD_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const MAX_HEADERS = 500;

export function parseHttpHeaders(text: string): ParsedHeaders {
  const entries: HeaderEntry[] = [];
  const issues: HeaderIssue[] = [];

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    if (raw.trim() === "") return;

    // Obsolete line folding: a leading space continues the previous value
    if (raw.startsWith(" ") || raw.startsWith("\t")) {
      if (entries.length === 0) {
        issues.push({ line, text: raw, reason: "orphanContinuation" });
      } else {
        entries[entries.length - 1].value += ` ${raw.trim()}`;
      }
      return;
    }

    const colon = raw.indexOf(":");
    if (colon === -1) {
      issues.push({ line, text: raw, reason: "noColon" });
      return;
    }

    const name = raw.slice(0, colon).trim();
    const value = raw.slice(colon + 1).trim();

    if (!name) {
      issues.push({ line, text: raw, reason: "emptyName" });
      return;
    }
    if (raw.slice(0, colon) !== name) {
      issues.push({ line, text: raw, reason: "spaceBeforeColon" });
    }
    if (!FIELD_NAME.test(name)) {
      issues.push({ line, text: raw, reason: "invalidName" });
    }

    if (entries.length >= MAX_HEADERS) throw codedError("header.tooMany", MAX_HEADERS);
    entries.push({ name, value });
  });

  return { entries, issues };
}

export function serializeHeaders(entries: HeaderEntry[], eol = "\n"): string {
  return entries.map((entry) => `${entry.name}: ${entry.value}`).join(eol);
}

/** Same block as a curl command, ready to paste into a terminal */
export function toCurlHeaders(entries: HeaderEntry[], url = "<url>"): string {
  if (entries.length === 0) return "";
  const headerLines = entries.map((entry) => {
    const escaped = `${entry.name}: ${entry.value}`.replace(/'/g, "'\\''");
    return `  -H '${escaped}' \\`;
  });
  return ["curl \\", ...headerLines, `  ${url}`].join("\n");
}

export type HeaderGroup = "request" | "response" | "cors" | "security";

export interface HeaderPreset {
  id: string;
  group: HeaderGroup;
  name: string;
  value: string;
  /** Overrides `value` for the English UI, for examples that are locale-specific */
  valueEn?: string;
  zh: string;
  en: string;
}

/** Default value for a preset in the active locale */
export function headerPresetValue(preset: HeaderPreset, locale: Locale): string {
  return locale === "en" ? (preset.valueEn ?? preset.value) : preset.value;
}

/** Common headers with a sensible default value, for the builder mode */
export const HEADER_PRESETS: HeaderPreset[] = [
  {
    id: "accept",
    group: "request",
    name: "Accept",
    value: "application/json",
    zh: "客户端能接受的响应类型",
    en: "Response types the client accepts",
  },
  {
    id: "accept-language",
    group: "request",
    name: "Accept-Language",
    value: "zh-CN,zh;q=0.9,en;q=0.8",
    valueEn: "en-US,en;q=0.9,zh-CN;q=0.8",
    zh: "语言偏好，q 为权重",
    en: "Language preferences, weighted by q",
  },
  {
    id: "authorization",
    group: "request",
    name: "Authorization",
    value: "Bearer <token>",
    zh: "凭据，Bearer 或 Basic",
    en: "Credentials, Bearer or Basic",
  },
  {
    id: "content-type",
    group: "request",
    name: "Content-Type",
    value: "application/json; charset=utf-8",
    zh: "请求体的媒体类型",
    en: "Media type of the request body",
  },
  {
    id: "cookie",
    group: "request",
    name: "Cookie",
    value: "session=<value>; theme=dark",
    zh: "浏览器带来的 Cookie",
    en: "Cookies sent by the browser",
  },
  {
    id: "origin",
    group: "request",
    name: "Origin",
    value: "https://example.com",
    zh: "跨域请求的来源，决定 CORS 结果",
    en: "Origin of a cross-site request, drives CORS",
  },
  {
    id: "referer",
    group: "request",
    name: "Referer",
    value: "https://example.com/page",
    zh: "发起请求的页面地址",
    en: "Page that triggered the request",
  },
  {
    id: "user-agent",
    group: "request",
    name: "User-Agent",
    value:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    zh: "客户端标识",
    en: "Client identifier",
  },
  {
    id: "if-none-match",
    group: "request",
    name: "If-None-Match",
    value: 'W/"<etag>"',
    zh: "带缓存校验，命中时返回 304",
    en: "Conditional request, answers 304 when it matches",
  },
  {
    id: "cache-control",
    group: "response",
    name: "Cache-Control",
    value: "no-store",
    zh: "缓存策略",
    en: "Caching policy",
  },
  {
    id: "etag",
    group: "response",
    name: "ETag",
    value: 'W/"<etag>"',
    zh: "资源版本标识",
    en: "Resource version tag",
  },
  {
    id: "location",
    group: "response",
    name: "Location",
    value: "https://example.com/login",
    zh: "重定向目标，配合 3xx 使用",
    en: "Redirect target, pairs with a 3xx status",
  },
  {
    id: "set-cookie",
    group: "response",
    name: "Set-Cookie",
    value: "session=<value>; Path=/; HttpOnly; Secure; SameSite=Lax",
    zh: "下发 Cookie 及其属性",
    en: "Sets a cookie with its attributes",
  },
  {
    id: "www-authenticate",
    group: "response",
    name: "WWW-Authenticate",
    value: 'Bearer realm="api"',
    zh: "401 响应里说明认证方式",
    en: "Describes the auth scheme on a 401",
  },
  {
    id: "content-disposition",
    group: "response",
    name: "Content-Disposition",
    value: 'attachment; filename="report.csv"',
    zh: "强制下载并指定文件名",
    en: "Forces a download and names the file",
  },
  {
    id: "cors-origin",
    group: "cors",
    name: "Access-Control-Allow-Origin",
    value: "*",
    zh: "允许的来源，带凭据时不能写 *",
    en: "Allowed origin; cannot be * with credentials",
  },
  {
    id: "cors-methods",
    group: "cors",
    name: "Access-Control-Allow-Methods",
    value: "GET, POST, PUT, DELETE, OPTIONS",
    zh: "预检请求允许的方法",
    en: "Methods allowed by the preflight",
  },
  {
    id: "cors-headers",
    group: "cors",
    name: "Access-Control-Allow-Headers",
    value: "Content-Type, Authorization",
    zh: "预检请求允许的请求头",
    en: "Request headers allowed by the preflight",
  },
  {
    id: "cors-credentials",
    group: "cors",
    name: "Access-Control-Allow-Credentials",
    value: "true",
    zh: "允许携带 Cookie",
    en: "Allows cookies to be sent",
  },
  {
    id: "cors-max-age",
    group: "cors",
    name: "Access-Control-Max-Age",
    value: "86400",
    zh: "预检结果的缓存秒数",
    en: "Seconds the preflight result may be cached",
  },
  {
    id: "csp",
    group: "security",
    name: "Content-Security-Policy",
    value: "default-src 'self'",
    zh: "限制可加载的资源来源",
    en: "Restricts where resources may load from",
  },
  {
    id: "hsts",
    group: "security",
    name: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
    zh: "强制后续走 HTTPS",
    en: "Forces HTTPS for later visits",
  },
  {
    id: "nosniff",
    group: "security",
    name: "X-Content-Type-Options",
    value: "nosniff",
    zh: "禁止浏览器猜测媒体类型",
    en: "Stops MIME sniffing",
  },
  {
    id: "frame-options",
    group: "security",
    name: "X-Frame-Options",
    value: "DENY",
    zh: "禁止被 iframe 嵌套",
    en: "Blocks framing in an iframe",
  },
  {
    id: "referrer-policy",
    group: "security",
    name: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
    zh: "跨域时如何传递 Referer",
    en: "How much referrer to send cross-site",
  },
  {
    id: "permissions-policy",
    group: "security",
    name: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()",
    zh: "禁用指定的浏览器能力",
    en: "Disables the listed browser features",
  },
];
