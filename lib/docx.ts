/**
 * DOCX → Markdown / HTML.
 *
 * Word stores a document as `word/document.xml` (content), `word/styles.xml`
 * (named styles), `word/numbering.xml` (list formats) and `word/media/*`
 * (pictures). This module walks the content tree and produces a small block
 * AST, then renders Markdown and HTML from it, so both outputs always agree.
 *
 * Layout is deliberately not reproduced: columns, text boxes, floats and exact
 * spacing are dropped. Text, headings, lists, tables, links and images are kept
 * as faithfully as the format allows.
 */

import {
  attrOf,
  childrenOf,
  dataUrlFor,
  decodeEntities,
  elementsOf,
  findAll,
  findChild,
  openPackage,
  parseRoot,
  readRelations,
  tagOf,
  textOf,
  type OfficePackage,
  type XmlNode,
} from "./ooxml";
import { codedError } from "./errors";

export type DocInline =
  | { type: "text"; text: string; bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean }
  | { type: "break" }
  | { type: "image"; src: string; alt: string }
  | { type: "link"; href: string; children: DocInline[] };

export type DocBlock =
  | { type: "heading"; level: number; inlines: DocInline[] }
  | { type: "paragraph"; inlines: DocInline[] }
  | { type: "list"; ordered: boolean; items: DocInline[][] }
  | { type: "table"; rows: string[][] };

export interface DocxDocument {
  blocks: DocBlock[];
  /** Word's core properties title, when present */
  title: string;
  images: number;
}

interface Numbering {
  /** numId → abstractNumId */
  toAbstract: Map<string, string>;
  /** `${abstractNumId}:${ilvl}` → numFmt value */
  formats: Map<string, string>;
}

export function parseDocx(bytes: Uint8Array<ArrayBuffer>): DocxDocument {
  const pkg = openPackage(bytes);
  const xml = pkg.text("word/document.xml");
  if (!xml) throw codedError("office.invalid");

  const documentRoot = parseRoot(xml);
  const body = findAll(documentRoot, "w:body")[0];
  if (!body) throw codedError("office.invalid");

  const relations = readRelations(pkg, "word/document.xml");
  const numbering = readNumbering(pkg);
  const ctx: WalkContext = { pkg, relations, numbering, images: 0 };

  const blocks = walkBlocks(body, ctx);

  return {
    blocks,
    title: readTitle(pkg),
    images: ctx.images,
  };
}

interface WalkContext {
  pkg: OfficePackage;
  relations: Map<string, { id: string; type: string; target: string }>;
  numbering: Numbering | null;
  images: number;
}

function readTitle(pkg: OfficePackage): string {
  const xml = pkg.text("docProps/core.xml");
  if (!xml) return "";
  const root = parseRoot(xml);
  if (!root) return "";
  const title = findAll(root, "dc:title")[0];
  return title ? textOf(title).trim() : "";
}

function readNumbering(pkg: OfficePackage): Numbering | null {
  const xml = pkg.text("word/numbering.xml");
  if (!xml) return null;

  const root = parseRoot(xml);
  if (!root) return null;

  const toAbstract = new Map<string, string>();
  const formats = new Map<string, string>();

  for (const abstract of findAll(root, "w:abstractNum")) {
    const abstractId = attrOf(abstract, "w:abstractNumId");
    if (!abstractId) continue;
    for (const level of findAll(abstract, "w:lvl")) {
      const ilvl = attrOf(level, "w:ilvl") ?? "0";
      const format = findChild(level, "w:numFmt");
      if (format) {
        const value = attrOf(format, "w:val");
        if (value) formats.set(`${abstractId}:${ilvl}`, value);
      }
    }
  }

  for (const num of findAll(root, "w:num")) {
    const numId = attrOf(num, "w:numId");
    const abstract = findChild(num, "w:abstractNumId");
    const abstractId = abstract ? attrOf(abstract, "w:val") : undefined;
    if (numId && abstractId) toAbstract.set(numId, abstractId);
  }

  return { toAbstract, formats };
}

/** Body-level walk: keeps paragraphs, tables, nested content controls in order. */
function walkBlocks(node: XmlNode, ctx: WalkContext): DocBlock[] {
  const blocks: DocBlock[] = [];
  let list: { ordered: boolean; numId: string; ilvl: string; items: DocInline[][] } | null = null;

  const flush = () => {
    if (list && list.items.length > 0) {
      blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  for (const child of elementsOf(node)) {
    const tag = tagOf(child);

    if (tag === "w:p") {
      const info = paragraphInfo(child);
      if (info.list) {
        const ordered = isOrderedList(ctx.numbering, info.list.numId, info.list.ilvl);
        if (!list || list.numId !== info.list.numId || list.ilvl !== info.list.ilvl) {
          flush();
          list = { ordered, numId: info.list.numId, ilvl: info.list.ilvl, items: [] };
        }
        list.items.push(readInlines(child, ctx));
        continue;
      }

      flush();
      const inlines = readInlines(child, ctx);
      if (!hasVisibleContent(inlines)) continue;

      if (info.headingLevel) blocks.push({ type: "heading", level: info.headingLevel, inlines });
      else blocks.push({ type: "paragraph", inlines });
      continue;
    }

    if (tag === "w:tbl") {
      flush();
      blocks.push({ type: "table", rows: readTable(child, ctx) });
      continue;
    }

    if (tag === "w:sdt") {
      // Structured document tags wrap real content in w:sdtContent
      const content = findChild(child, "w:sdtContent");
      if (content) {
        flush();
        blocks.push(...walkBlocks(content, ctx));
      }
      continue;
    }
  }

  flush();
  return blocks;
}

function hasVisibleContent(inlines: DocInline[]): boolean {
  return inlines.some((inline) => {
    if (inline.type === "text") return inline.text.trim().length > 0;
    return true;
  });
}

function paragraphInfo(paragraph: XmlNode): {
  headingLevel: number;
  list: { numId: string; ilvl: string } | null;
} {
  const props = findChild(paragraph, "w:pPr");
  if (!props) return { headingLevel: 0, list: null };

  let headingLevel = 0;
  const style = findChild(props, "w:pStyle");
  if (style) headingLevel = headingLevelFor(attrOf(style, "w:val") ?? "");

  let list: { numId: string; ilvl: string } | null = null;
  const numbering = findChild(props, "w:numPr");
  if (numbering) {
    const numId = findChild(numbering, "w:numId");
    const ilvl = findChild(numbering, "w:ilvl");
    const id = numId ? attrOf(numId, "w:val") : undefined;
    if (id) list = { numId: id, ilvl: ilvl ? (attrOf(ilvl, "w:val") ?? "0") : "0" };
  }

  return { headingLevel, list };
}

/**
 * Style ids vary by producer: `Heading1` from English Word, `1` from Chinese
 * Word, `heading 1` when the style name leaked into the id.
 */
function headingLevelFor(styleId: string): number {
  const value = styleId.trim();
  const named = /^(?:heading|标题)\s*([1-6])$/i.exec(value);
  if (named) return Number(named[1]);
  if (/^title$/i.test(value)) return 1;
  if (/^[1-6]$/.test(value)) return Number(value);
  return 0;
}

function isOrderedList(numbering: Numbering | null, numId: string, ilvl: string): boolean {
  if (!numbering) return false;
  const abstractId = numbering.toAbstract.get(numId);
  if (!abstractId) return false;
  const format = numbering.formats.get(`${abstractId}:${ilvl}`) ?? "";
  return /^(decimal|lowerLetter|upperLetter|lowerRoman|upperRoman|chineseCounting|ideograph)/i.test(
    format
  );
}

function readInlines(node: XmlNode, ctx: WalkContext, inherited: RunStyle = {}): DocInline[] {
  const inlines: DocInline[] = [];

  for (const child of childrenOf(node)) {
    const tag = tagOf(child);
    if (!tag) continue;

    if (tag === "w:r") {
      inlines.push(...readRun(child, ctx, inherited));
      continue;
    }

    if (tag === "w:hyperlink") {
      const relId = attrOf(child, "r:id");
      const href = relId ? ctx.relations.get(relId)?.target : undefined;
      const inner = readInlines(child, ctx, inherited);
      if (href) inlines.push({ type: "link", href, children: inner });
      else inlines.push(...inner);
      continue;
    }

    // w:sdt / w:ins / w:smartTag / w:fldSimple wrap runs without adding text
    if (tag === "w:sdt") {
      const content = findChild(child, "w:sdtContent");
      if (content) inlines.push(...readInlines(content, ctx, inherited));
      continue;
    }

    if (tag === "w:ins" || tag === "w:smartTag" || tag === "w:customXml") {
      inlines.push(...readInlines(child, ctx, inherited));
    }
  }

  return inlines;
}

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
}

function readRun(run: XmlNode, ctx: WalkContext, inherited: RunStyle): DocInline[] {
  const props = findChild(run, "w:rPr");
  const style: RunStyle = { ...inherited };

  if (props) {
    if (findChild(props, "w:b")) style.bold = true;
    if (findChild(props, "w:i")) style.italic = true;
    if (findChild(props, "w:strike") || findChild(props, "w:dstrike")) style.strike = true;
    const runStyle = findChild(props, "w:rStyle");
    if (runStyle && /code|html|verbatim/i.test(attrOf(runStyle, "w:val") ?? "")) style.code = true;
  }

  const inlines: DocInline[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const last = inlines[inlines.length - 1];
    if (
      last &&
      last.type === "text" &&
      last.bold === style.bold &&
      last.italic === style.italic &&
      last.strike === style.strike &&
      last.code === style.code
    ) {
      last.text += text;
      return;
    }
    inlines.push({ type: "text", text, ...style });
  };

  for (const child of childrenOf(run)) {
    const tag = tagOf(child);
    if (!tag) continue;

    if (tag === "w:t") pushText(decodeEntities(textOf(child)));
    else if (tag === "w:tab") pushText("\t");
    else if (tag === "w:br" || tag === "w:cr") inlines.push({ type: "break" });
    else if (tag === "w:drawing" || tag === "w:pict" || tag === "w:object") {
      const image = readImage(child, ctx);
      if (image) inlines.push(image);
    }
  }

  return inlines;
}

function readImage(node: XmlNode, ctx: WalkContext): DocInline | null {
  const blip = findAll(node, "a:blip")[0] ?? findAll(node, "v:imagedata")[0];
  if (!blip) return null;

  const relId = attrOf(blip, "r:embed") ?? attrOf(blip, "r:id");
  if (!relId) return null;

  const relation = ctx.relations.get(relId);
  if (!relation) return null;

  const src = dataUrlFor(ctx.pkg, relation.target);
  if (!src) return null;

  ctx.images += 1;
  const descr = findAll(node, "wp:docPr")[0] ?? findAll(node, "v:shape")[0];
  const alt = (descr && (attrOf(descr, "descr") || attrOf(descr, "alt"))) ?? "";
  return { type: "image", src, alt };
}

function readTable(table: XmlNode, ctx: WalkContext): string[][] {
  const rows: string[][] = [];
  for (const row of elementsOf(table)) {
    if (tagOf(row) !== "w:tr") continue;
    const cells: string[] = [];
    for (const cell of elementsOf(row)) {
      if (tagOf(cell) !== "w:tc") continue;
      cells.push(cellText(cell, ctx));
    }
    if (cells.some((cell) => cell.trim().length > 0)) rows.push(cells);
  }
  return rows;
}

function cellText(cell: XmlNode, ctx: WalkContext): string {
  const parts: string[] = [];
  for (const child of elementsOf(cell)) {
    if (tagOf(child) === "w:p") {
      const text = plainText(readInlines(child, ctx));
      if (text.trim()) parts.push(text.trim());
    } else if (tagOf(child) === "w:tbl") {
      const nested = readTable(child, ctx)
        .map((row) => row.join(" / "))
        .join(" / ");
      if (nested.trim()) parts.push(nested.trim());
    }
  }
  return parts.join(" ");
}

/** Flatten inlines to plain text (headings, table cells, alt text). */
export function plainText(inlines: DocInline[]): string {
  let out = "";
  for (const inline of inlines) {
    switch (inline.type) {
      case "text":
        out += inline.text;
        break;
      case "break":
        out += " ";
        break;
      case "image":
        out += inline.alt;
        break;
      case "link":
        out += plainText(inline.children);
        break;
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

export function docxToMarkdown(doc: DocxDocument): string {
  const blocks: string[] = [];

  for (const block of doc.blocks) {
    if (block.type === "heading") {
      const text = inlineMarkdown(block.inlines).trim();
      if (text) blocks.push(`${"#".repeat(block.level)} ${text}`);
      continue;
    }

    if (block.type === "paragraph") {
      const text = inlineMarkdown(block.inlines).trim();
      if (text) blocks.push(text);
      continue;
    }

    if (block.type === "list") {
      const lines = block.items.map((item, index) => {
        const marker = block.ordered ? `${index + 1}.` : "-";
        return `${marker} ${inlineMarkdown(item).trim()}`;
      });
      blocks.push(lines.join("\n"));
      continue;
    }

    if (block.type === "table") {
      const rows = block.rows;
      if (rows.length === 0) continue;
      const width = Math.max(...rows.map((row) => row.length));
      const pad = (row: string[]) =>
        Array.from({ length: width }, (_, i) => escapeTableCell(row[i] ?? ""));
      const lines = [
        `| ${pad(rows[0]).join(" | ")} |`,
        `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
        ...rows.slice(1).map((row) => `| ${pad(row).join(" | ")} |`),
      ];
      blocks.push(lines.join("\n"));
    }
  }

  return `${blocks.join("\n\n")}\n`;
}

function inlineMarkdown(inlines: DocInline[]): string {
  return inlines
    .map((inline) => {
      switch (inline.type) {
        case "text": {
          let text = escapeMarkdown(inline.text);
          if (inline.code) text = `\`${text}\``;
          if (inline.bold) text = `**${text}**`;
          if (inline.italic) text = `*${text}*`;
          if (inline.strike) text = `~~${text}~~`;
          return text;
        }
        case "break":
          return "\n";
        case "image":
          return `![${inline.alt}](${inline.src})`;
        case "link": {
          const label = inlineMarkdown(inline.children) || inline.href;
          return `[${label}](${inline.href})`;
        }
      }
    })
    .join("");
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

function escapeTableCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function docxToHtml(doc: DocxDocument): string {
  const parts: string[] = [];

  for (const block of doc.blocks) {
    if (block.type === "heading") {
      const text = inlineHtml(block.inlines).trim();
      if (text) parts.push(`<h${block.level}>${text}</h${block.level}>`);
      continue;
    }

    if (block.type === "paragraph") {
      const text = inlineHtml(block.inlines).trim();
      if (text) parts.push(`<p>${text}</p>`);
      continue;
    }

    if (block.type === "list") {
      const tag = block.ordered ? "ol" : "ul";
      const items = block.items
        .map((item) => `<li>${inlineHtml(item).trim()}</li>`)
        .join("\n");
      parts.push(`<${tag}>\n${items}\n</${tag}>`);
      continue;
    }

    if (block.type === "table") {
      const rows = block.rows;
      if (rows.length === 0) continue;
      const width = Math.max(...rows.map((row) => row.length));
      const cell = (value: string, tag: "th" | "td") => `<${tag}>${escapeHtml(value)}</${tag}>`;
      const head = `<tr>${Array.from({ length: width }, (_, i) => cell(rows[0][i] ?? "", "th")).join("")}</tr>`;
      const body = rows
        .slice(1)
        .map(
          (row) =>
            `<tr>${Array.from({ length: width }, (_, i) => cell(row[i] ?? "", "td")).join("")}</tr>`
        )
        .join("\n");
      parts.push(`<table>\n<thead>${head}</thead>\n<tbody>\n${body}\n</tbody>\n</table>`);
    }
  }

  return parts.join("\n");
}

function inlineHtml(inlines: DocInline[]): string {
  return inlines
    .map((inline) => {
      switch (inline.type) {
        case "text": {
          let text = escapeHtml(inline.text);
          if (inline.code) text = `<code>${text}</code>`;
          if (inline.bold) text = `<strong>${text}</strong>`;
          if (inline.italic) text = `<em>${text}</em>`;
          if (inline.strike) text = `<del>${text}</del>`;
          return text;
        }
        case "break":
          return "<br>";
        case "image":
          return `<img src="${inline.src}" alt="${escapeHtml(inline.alt)}">`;
        case "link": {
          const label = inlineHtml(inline.children) || escapeHtml(inline.href);
          return `<a href="${escapeHtml(inline.href)}">${label}</a>`;
        }
      }
    })
    .join("");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
