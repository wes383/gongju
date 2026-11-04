/**
 * Turn a two- or three-column list of terms into a file Anki can import.
 *
 * Anki reads a few `#` directive lines before the data (`#separator`,
 * `#html`, `#tags column`, `#deck`, `#notetype`) and then plain delimited rows,
 * so the work here is mostly deciding which cell is a field and which one is
 * the tag list, then quoting anything that would break the delimiter.
 */

import Papa from "papaparse";
import { codedError } from "./errors";
import { sniffDelimiter } from "./csv";

export type AnkiSeparator = "tab" | "comma" | "semicolon";

const SEPARATORS: Record<AnkiSeparator, string> = {
  tab: "\t",
  comma: ",",
  semicolon: ";",
};

export interface AnkiOptions {
  /** Delimiter of the generated file */
  separator?: AnkiSeparator;
  /** Treat fields as HTML so line breaks survive */
  html?: boolean;
  /** Escape &, < and > inside fields */
  escape?: boolean;
  /** Zero-based column that holds tags; null means no tag column */
  tagsColumn?: number | null;
  deck?: string;
  notetype?: string;
  dedupe?: boolean;
}

export interface AnkiSheet {
  text: string;
  /** Cards that made it into the file */
  cards: number;
  /** Rows dropped as duplicates or as too short to be a card */
  skipped: number;
  columns: number;
  /** Delimiter used in the output, as a single character */
  delimiter: string;
}

function escapeHtmlCell(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r|\n/g, "<br>");
}

function normalizeTags(value: string): string {
  return value
    .split(/[\s,;]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Parse the pasted list. A tab in the first line wins over any comma count —
 * a meaning cell that contains "a, b" would otherwise flip the whole file to
 * comma-separated.
 */
export function parseTermList(input: string, delimiter = ""): string[][] {
  const src = input.replace(/^\uFEFF/, "");
  if (!src.trim()) return [];
  const first = src.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  const separator = delimiter || (first.includes("\t") ? "\t" : sniffDelimiter(src));
  const result = Papa.parse<string[]>(src, {
    delimiter: separator,
    header: false,
    skipEmptyLines: "greedy",
  });
  return result.data
    .filter((row) => Array.isArray(row) && row.some((cell) => String(cell).trim() !== ""))
    .map((row) => row.map((cell) => String(cell ?? "").trim()));
}

export function buildAnkiSheet(input: string, options: AnkiOptions = {}): AnkiSheet {
  const separator = options.separator ?? "tab";
  const delimiter = SEPARATORS[separator];
  const html = options.html ?? true;
  const escape = options.escape ?? true;
  const tagsColumn = options.tagsColumn ?? null;
  const rows = parseTermList(input);
  if (rows.length === 0) throw codedError("anki.empty");

  const columns = Math.max(...rows.map((row) => row.length));
  if (columns < 2) throw codedError("anki.columns");

  const seen = new Set<string>();
  const cards: string[][] = [];
  let skipped = 0;

  for (const row of rows) {
    const padded = [...row];
    while (padded.length < columns) padded.push("");

    // A tag column alone is not a card: the front has to say something
    const fieldCells = padded.filter((_, index) => index !== tagsColumn);
    if (fieldCells.every((cell) => cell === "")) {
      skipped += 1;
      continue;
    }

    const cells = padded.map((cell, index) => {
      const value = index === tagsColumn ? normalizeTags(cell) : cell;
      return escape && index !== tagsColumn ? escapeHtmlCell(value) : value;
    });

    if (options.dedupe ?? true) {
      const key = cells.filter((_, index) => index !== tagsColumn).join("\u0000");
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);
    }
    cards.push(cells);
  }

  if (cards.length === 0) throw codedError("anki.empty");

  const header = [`#separator:${separator}`];
  if (html) header.push("#html:true");
  if (tagsColumn !== null && tagsColumn >= 0 && tagsColumn < columns) {
    header.push(`#tags column:${tagsColumn + 1}`);
  }
  if (options.deck?.trim()) header.push(`#deck:${options.deck.trim()}`);
  if (options.notetype?.trim()) header.push(`#notetype:${options.notetype.trim()}`);

  const body = Papa.unparse(cards, { delimiter, newline: "\n" });

  return {
    text: `${header.join("\n")}\n${body}`,
    cards: cards.length,
    skipped,
    columns: tagsColumn === null ? columns : columns - 1,
    delimiter,
  };
}
