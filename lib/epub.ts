/**
 * EPUB → Markdown / HTML.
 *
 * An EPUB is a ZIP with an OPF manifest: `META-INF/container.xml` points at the
 * package document, the manifest maps ids to files, and the spine fixes the
 * reading order. Chapters are XHTML, so images are inlined as data URLs before
 * conversion — otherwise the exported Markdown would reference files that only
 * existed inside the book.
 */

import TurndownService from "turndown";
import {
  attrOf,
  dataUrlFor,
  findAll,
  openPackage,
  parseRoot,
  resolvePartPath,
  textOf,
  type OfficePackage,
  type XmlNode,
} from "./ooxml";
import { codedError } from "./errors";

export interface Chapter {
  /** Path inside the EPUB, useful when a chapter has no title */
  href: string;
  title: string;
  html: string;
  markdown: string;
}

export interface EpubBook {
  title: string;
  author: string;
  language: string;
  chapters: Chapter[];
}

const MAX_CHAPTERS = 500;

export function parseEpub(bytes: Uint8Array<ArrayBuffer>): EpubBook {
  const pkg = openPackage(bytes);

  const containerXml = pkg.text("META-INF/container.xml");
  if (!containerXml) throw codedError("office.invalid");

  const container = parseRoot(containerXml);
  const rootfile = container ? findAll(container, "rootfile")[0] : undefined;
  const opfPath = rootfile ? attrOf(rootfile, "full-path") : undefined;
  if (!opfPath) throw codedError("office.invalid");

  const opfXml = pkg.text(opfPath);
  if (!opfXml) throw codedError("office.invalid");

  const opf = parseRoot(opfXml);
  if (!opf) throw codedError("office.invalid");

  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/")) : "";
  const manifest = new Map<string, string>();

  for (const item of findAll(opf, "item")) {
    const id = attrOf(item, "id");
    const href = attrOf(item, "href");
    const type = attrOf(item, "media-type") ?? "";
    if (!id || !href) continue;
    if (!/xhtml|html/i.test(type)) continue;
    manifest.set(id, resolvePartPath(opfDir, decodeHref(href)));
  }

  const spine: string[] = [];
  for (const itemref of findAll(opf, "itemref")) {
    const idref = attrOf(itemref, "idref");
    const path = idref ? manifest.get(idref) : undefined;
    if (path) spine.push(path);
  }

  if (spine.length === 0) throw codedError("office.invalid");

  const turndown = createTurndown();
  const chapters: Chapter[] = [];

  for (const href of spine.slice(0, MAX_CHAPTERS)) {
    const raw = pkg.text(href);
    if (!raw) continue;

    const body = extractBody(raw);
    if (!body.trim()) continue;

    const html = inlineImages(body, href, pkg);
    chapters.push({
      href,
      title: chapterTitle(raw, chapters.length + 1),
      html,
      markdown: turndown.turndown(html).trim(),
    });
  }

  const metadata = readMetadata(opf);

  return {
    title: metadata.title || "Untitled",
    author: metadata.author,
    language: metadata.language,
    chapters,
  };
}

function createTurndown(): TurndownService {
  return new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });
}

function readMetadata(opf: XmlNode): { title: string; author: string; language: string } {
  const pick = (tag: string): string => {
    const node = findAll(opf, tag)[0];
    return node ? decodeEntities(textOf(node)).trim() : "";
  };
  return {
    title: pick("dc:title"),
    author: pick("dc:creator"),
    language: pick("dc:language"),
  };
}

function decodeHref(href: string): string {
  const clean = href.split("#")[0].split("?")[0];
  try {
    return decodeURIComponent(clean);
  } catch {
    return clean;
  }
}

function extractBody(xhtml: string): string {
  const body = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(xhtml);
  const content = body ? body[1] : xhtml;
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\?xml[^>]*\?>/gi, "")
    .trim();
}

function chapterTitle(xhtml: string, ordinal: number): string {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(xhtml);
  if (title) {
    const text = decodeEntities(title[1].replace(/<[^>]+>/g, "")).trim();
    if (text) return text;
  }

  const heading = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i.exec(xhtml);
  if (heading) {
    const text = decodeEntities(heading[1].replace(/<[^>]+>/g, "")).trim();
    if (text) return text;
  }

  return `Chapter ${ordinal}`;
}

/** Swap every relative `<img src>` for a data URL taken from the package. */
function inlineImages(html: string, chapterPath: string, pkg: OfficePackage): string {
  const dir = chapterPath.includes("/") ? chapterPath.slice(0, chapterPath.lastIndexOf("/")) : "";

  return html.replace(/<img\b([^>]*?)\/?>/gi, (match, attrs: string) => {
    const src = /src\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    const raw = src ? (src[2] ?? src[3] ?? "") : "";
    if (!raw || /^(data:|https?:|file:)/i.test(raw)) return match;

    const resolved = resolvePartPath(dir, decodeHref(raw));
    const dataUrl = dataUrlFor(pkg, resolved);
    if (!dataUrl) return match;

    const cleaned = attrs.replace(/src\s*=\s*("[^"]*"|'[^']*')/i, `src="${dataUrl}"`);
    return `<img${cleaned}>`;
  });
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

/** One Markdown document: book title, then a section per chapter. */
export function epubToMarkdown(book: EpubBook): string {
  const head = [`# ${book.title}`];
  if (book.author) head.push(`_${book.author}_`);

  const body = book.chapters.map((chapter) => {
    const heading = chapter.title && chapter.title !== book.title ? `## ${chapter.title}\n\n` : "";
    return `${heading}${chapter.markdown}`.trim();
  });

  return `${head.join("\n\n")}\n\n${body.join("\n\n---\n\n")}\n`;
}

export function epubToHtml(book: EpubBook): string {
  const sections = book.chapters
    .map((chapter) => {
      const heading = chapter.title ? `<h2>${escapeHtml(chapter.title)}</h2>` : "";
      return `<section>\n${heading}\n${chapter.html}\n</section>`;
    })
    .join("\n");

  const meta = book.author
    ? `<p class="author">${escapeHtml(book.author)}</p>`
    : "";

  return `<!doctype html>
<html${book.language ? ` lang="${escapeHtml(book.language)}"` : ""}>
<head><meta charset="utf-8"><title>${escapeHtml(book.title)}</title></head>
<body>
<h1>${escapeHtml(book.title)}</h1>
${meta}
${sections}
</body>
</html>
`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Chapter list for the sidebar, with the length the reader actually gets. */
export function chapterWordCount(chapter: Chapter): number {
  return chapter.markdown.replace(/\s+/g, " ").trim().split(" ").length;
}
