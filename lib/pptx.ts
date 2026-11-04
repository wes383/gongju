/**
 * PPTX text extraction.
 *
 * Only text is pulled out: titles, body placeholders, table cells and grouped
 * shapes, in slide order. Layout, theme, notes and animations are ignored — the
 * point is to get an outline or a script out of a deck quickly.
 */

import {
  attrOf,
  childrenOf,
  elementsOf,
  findAll,
  findChild,
  openPackage,
  parseRoot,
  readRelations,
  tagOf,
  textOf,
  type XmlNode,
} from "./ooxml";
import { codedError } from "./errors";

export interface Slide {
  /** 1-based slide number, as shown in PowerPoint */
  index: number;
  lines: string[];
}

export interface PptxDocument {
  slides: Slide[];
  title: string;
}

export function parsePptx(bytes: Uint8Array<ArrayBuffer>): PptxDocument {
  const pkg = openPackage(bytes);

  const presentationXml = pkg.text("ppt/presentation.xml");
  if (!presentationXml) throw codedError("office.invalid");

  const relations = readRelations(pkg, "ppt/presentation.xml");
  const root = parseRoot(presentationXml);
  if (!root) throw codedError("office.invalid");

  // sldIdLst holds the real order; slide1.xml is not necessarily slide one
  const slideIds = findAll(root, "p:sldId");
  const slides: Slide[] = [];

  slideIds.forEach((node, index) => {
    const relId = attrOf(node, "r:id");
    const target = relId ? relations.get(relId)?.target : undefined;
    const xml = target ? pkg.text(target) : null;
    if (!xml) return;

    const tree = parseRoot(xml);
    if (!tree) return;

    slides.push({ index: index + 1, lines: readSlideLines(tree) });
  });

  if (slides.length === 0) throw codedError("office.invalid");

  return { slides, title: readTitle(pkg) };
}

function readTitle(pkg: ReturnType<typeof openPackage>): string {
  const xml = pkg.text("docProps/core.xml");
  if (!xml) return "";
  const root = parseRoot(xml);
  if (!root) return "";
  const title = findAll(root, "dc:title")[0];
  return title ? textOf(title).trim() : "";
}

function readSlideLines(slide: XmlNode): string[] {
  const tree = findAll(slide, "p:spTree")[0];
  if (!tree) return [];

  const lines: string[] = [];
  walkShapeTree(tree, lines);
  return lines.filter((line) => line.trim().length > 0);
}

function walkShapeTree(node: XmlNode, lines: string[]): void {
  for (const child of elementsOf(node)) {
    const tag = tagOf(child);

    if (tag === "p:sp") {
      const body = findChild(child, "p:txBody");
      if (body) collectParagraphs(body, lines);
      continue;
    }

    if (tag === "p:grpSp") {
      walkShapeTree(child, lines);
      continue;
    }

    if (tag === "p:graphicFrame") {
      const table = findChild(child, "a:tbl");
      if (table) collectTable(table, lines);
      continue;
    }

    if (tag === "p:pic" || tag === "mc:AlternateContent") {
      // Pictures carry no text; alternate content duplicates shapes already read
      if (tag === "mc:AlternateContent") {
        for (const fallback of findAll(child, "p:spTree")) walkShapeTree(fallback, lines);
      }
    }
  }
}

function collectParagraphs(body: XmlNode, lines: string[]): void {
  for (const paragraph of elementsOf(body)) {
    if (tagOf(paragraph) !== "a:p") continue;
    const text = childrenOf(paragraph)
      .filter((node) => tagOf(node) === "a:r" || tagOf(node) === "a:fld")
      .map((run) => findAll(run, "a:t").map((node) => textOf(node)).join(""))
      .join("");
    if (text.trim()) lines.push(text.trim());
  }
}

function collectTable(table: XmlNode, lines: string[]): void {
  for (const row of elementsOf(table)) {
    if (tagOf(row) !== "a:tr") continue;
    const cells = elementsOf(row)
      .filter((cell) => tagOf(cell) === "a:tc")
      .map((cell) => findAll(cell, "a:t").map((node) => textOf(node)).join(" ").trim());
    const line = cells.filter(Boolean).join(" | ");
    if (line) lines.push(line);
  }
}

/** One heading per slide, so the result pastes into an outline cleanly. */
export function pptxToMarkdown(doc: PptxDocument): string {
  const blocks = doc.slides.map((slide) => {
    const body = slide.lines.length > 0 ? slide.lines.join("\n\n") : "_Empty slide_";
    return `## ${slide.index}\n\n${body}`;
  });
  return `${blocks.join("\n\n")}\n`;
}

export function pptxToText(doc: PptxDocument): string {
  return doc.slides
    .map((slide) => {
      const body = slide.lines.join("\n");
      return `--- Slide ${slide.index} ---\n${body}`;
    })
    .join("\n\n");
}

/** Character count drives the "is this deck worth reading" hint in the UI. */
export function slideCharCount(doc: PptxDocument): number {
  return doc.slides.reduce(
    (sum, slide) => sum + slide.lines.reduce((inner, line) => inner + line.length, 0),
    0
  );
}
