/**
 * Static SEO and accessibility audit for a pasted HTML document.
 *
 * This runs entirely on the string, with no DOM: the checks only need tags and
 * attributes, and a regex pass keeps the module testable in Node. The scanner
 * is deliberately forgiving — a `>` inside a quoted attribute can confuse it,
 * but the output is advisory, so a missed tag matters less than a crash on
 * real-world markup.
 *
 * Every issue carries a stable `id`; the UI owns the wording so the same report
 * can be rendered in either language.
 */

export type AuditLevel = "error" | "warn" | "info";

export interface AuditIssue {
  id: string;
  level: AuditLevel;
  /** Numbers or short strings folded into the localised message */
  detail?: string;
}

export interface AuditStats {
  titleChars: number;
  descriptionChars: number;
  h1: number;
  headings: number;
  images: number;
  imagesMissingAlt: number;
  links: number;
  words: number;
}

export interface AuditReport {
  issues: AuditIssue[];
  stats: AuditStats;
  counts: { error: number; warn: number; info: number };
}

const TAG_RE = /<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR_RE = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

export interface TagToken {
  name: string;
  attrs: Record<string, string>;
}

/** Attribute map for one tag; boolean attributes become "" */
export function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(raw))) {
    const [, name, double, single, bare] = match;
    attrs[name.toLowerCase()] = double ?? single ?? bare ?? "";
  }
  return attrs;
}

/** Every opening tag in document order, comments and doctype excluded */
export function scanTags(html: string): TagToken[] {
  const stripped = html.replace(/<!--[\s\S]*?-->/g, "");
  const tokens: TagToken[] = [];
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(stripped))) {
    tokens.push({ name: match[1].toLowerCase(), attrs: parseAttrs(match[2]) });
  }
  return tokens;
}

function metaContent(tags: TagToken[], key: "name" | "property", value: string): string | null {
  for (const tag of tags) {
    if (tag.name === "meta" && (tag.attrs[key] ?? "").toLowerCase() === value) {
      return tag.attrs.content ?? "";
    }
  }
  return null;
}

/** CJK counts per character, Latin per whitespace-separated run */
export function wordCount(html: string): number {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ");
  const cjk = text.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)?.length ?? 0;
  const latin = text
    .replace(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " ")
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return cjk + latin;
}

function relHas(rel: string, token: string): boolean {
  return rel
    .toLowerCase()
    .split(/\s+/)
    .includes(token);
}

export function auditHtml(html: string): AuditReport {
  const issues: AuditIssue[] = [];
  const add = (id: string, level: AuditLevel, detail?: string) => issues.push({ id, level, detail });

  const tags = scanTags(html);
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
  const description = metaContent(tags, "name", "description");
  const headings = tags.filter((tag) => /^h[1-6]$/.test(tag.name)).map((tag) => Number(tag.name[1]));
  const h1 = headings.filter((level) => level === 1).length;
  const images = tags.filter((tag) => tag.name === "img");
  const imagesMissingAlt = images.filter((tag) => !("alt" in tag.attrs)).length;
  const links = tags.filter((tag) => tag.name === "a");

  // --- basics -------------------------------------------------------------
  if (!/<html[^>]*\slang\s*=/i.test(html)) add("htmlLang", "error");

  if (!title) add("title.missing", "error");
  else if (title.length < 10) add("title.short", "warn", String(title.length));
  else if (title.length > 60) add("title.long", "warn", String(title.length));

  if (description === null) add("description.missing", "error");
  else if (!description.trim()) add("description.missing", "error");
  else if (description.length < 50) add("description.short", "warn", String(description.length));
  else if (description.length > 160) add("description.long", "warn", String(description.length));

  if (h1 === 0) add("h1.missing", "error");
  else if (h1 > 1) add("h1.multiple", "warn", String(h1));

  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i] - headings[i - 1] > 1) {
      add("heading.skip", "warn", `h${headings[i - 1]} → h${headings[i]}`);
      break;
    }
  }

  // --- crawl and sharing --------------------------------------------------
  const canonical = tags.some(
    (tag) => tag.name === "link" && relHas(tag.attrs.rel ?? "", "canonical")
  );
  if (!canonical) add("canonical.missing", "warn");

  const robots = metaContent(tags, "name", "robots");
  if (robots && /noindex/i.test(robots)) add("robots.noindex", "info", robots.trim());

  const ogMissing = ["og:title", "og:description", "og:image"].filter(
    (property) => metaContent(tags, "property", property) === null
  );
  if (ogMissing.length > 0) add("og.missing", "warn", ogMissing.join(", "));
  if (metaContent(tags, "name", "twitter:card") === null) add("twitter.missing", "info");

  if (metaContent(tags, "name", "viewport") === null) add("viewport.missing", "warn");
  const charset =
    tags.some((tag) => tag.name === "meta" && "charset" in tag.attrs) ||
    tags.some(
      (tag) =>
        tag.name === "meta" &&
        (tag.attrs["http-equiv"] ?? "").toLowerCase() === "content-type"
    );
  if (!charset) add("charset.missing", "info");

  const jsonLd = /<script[^>]+type\s*=\s*["']application\/ld\+json["']/i.test(html);
  if (!jsonLd) add("jsonld.missing", "info");

  // --- media and accessibility -------------------------------------------
  if (imagesMissingAlt > 0) add("img.alt", "warn", String(imagesMissingAlt));

  const blankLinks = links.filter((tag) => {
    if (!relHas(tag.attrs.target ?? "", "_blank")) return false;
    const rel = tag.attrs.rel ?? "";
    return !relHas(rel, "noopener") && !relHas(rel, "noreferrer");
  });
  if (blankLinks.length > 0) add("link.blank", "warn", String(blankLinks.length));

  const labels = new Set(
    tags
      .filter((tag) => tag.name === "label" && tag.attrs.for)
      .map((tag) => tag.attrs.for.toLowerCase())
  );
  const unlabelled = tags.filter((tag) => {
    if (!["input", "select", "textarea"].includes(tag.name)) return false;
    const type = (tag.attrs.type ?? "").toLowerCase();
    if (["hidden", "submit", "button", "reset", "image"].includes(type)) return false;
    if (tag.attrs["aria-label"] || tag.attrs["aria-labelledby"] || tag.attrs.title) return false;
    if ((tag.attrs.placeholder ?? "").trim()) return false;
    const id = (tag.attrs.id ?? "").toLowerCase();
    return !id || !labels.has(id);
  });
  if (unlabelled.length > 0) add("a11y.inputLabel", "warn", String(unlabelled.length));

  const badTabIndex = tags.filter((tag) => Number(tag.attrs.tabindex) > 0).length;
  if (badTabIndex > 0) add("a11y.tabindex", "warn", String(badTabIndex));

  const untitledIframes = tags.filter((tag) => tag.name === "iframe" && !tag.attrs.title).length;
  if (untitledIframes > 0) add("a11y.iframeTitle", "warn", String(untitledIframes));

  const ids = tags.map((tag) => tag.attrs.id).filter((id): id is string => Boolean(id));
  const duplicates = ids.length - new Set(ids).size;
  if (duplicates > 0) add("a11y.duplicateId", "warn", String(duplicates));

  const order: Record<AuditLevel, number> = { error: 0, warn: 1, info: 2 };
  issues.sort((a, b) => order[a.level] - order[b.level]);

  return {
    issues,
    stats: {
      titleChars: title.length,
      descriptionChars: description?.length ?? 0,
      h1,
      headings: headings.length,
      images: images.length,
      imagesMissingAlt,
      links: links.length,
      words: wordCount(html),
    },
    counts: {
      error: issues.filter((issue) => issue.level === "error").length,
      warn: issues.filter((issue) => issue.level === "warn").length,
      info: issues.filter((issue) => issue.level === "info").length,
    },
  };
}
