/**
 * CSV helpers: parsing into a header + row matrix, statistics per column,
 * and serialising an edited matrix back to delimited text.
 */

import Papa from "papaparse";

export interface CsvTable {
  /** First row of the file, or generated names when it looked like data */
  header: string[];
  /** Body rows, all padded to `header.length` */
  rows: string[][];
  /** Delimiter papaparse guessed for this file */
  delimiter: string;
}

const DELIMITERS = [",", "\t", ";", "|"];

/** papaparse falls back to comma; keep the guess readable in the UI */
export function delimiterName(delimiter: string): string {
  if (delimiter === "\t") return "Tab";
  if (delimiter === ";") return ";";
  if (delimiter === "|") return "|";
  return ",";
}

/**
 * Detect the separator ourselves instead of trusting papaparse's guess:
 * the first line is counted for each candidate, ignoring quoted sections.
 */
export function sniffDelimiter(text: string): string {
  const line =
    text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .find((row) => row.trim() !== "") ?? "";
  if (!line) return ",";

  let best = ",";
  let bestCount = 0;
  for (const candidate of DELIMITERS) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') quoted = !quoted;
      else if (!quoted && ch === candidate) count++;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return bestCount === 0 ? "," : best;
}

function defaultHeader(index: number): string {
  return `Column ${index + 1}`;
}

/**
 * Parse delimited text. Returns null for empty input; malformed quotes are
 * tolerated because papaparse recovers and reports them as warnings.
 */
export function parseCsv(text: string, delimiter = ""): CsvTable | null {
  const src = text.replace(/^\uFEFF/, "");
  if (!src.trim()) return null;

  const separator = delimiter || sniffDelimiter(src);
  const result = Papa.parse<string[]>(src, {
    delimiter: separator,
    skipEmptyLines: "greedy",
    newline: undefined,
  });

  const data = result.data.filter(
    (row) => Array.isArray(row) && row.some((cell) => String(cell).trim() !== "")
  );
  if (data.length === 0) return null;

  const [head, ...body] = data;
  const width = head.length;
  const header = head.map((cell, i) => {
    const name = String(cell ?? "").trim();
    return name === "" ? defaultHeader(i) : name;
  });

  const rows = body.map((row) => {
    const next = row.slice(0, width).map((cell) => String(cell ?? ""));
    while (next.length < width) next.push("");
    return next;
  });

  return { header, rows, delimiter: separator };
}

/** Serialise the matrix back to text, quoting only where needed */
export function stringifyCsv(table: CsvTable, delimiter = table.delimiter): string {
  return Papa.unparse(
    { fields: table.header, data: table.rows },
    { delimiter, newline: "\n" }
  );
}

export function tableToMarkdown(table: CsvTable): string {
  const escape = (cell: string) => cell.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [
    `| ${table.header.map(escape).join(" | ")} |`,
    `| ${table.header.map(() => "---").join(" | ")} |`,
    ...table.rows.map((row) => `| ${row.map(escape).join(" | ")} |`),
  ];
  return lines.join("\n");
}

/* ══════════════════════════════════════════════════════════════
   Column statistics
   ══════════════════════════════════════════════════════════════ */

export type ColumnKind = "number" | "date" | "boolean" | "text" | "empty";

export interface ColumnStat {
  index: number;
  name: string;
  empty: number;
  unique: number;
  kind: ColumnKind;
}

const BOOLEAN_VALUES = new Set(["true", "false", "yes", "no", "y", "n", "1", "0"]);
const DATE_RE = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/;

function columnKind(values: string[]): ColumnKind {
  const filled = values.filter((v) => v.trim() !== "");
  if (filled.length === 0) return "empty";
  if (filled.every((v) => DATE_RE.test(v.trim()) && !Number.isNaN(Date.parse(v.trim())))) {
    return "date";
  }
  if (filled.every((v) => v.trim() !== "" && Number.isFinite(Number(v.replace(/,/g, ""))))) {
    return "number";
  }
  if (filled.every((v) => BOOLEAN_VALUES.has(v.trim().toLowerCase()))) return "boolean";
  return "text";
}

export function columnStats(table: CsvTable): ColumnStat[] {
  return table.header.map((name, index) => {
    const values = table.rows.map((row) => row[index] ?? "");
    return {
      index,
      name,
      empty: values.filter((v) => v.trim() === "").length,
      unique: new Set(values.map((v) => v.trim())).size,
      kind: columnKind(values),
    };
  });
}

/* ══════════════════════════════════════════════════════════════
   Editing helpers
   ══════════════════════════════════════════════════════════════ */

export function setCell(
  table: CsvTable,
  row: number,
  column: number,
  value: string
): CsvTable {
  const rows = table.rows.map((cells, r) =>
    r === row ? cells.map((cell, c) => (c === column ? value : cell)) : cells
  );
  return { ...table, rows };
}

export function setHeader(table: CsvTable, column: number, value: string): CsvTable {
  const header = table.header.map((cell, c) => (c === column ? value : cell));
  return { ...table, header };
}

export function addRow(table: CsvTable): CsvTable {
  return { ...table, rows: [...table.rows, table.header.map(() => "")] };
}

export function removeRow(table: CsvTable, index: number): CsvTable {
  return { ...table, rows: table.rows.filter((_, r) => r !== index) };
}

export function removeColumn(table: CsvTable, index: number): CsvTable {
  return {
    header: table.header.filter((_, c) => c !== index),
    rows: table.rows.map((row) => row.filter((_, c) => c !== index)),
    delimiter: table.delimiter,
  };
}

export function addColumn(table: CsvTable): CsvTable {
  return {
    header: [...table.header, defaultHeader(table.header.length)],
    rows: table.rows.map((row) => [...row, ""]),
    delimiter: table.delimiter,
  };
}

export const CSV_SAMPLE = `id,name,email,signup,city
1,Alice Chen,alice@example.com,2024-01-12,Shanghai
2,Bob Li,bob@example.com,2024-02-03,Beijing
3,Carol Wu,carol@example.com,2024-03-21,Shenzhen
4,Dan Zhou,dan@example.com,2024-04-08,Hangzhou`;

export const TSV_SAMPLE = `id\tname\tqty\tprice
1\tKeyboard\t2\t299
2\tMouse\t1\t129`;
