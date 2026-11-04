/**
 * XLSX reader.
 *
 * The `xlsx` package is off limits in this project (known CVEs in the published
 * builds), so sheets are read straight from the OOXML parts: workbook.xml lists
 * the sheets, sharedStrings.xml holds the string table, styles.xml decides
 * which numbers are really dates, and each sheetN.xml carries the cells.
 *
 * Numbers are kept as strings — this feeds a table view and a CSV export, not a
 * calculation engine, and string cells avoid float formatting surprises.
 */

import {
  attrOf,
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

export const XLSX_MAX_ROWS = 20_000;
export const XLSX_MAX_COLS = 200;

export interface Sheet {
  name: string;
  rows: string[][];
}

export interface Workbook {
  sheets: Sheet[];
}

/** A1 → 0, AA1 → 26. The ref always starts with the column letters. */
function columnIndex(ref: string): number {
  let index = 0;
  for (let i = 0; i < ref.length; i += 1) {
    const code = ref.charCodeAt(i);
    if (code < 65 || code > 90) break;
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

export function parseXlsx(bytes: Uint8Array<ArrayBuffer>): Workbook {
  const pkg = openPackage(bytes);

  const workbookXml = pkg.text("xl/workbook.xml");
  if (!workbookXml) throw codedError("office.invalid");

  const shared = readSharedStrings(pkg);
  const styles = readStyles(pkg);
  const relations = readRelations(pkg, "xl/workbook.xml");

  const root = parseRoot(workbookXml);
  const sheetNodes = root ? findAll(root, "sheet") : [];
  if (sheetNodes.length === 0) throw codedError("office.invalid");

  const sheets: Sheet[] = [];
  sheetNodes.forEach((node, order) => {
    const name = attrOf(node, "name") ?? `Sheet${order + 1}`;
    const relId = attrOf(node, "r:id");
    const target = relId ? relations.get(relId)?.target : undefined;
    const fallback = `xl/worksheets/sheet${order + 1}.xml`;
    const xml = pkg.text(target ?? fallback) ?? pkg.text(fallback);
    if (!xml) return;

    sheets.push({ name, rows: readSheet(xml, shared, styles) });
  });

  if (sheets.length === 0) throw codedError("office.invalid");
  return { sheets };
}

function readSharedStrings(pkg: ReturnType<typeof openPackage>): string[] {
  const xml = pkg.text("xl/sharedStrings.xml");
  if (!xml) return [];

  const root = parseRoot(xml);
  if (!root) return [];

  return findAll(root, "si").map((item) => {
    // A string can be split across runs (rich text); concatenate them
    const runs = findAll(item, "r");
    if (runs.length === 0) return textOf(item);
    return runs.map((run) => textOf(run)).join("");
  });
}

function readStyles(pkg: ReturnType<typeof openPackage>): boolean[] {
  const xml = pkg.text("xl/styles.xml");
  if (!xml) return [];

  const root = parseRoot(xml);
  if (!root) return [];

  const custom = new Map<string, string>();
  for (const format of findAll(root, "numFmt")) {
    const id = attrOf(format, "numFmtId");
    const code = attrOf(format, "formatCode");
    if (id && code) custom.set(id, code);
  }

  // xf entries carry numFmtId; cellXfs order is the style index used by <c s="">
  const cellXfs = findAll(root, "cellXfs")[0];
  if (!cellXfs) return [];

  return elementsOf(cellXfs)
    .filter((node) => tagOf(node) === "xf")
    .map((xf) => {
      const id = attrOf(xf, "numFmtId") ?? "0";
      return isDateFormat(id, custom.get(id));
    });
}

const DATE_FORMAT_IDS = new Set([
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "45",
  "46",
  "47",
]);

function isDateFormat(id: string, code: string | undefined): boolean {
  if (DATE_FORMAT_IDS.has(id)) return true;
  if (!code) return false;
  // Strip literals and colour/locale blocks before looking for date tokens
  const clean = code
    .replace(/"[^"]*"/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\\./g, "");
  return /[ymdhs]/i.test(clean) && !/[#0]/.test(clean);
}

function readSheet(xml: string, shared: string[], styles: boolean[]): string[][] {
  const root = parseRoot(xml);
  if (!root) return [];

  const sheetData = findAll(root, "sheetData")[0];
  if (!sheetData) return [];

  const rows: string[][] = [];

  for (const rowNode of elementsOf(sheetData)) {
    if (tagOf(rowNode) !== "row") continue;
    if (rows.length >= XLSX_MAX_ROWS) throw codedError("office.tooLarge", XLSX_MAX_ROWS);

    const row: string[] = [];
    let cursor = 0;

    for (const cell of elementsOf(rowNode)) {
      if (tagOf(cell) !== "c") continue;
      const ref = attrOf(cell, "r");
      const index = ref ? columnIndex(ref) : cursor;
      cursor = index + 1;
      if (index >= XLSX_MAX_COLS) continue;
      row[index] = readCell(cell, shared, styles);
    }

    rows.push(Array.from({ length: row.length }, (_, i) => row[i] ?? ""));
  }

  return trimTrailingEmpties(rows);
}

function readCell(cell: XmlNode, shared: string[], styles: boolean[]): string {
  const type = attrOf(cell, "t") ?? "n";
  const valueNode = findChild(cell, "v");
  const raw = valueNode ? textOf(valueNode) : "";

  if (type === "s") {
    const index = Number(raw);
    return Number.isFinite(index) ? (shared[index] ?? "") : "";
  }

  if (type === "inlineStr") {
    const inline = findChild(cell, "is");
    return inline ? findAll(inline, "t").map((node) => textOf(node)).join("") : "";
  }

  if (type === "b") return raw === "1" ? "TRUE" : raw === "0" ? "FALSE" : raw;
  if (type === "str" || type === "e") return raw;

  if (type === "d") return raw.replace("T", " ").replace(/\.\d+Z?$/, "");

  if (raw === "") return "";

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return raw;

  const styleIndex = Number(attrOf(cell, "s") ?? "-1");
  if (styleIndex >= 0 && styles[styleIndex]) return formatSerialDate(numeric);

  // Round away float noise (0.30000000000000004) without forcing decimals
  return String(Math.round(numeric * 1e10) / 1e10);
}

const MS_PER_DAY = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

/** Excel stores dates as days since 1899-12-30 (the 1900 leap bug is baked in). */
export function formatSerialDate(serial: number): string {
  const ms = EXCEL_EPOCH + Math.round(serial * MS_PER_DAY);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return String(serial);

  const pad = (value: number) => String(value).padStart(2, "0");
  const day = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  const time = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  return serial % 1 === 0 ? day : `${day} ${time}`;
}

/** Drop trailing empty rows and columns, which every producer ships plenty of. */
function trimTrailingEmpties(rows: string[][]): string[][] {
  let end = rows.length;
  while (end > 0 && rows[end - 1].every((cell) => cell === "")) end -= 1;
  const trimmed = rows.slice(0, end);

  let width = 0;
  for (const row of trimmed) {
    for (let i = row.length - 1; i >= 0; i -= 1) {
      if (row[i] !== "") {
        width = Math.max(width, i + 1);
        break;
      }
    }
  }

  return trimmed.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ""));
}

/** RFC 4180 quoting, so commas, quotes and newlines survive the round trip. */
export function sheetToCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
          return cell;
        })
        .join(",")
    )
    .join("\r\n");
}

/**
 * Cleaning step for the viewer: drop rows that are entirely empty and, when
 * asked, collapse duplicate rows while keeping the first occurrence.
 */
export function cleanRows(
  rows: string[][],
  options: { dropEmpty?: boolean; dedupe?: boolean } = {}
): string[][] {
  const { dropEmpty = true, dedupe = false } = options;
  const seen = new Set<string>();
  const out: string[][] = [];

  for (const row of rows) {
    if (dropEmpty && row.every((cell) => cell.trim() === "")) continue;
    if (dedupe) {
      const key = row.join("\u0000");
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(row);
  }

  return out;
}

/** Guard used by the UI before parsing, so huge sheets fail fast and clearly. */
export function looksLikeXlsx(bytes: Uint8Array<ArrayBuffer>): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}
