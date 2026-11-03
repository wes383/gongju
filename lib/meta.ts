/**
 * Meta tag builder / auditor for SEO and social sharing.
 *
 * `buildMetaTags` emits the block people paste into `<head>`, `parseMetaTags`
 * pulls the same values back out of an existing page, and `auditMeta` reports
 * the problems that actually cost clicks: missing titles, overlong
 * descriptions, relative image URLs.
 */

export interface MetaFields {
  title: string;
  description: string;
  keywords: string;
  author: string;
  canonical: string;
  image: string;
  siteName: string;
  /** og:type, e.g. website or article */
  type: string;
  twitterCard: "summary" | "summary_large_image";
  /** og:locale, e.g. zh_CN */
  locale: string;
  /** robots directive, e.g. index,follow */
  robots: string;
  themeColor: string;
  favicon: string;
}

export const DEFAULT_META: MetaFields = {
  title: "",
  description: "",
  keywords: "",
  author: "",
  canonical: "",
  image: "",
  siteName: "",
  type: "website",
  twitterCard: "summary_large_image",
  locale: "zh_CN",
  robots: "index,follow",
  themeColor: "",
  favicon: "",
};

/** Character budgets used by the audit and the previews */
export const LIMITS = {
  title: { min: 10, max: 60, pixels: 580 },
  description: { min: 50, max: 160, pixels: 960 },
  siteName: { max: 30 },
} as const;

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Build the `<head>` block; empty fields are skipped */
export function buildMetaTags(fields: MetaFields): string {
  const lines: string[] = [];
  const push = (line: string) => lines.push(`  ${line}`);

  if (fields.title.trim()) push(`<title>${escapeText(fields.title.trim())}</title>`);
  const meta = (attr: "name" | "property", key: string, value: string) => {
    const clean = value.trim();
    if (clean) push(`<meta ${attr}="${key}" content="${escapeAttr(clean)}" />`);
  };

  meta("name", "description", fields.description);
  meta("name", "keywords", fields.keywords);
  meta("name", "author", fields.author);
  meta("name", "robots", fields.robots);
  meta("name", "theme-color", fields.themeColor);

  if (fields.canonical.trim()) {
    push(`<link rel="canonical" href="${escapeAttr(fields.canonical.trim())}" />`);
  }
  if (fields.favicon.trim()) {
    push(`<link rel="icon" href="${escapeAttr(fields.favicon.trim())}" />`);
  }

  meta("property", "og:type", fields.type);
  meta("property", "og:title", fields.title);
  meta("property", "og:description", fields.description);
  meta("property", "og:url", fields.canonical);
  meta("property", "og:image", fields.image);
  meta("property", "og:site_name", fields.siteName);
  meta("property", "og:locale", fields.locale);

  meta("name", "twitter:card", fields.twitterCard);
  meta("name", "twitter:title", fields.title);
  meta("name", "twitter:description", fields.description);
  meta("name", "twitter:image", fields.image);

  return lines.join("\n");
}

/* ══════════════════════════════════════════════════════════════
   Parsing an existing page
   ══════════════════════════════════════════════════════════════ */

interface TagAttrs {
  [key: string]: string;
}

function parseAttrs(source: string): TagAttrs {
  const attrs: TagAttrs = {};
  const attrRe = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(source))) {
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    attrs[match[1].toLowerCase()] = decodeEntities(value);
  }
  return attrs;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Extract meta fields from a pasted `<head>` or a full HTML document */
export function parseMetaTags(html: string): Partial<MetaFields> {
  const out: Partial<MetaFields> = {};
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch) out.title = decodeEntities(titleMatch[1].trim());

  const metaRe = /<meta\b[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = metaRe.exec(html))) {
    const attrs = parseAttrs(tag[0]);
    const name = (attrs.name ?? attrs.property ?? "").toLowerCase();
    const content = attrs.content ?? "";
    switch (name) {
      case "description":
        out.description = content;
        break;
      case "keywords":
        out.keywords = content;
        break;
      case "author":
        out.author = content;
        break;
      case "robots":
        out.robots = content;
        break;
      case "theme-color":
        out.themeColor = content;
        break;
      case "og:title":
        if (!out.title) out.title = content;
        break;
      case "og:description":
        if (!out.description) out.description = content;
        break;
      case "og:image":
        out.image = content;
        break;
      case "og:url":
        out.canonical = content;
        break;
      case "og:site_name":
        out.siteName = content;
        break;
      case "og:type":
        out.type = content;
        break;
      case "og:locale":
        out.locale = content;
        break;
      case "twitter:card":
        out.twitterCard = content === "summary" ? "summary" : "summary_large_image";
        break;
      case "twitter:image":
        if (!out.image) out.image = content;
        break;
      default:
        break;
    }
  }

  const canonical = /<link\b[^>]*rel=["']?canonical["']?[^>]*>/i.exec(html);
  if (canonical) {
    const href = parseAttrs(canonical[0]).href;
    if (href) out.canonical = href;
  }
  const icon = /<link\b[^>]*rel=["'][^"']*icon[^"']*["'][^>]*>/i.exec(html);
  if (icon) {
    const href = parseAttrs(icon[0]).href;
    if (href) out.favicon = href;
  }

  return out;
}

/* ══════════════════════════════════════════════════════════════
   Audit
   ══════════════════════════════════════════════════════════════ */

export type MetaIssueCode =
  | "title-missing"
  | "title-long"
  | "title-short"
  | "description-missing"
  | "description-long"
  | "description-short"
  | "canonical-missing"
  | "canonical-relative"
  | "image-missing"
  | "image-relative"
  | "site-name-missing";

export interface MetaIssue {
  field: keyof MetaFields | "image" | "canonical";
  code: MetaIssueCode;
  /** Character length for the length-related issues */
  length?: number;
  limit?: number;
}

export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value.trim());
}

export function auditMeta(fields: MetaFields): MetaIssue[] {
  const issues: MetaIssue[] = [];
  const title = fields.title.trim();
  const description = fields.description.trim();

  if (!title) issues.push({ field: "title", code: "title-missing" });
  else if ([...title].length > LIMITS.title.max) {
    issues.push({ field: "title", code: "title-long", length: [...title].length, limit: LIMITS.title.max });
  } else if ([...title].length < LIMITS.title.min) {
    issues.push({ field: "title", code: "title-short", length: [...title].length, limit: LIMITS.title.min });
  }

  if (!description) issues.push({ field: "description", code: "description-missing" });
  else if ([...description].length > LIMITS.description.max) {
    issues.push({
      field: "description",
      code: "description-long",
      length: [...description].length,
      limit: LIMITS.description.max,
    });
  } else if ([...description].length < LIMITS.description.min) {
    issues.push({
      field: "description",
      code: "description-short",
      length: [...description].length,
      limit: LIMITS.description.min,
    });
  }

  if (!fields.canonical.trim()) issues.push({ field: "canonical", code: "canonical-missing" });
  else if (!isAbsoluteUrl(fields.canonical)) issues.push({ field: "canonical", code: "canonical-relative" });

  if (!fields.image.trim()) issues.push({ field: "image", code: "image-missing" });
  else if (!isAbsoluteUrl(fields.image)) issues.push({ field: "image", code: "image-relative" });

  if (!fields.siteName.trim()) issues.push({ field: "siteName", code: "site-name-missing" });

  return issues;
}

/* ══════════════════════════════════════════════════════════════
   Preview helpers
   ══════════════════════════════════════════════════════════════ */

/**
 * Rough rendered width. CJK glyphs are about one em wide, Latin about 0.55 em,
 * which is close enough to predict where Google cuts the line.
 */
export function estimateWidth(text: string, fontSize = 16): number {
  let width = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x2e80) width += fontSize;
    else if (/[A-Z0-9]/.test(ch)) width += fontSize * 0.62;
    else if (/[a-z]/.test(ch)) width += fontSize * 0.52;
    else if (ch === " ") width += fontSize * 0.28;
    else width += fontSize * 0.42;
  }
  return Math.round(width);
}

/** Cut text at the last character that still fits the pixel budget */
export function truncateToWidth(text: string, maxPixels: number, fontSize = 16): string {
  if (estimateWidth(text, fontSize) <= maxPixels) return text;
  let out = "";
  for (const ch of text) {
    if (estimateWidth(out + ch, fontSize) > maxPixels - fontSize) break;
    out += ch;
  }
  return `${out.trimEnd()}…`;
}

/** Host shown in the SERP preview, without protocol or trailing slash */
export function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

export const META_SAMPLE = `<!doctype html>
<html lang="zh-CN">
  <head>
    <title>JSON 格式化工具 - 在线校验与美化 | GongJu</title>
    <meta name="description" content="免费在线 JSON 格式化、压缩与校验工具，语法错误精确到行列，支持 JSONPath 查询与 Schema 校验，全部在本地完成。" />
    <meta property="og:title" content="JSON 格式化工具 | GongJu" />
    <meta property="og:description" content="格式化、压缩、校验 JSON，错误定位到行列。" />
    <meta property="og:image" content="https://gongju.example/og/json.png" />
    <meta property="og:site_name" content="GongJu" />
    <link rel="canonical" href="https://gongju.example/tools/json-format" />
  </head>
</html>`;
