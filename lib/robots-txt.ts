/**
 * robots.txt and sitemap.xml builders.
 *
 * Both formats are small but picky: a sitemap entry that is not an absolute
 * URL is silently dropped by crawlers, and a stray character in robots.txt can
 * unlock a path you meant to block. Everything here is plain string assembly
 * with explicit normalisation so the generated files can be diffed and tested.
 */

export const SITEMAP_ENTRY_LIMIT = 50_000;

const CHANGEFREQ = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"] as const;
export type ChangeFreq = (typeof CHANGEFREQ)[number];

export function isChangeFreq(value: string): value is ChangeFreq {
  return (CHANGEFREQ as readonly string[]).includes(value);
}

/** `&`, `<` and quotes are the only characters that can break the XML */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value.trim());
}

/** robots.txt paths must start with "/" (or be the wildcard "$") */
export function normalizeRobotPath(value: string): string {
  const raw = value.trim();
  if (!raw || raw === "/") return raw;
  return raw.startsWith("/") || raw.startsWith("*") || raw.startsWith("$") ? raw : `/${raw}`;
}

export interface RobotsInput {
  /** Comma or newline separated; "*" matches every crawler */
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: string;
  sitemaps: string[];
  host?: string;
}

function lines(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Assemble a robots.txt with one group. Crawl-delay is not part of the spec but
 * Google and Bing both ignore it harmlessly, so it is emitted only when set.
 */
export function buildRobots(input: RobotsInput): string {
  const agents = lines(input.userAgent);
  const out: string[] = [];

  for (const agent of agents.length > 0 ? agents : ["*"]) {
    out.push(`User-agent: ${agent}`);
  }
  for (const path of input.disallow.map(normalizeRobotPath).filter(Boolean)) {
    out.push(`Disallow: ${path}`);
  }
  for (const path of input.allow.map(normalizeRobotPath).filter(Boolean)) {
    out.push(`Allow: ${path}`);
  }
  const delay = input.crawlDelay?.trim();
  if (delay && Number.isFinite(Number(delay))) out.push(`Crawl-delay: ${Number(delay)}`);

  const sitemaps = lines(input.sitemaps.join("\n")).filter(isAbsoluteUrl);
  if (sitemaps.length > 0) {
    out.push("");
    for (const url of sitemaps) out.push(`Sitemap: ${url}`);
  }

  const host = input.host?.trim();
  if (host) out.push(`Host: ${host}`);

  return `${out.join("\n")}\n`;
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: ChangeFreq;
  priority?: string;
}

/**
 * Join a path onto the site origin. Absolute URLs pass through so a sitemap can
 * cover a second host, and duplicate locs are dropped in favour of the first.
 */
export function normalizeLoc(baseUrl: string, value: string): string | null {
  const raw = value.trim();
  if (!raw || /\s/.test(raw)) return null;
  if (isAbsoluteUrl(raw)) return raw;
  const base = baseUrl.trim().replace(/\/+$/, "");
  if (!isAbsoluteUrl(base)) return null;
  return `${base}/${raw.replace(/^\/+/, "")}`;
}

const DATE_LIKE = /^\d{4}-\d{2}-\d{2}/;

/**
 * One entry per line: `loc`, or `loc | lastmod | changefreq | priority`.
 * Anything unparseable is returned in `skipped` instead of being guessed at.
 */
export function parseSitemapLines(
  text: string,
  baseUrl: string
): { entries: SitemapEntry[]; skipped: string[] } {
  const entries: SitemapEntry[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  for (const raw of text.split("\n").map((line) => line.trim()).filter(Boolean)) {
    const [locPart, lastmod, freq, priority] = raw.split("|").map((part) => part.trim());
    const loc = normalizeLoc(baseUrl, locPart);
    if (!loc || seen.has(loc)) {
      if (!loc) skipped.push(raw);
      continue;
    }
    seen.add(loc);
    const entry: SitemapEntry = { loc };
    if (lastmod && DATE_LIKE.test(lastmod)) entry.lastmod = lastmod;
    if (freq && isChangeFreq(freq.toLowerCase())) entry.changefreq = freq.toLowerCase() as ChangeFreq;
    const p = Number(priority);
    if (priority && Number.isFinite(p) && p >= 0 && p <= 1) entry.priority = p.toFixed(1);
    entries.push(entry);
  }

  return { entries, skipped };
}

/** A sitemap over 50k URLs must be split into an index; the UI warns instead */
export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries.slice(0, SITEMAP_ENTRY_LIMIT).map((entry) => {
    const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
    if (entry.lastmod) parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
    if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    if (entry.priority) parts.push(`    <priority>${entry.priority}</priority>`);
    return `  <url>\n${parts.join("\n")}\n  </url>`;
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
