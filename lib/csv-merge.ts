/**
 * CSV merging: stack tables with different columns (append), or join two tables
 * on a key column (left / inner join).
 *
 * Column matching is by header name, which is what people expect when they
 * export two reports from the same system.
 */

import { codedError } from "./errors";
import type { CsvTable } from "./csv";

export type MergeMode = "append" | "join";
export type JoinType = "left" | "inner";

export interface MergeOptions {
  mode: MergeMode;
  joinType?: JoinType;
  leftKey?: string;
  rightKey?: string;
  /** Append a column recording which file each row came from */
  sourceColumn?: boolean;
  /** Labels for the source column, aligned with the input order */
  sourceLabels?: string[];
  /** Header used for the appended source column */
  sourceHeader?: string;
}

export type MergeIssueCode = "duplicate-key" | "empty-key" | "header-mismatch";

export interface MergeIssue {
  code: MergeIssueCode;
  /** Column name or key the issue refers to */
  detail?: string;
  count?: number;
}

export interface MergeStats {
  rows: number;
  columns: number;
  matched: number;
  leftUnmatched: number;
  /** Right-hand rows whose key never appeared on the left */
  rightOnly: number;
}

export interface MergeResult {
  table: CsvTable;
  issues: MergeIssue[];
  stats: MergeStats;
}

/** Stack tables: the header is the union of all headers, in first-seen order */
export function appendTables(tables: CsvTable[], options: MergeOptions): MergeResult {
  if (tables.length === 0) throw codedError("csv.empty");

  const header: string[] = [];
  for (const table of tables) {
    for (const name of table.header) {
      if (!header.includes(name)) header.push(name);
    }
  }
  const labels = options.sourceLabels ?? [];
  const sourceHeader = options.sourceHeader ?? "source";

  const rows = tables.flatMap((table, tableIndex) =>
    table.rows.map((row) => {
      const cells = header.map((name) => {
        const index = table.header.indexOf(name);
        return index === -1 ? "" : (row[index] ?? "");
      });
      if (options.sourceColumn) cells.push(labels[tableIndex] ?? String(tableIndex + 1));
      return cells;
    })
  );

  const outHeader = options.sourceColumn ? [...header, sourceHeader] : header;
  const issues: MergeIssue[] = [];
  const widths = new Set(tables.map((t) => t.header.length));
  if (widths.size > 1) issues.push({ code: "header-mismatch", detail: header.join(", ") });

  return {
    table: { header: outHeader, rows, delimiter: tables[0].delimiter },
    issues,
    stats: {
      rows: rows.length,
      columns: outHeader.length,
      matched: 0,
      leftUnmatched: 0,
      rightOnly: 0,
    },
  };
}

/** Join two tables on a key column; the right key column is dropped from output */
export function joinTables(left: CsvTable, right: CsvTable, options: MergeOptions): MergeResult {
  const leftKey = options.leftKey ?? "";
  const rightKey = options.rightKey ?? "";
  const leftKeyIndex = left.header.indexOf(leftKey);
  const rightKeyIndex = right.header.indexOf(rightKey);
  if (leftKeyIndex === -1) throw codedError("csv.keyMissing", leftKey);
  if (rightKeyIndex === -1) throw codedError("csv.keyMissing", rightKey);

  const rightColumns = right.header
    .map((name, index) => ({ name, index }))
    .filter((column) => column.index !== rightKeyIndex);

  const used = new Set(left.header);
  const outHeader = [...left.header];
  const rightOutput = rightColumns.map((column) => {
    const name = used.has(column.name) ? `${column.name}_2` : column.name;
    used.add(name);
    outHeader.push(name);
    return { ...column, outName: name };
  });

  const issues: MergeIssue[] = [];
  const lookup = new Map<string, string[]>();
  let emptyKeys = 0;
  let duplicates = 0;

  for (const row of right.rows) {
    const key = (row[rightKeyIndex] ?? "").trim();
    if (!key) {
      emptyKeys += 1;
      continue;
    }
    if (lookup.has(key)) {
      duplicates += 1;
      continue;
    }
    lookup.set(key, row);
  }
  if (emptyKeys > 0) issues.push({ code: "empty-key", detail: rightKey, count: emptyKeys });
  if (duplicates > 0) issues.push({ code: "duplicate-key", detail: rightKey, count: duplicates });

  const rows: string[][] = [];
  const seenKeys = new Set<string>();
  let matched = 0;
  let leftUnmatched = 0;

  for (const row of left.rows) {
    const key = (row[leftKeyIndex] ?? "").trim();
    const rightRow = key ? lookup.get(key) : undefined;
    if (!rightRow) {
      leftUnmatched += 1;
      if (options.joinType === "inner") continue;
      rows.push([...row, ...rightOutput.map(() => "")]);
      continue;
    }
    matched += 1;
    if (key) seenKeys.add(key);
    rows.push([...row, ...rightOutput.map((column) => rightRow[column.index] ?? "")]);
  }

  const rightOnly = [...lookup.keys()].filter((key) => !seenKeys.has(key)).length;

  return {
    table: { header: outHeader, rows, delimiter: left.delimiter },
    issues,
    stats: {
      rows: rows.length,
      columns: outHeader.length,
      matched,
      leftUnmatched,
      rightOnly,
    },
  };
}

export function mergeTables(
  left: CsvTable,
  right: CsvTable | null,
  options: MergeOptions
): MergeResult {
  if (options.mode === "append") return appendTables(right ? [left, right] : [left], options);
  if (!right) throw codedError("csv.empty");
  return joinTables(left, right, options);
}
