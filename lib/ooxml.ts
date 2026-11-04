/**
 * Shared plumbing for the ZIP + XML formats: DOCX, XLSX, PPTX and EPUB are all
 * a package of parts plus relationships, so the unzip, XML and relationship
 * helpers live here instead of being repeated per format.
 *
 * Every XML tree is parsed with `preserveOrder`, which keeps children in
 * document order as an array. Word and PowerPoint interleave paragraphs,
 * tables and drawings, so an object-shaped parse (where same-named siblings
 * collapse into arrays) would silently reorder the document.
 */

import { unzipSync } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { codedError } from "./errors";

/** One element of a `preserveOrder` tree: `{ "w:p": [...], ":@": {…} }` */
export type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  preserveOrder: true,
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
  processEntities: true,
});

/** Parse one XML part into an ordered child array. */
export function parseXml(xml: string): XmlNode[] {
  try {
    return parser.parse(xml) as XmlNode[];
  } catch {
    throw codedError("office.invalid");
  }
}

/**
 * Document element of a part. `preserveOrder` keeps the XML declaration as the
 * first node, so taking `parseXml(xml)[0]` would hand back `<?xml ...?>`.
 */
export function parseRoot(xml: string): XmlNode {
  const nodes = parseXml(xml);
  const root = nodes.find((node) => {
    const tag = tagOf(node);
    return tag !== null && !tag.startsWith("?");
  });
  if (!root) throw codedError("office.invalid");
  return root;
}

/** The element name of a node, e.g. `w:p`; null for text nodes. */
export function tagOf(node: XmlNode): string | null {
  for (const key of Object.keys(node)) {
    if (key === ":@" || key === "#text" || key === "#comment") continue;
    if (key.startsWith("?")) continue;
    return key;
  }
  return null;
}

export function isElement(node: XmlNode): boolean {
  return tagOf(node) !== null;
}

/** Children of an element, or an empty array for text nodes. */
export function childrenOf(node: XmlNode): XmlNode[] {
  const tag = tagOf(node);
  if (!tag) return [];
  const value = node[tag];
  return Array.isArray(value) ? (value as XmlNode[]) : [];
}

/** Element children only — handy when walking a tree. */
export function elementsOf(node: XmlNode): XmlNode[] {
  return childrenOf(node).filter(isElement);
}

export function findChild(node: XmlNode, tag: string): XmlNode | null {
  for (const child of elementsOf(node)) {
    if (tagOf(child) === tag) return child;
  }
  return null;
}

export function findChildren(node: XmlNode, tag: string): XmlNode[] {
  return elementsOf(node).filter((child) => tagOf(child) === tag);
}

/** Depth-first search for every element with the given tag. */
export function findAll(node: XmlNode, tag: string, into: XmlNode[] = []): XmlNode[] {
  for (const child of elementsOf(node)) {
    if (tagOf(child) === tag) into.push(child);
    findAll(child, tag, into);
  }
  return into;
}

/** Attribute lookup, callable with or without the `@_` prefix. */
export function attrOf(node: XmlNode, name: string): string | undefined {
  const attrs = node[":@"];
  if (!attrs || typeof attrs !== "object") return undefined;
  const record = attrs as Record<string, unknown>;
  const value = record[name.startsWith("@_") ? name : `@_${name}`];
  return typeof value === "string" ? value : undefined;
}

/** Concatenated text of a node and its descendants, in document order. */
export function textOf(node: XmlNode): string {
  let out = "";
  const walk = (current: XmlNode) => {
    for (const key of Object.keys(current)) {
      if (key === "#text") {
        const value = current[key];
        if (typeof value === "string") out += value;
        else if (typeof value === "number") out += String(value);
        continue;
      }
      if (key === ":@" || key === "#comment") continue;
      const children = current[key];
      if (Array.isArray(children)) children.forEach((child) => walk(child as XmlNode));
    }
  };
  walk(node);
  return out;
}

export interface OfficePackage {
  /** Every part path in the archive, as stored */
  parts: string[];
  /** Raw bytes of a part, or null when it is missing */
  bytes(path: string): Uint8Array<ArrayBuffer> | null;
  /** Decoded text of a part, or null when it is missing */
  text(path: string): string | null;
}

/**
 * Unzip a package and return case-insensitive part lookup. Office files use
 * backslashes on some older Windows producers, and EPUB producers like to
 * percent-encode hrefs, so both are normalised here.
 */
export function openPackage(bytes: Uint8Array<ArrayBuffer>): OfficePackage {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw codedError("office.invalid");
  }

  const index = new Map<string, string>();
  for (const name of Object.keys(files)) {
    index.set(normalisePath(name).toLowerCase(), name);
  }
  if (index.size === 0) throw codedError("office.invalid");

  const get = (path: string): Uint8Array<ArrayBuffer> | null => {
    const key = index.get(normalisePath(path).toLowerCase());
    return key ? (files[key] as Uint8Array<ArrayBuffer>) : null;
  };

  return {
    parts: Object.keys(files),
    bytes: get,
    text(path) {
      const raw = get(path);
      return raw ? new TextDecoder("utf-8").decode(raw) : null;
    },
  };
}

function normalisePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

export interface Relation {
  id: string;
  type: string;
  target: string;
}

/**
 * Relationships of one part. The rels file lives in a sibling `_rels` folder:
 * `word/document.xml` → `word/_rels/document.xml.rels`.
 */
export function readRelations(pkg: OfficePackage, partPath: string): Map<string, Relation> {
  const clean = normalisePath(partPath);
  const slash = clean.lastIndexOf("/");
  const dir = slash >= 0 ? clean.slice(0, slash) : "";
  const file = slash >= 0 ? clean.slice(slash + 1) : clean;
  const relsPath = dir ? `${dir}/_rels/${file}.rels` : `_rels/${file}.rels`;

  const relations = new Map<string, Relation>();
  const xml = pkg.text(relsPath);
  if (!xml) return relations;

  const root = parseRoot(xml);
  if (!root) return relations;

  for (const node of findAll(root, "Relationship")) {
    const id = attrOf(node, "Id");
    const target = attrOf(node, "Target");
    if (!id || !target) continue;
    relations.set(id, {
      id,
      type: attrOf(node, "Type") ?? "",
      target: resolvePartPath(dir, target),
    });
  }
  return relations;
}

/** Resolve a relationship target (relative or absolute) against its part. */
export function resolvePartPath(dir: string, target: string): string {
  if (target.startsWith("/")) return normalisePath(target);
  if (/^[a-z]+:/i.test(target)) return target; // external URL

  const segments = `${dir}/${target}`.split("/");
  const stack: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") stack.pop();
    else stack.push(segment);
  }
  return stack.join("/");
}

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  emf: "image/emf",
  wmf: "image/wmf",
};

/** Inline a media part as a data URL so exported HTML/Markdown is portable. */
export function dataUrlFor(pkg: OfficePackage, path: string): string | null {
  const bytes = pkg.bytes(path);
  if (!bytes) return null;
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) return null;
  return `data:${mime};base64,${toBase64(bytes)}`;
}

export function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Decode an HTML entity, tolerating the handful that appear in OOXML runs. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}
