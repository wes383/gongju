/**
 * Turn a delimited table into SQL: CREATE TABLE from inferred column types
 * plus batched INSERT statements, for MySQL, PostgreSQL and SQLite.
 */

import { columnStats, type ColumnKind, type CsvTable } from "@/lib/csv";

export type SqlDialect = "mysql" | "postgres" | "sqlite";

export interface SqlOptions {
  table: string;
  dialect: SqlDialect;
  includeCreate: boolean;
  batchSize: number;
}

function sanitize(name: string, fallback: string): string {
  const clean = name
    .trim()
    .replace(/["`]/g, "")
    .replace(/[^\w\u4e00-\u9fa5]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean === "" ? fallback : /^\d/.test(clean) ? `c_${clean}` : clean;
}

export function quoteIdent(name: string, dialect: SqlDialect): string {
  return dialect === "mysql" ? `\`${name}\`` : `"${name}"`;
}

const TYPE_MAP: Record<SqlDialect, Record<ColumnKind, string>> = {
  mysql: {
    number: "DOUBLE",
    date: "DATETIME",
    boolean: "TINYINT(1)",
    text: "VARCHAR(255)",
    empty: "VARCHAR(255)",
  },
  postgres: {
    number: "double precision",
    date: "timestamp",
    boolean: "boolean",
    text: "text",
    empty: "text",
  },
  sqlite: {
    number: "REAL",
    date: "TEXT",
    boolean: "INTEGER",
    text: "TEXT",
    empty: "TEXT",
  },
};

/** Integers get a narrower type than decimals */
function columnType(table: CsvTable, index: number, kind: ColumnKind, dialect: SqlDialect) {
  if (kind !== "number") return TYPE_MAP[dialect][kind];
  const values = table.rows
    .map((row) => (row[index] ?? "").replace(/,/g, "").trim())
    .filter((value) => value !== "");
  const integers = values.length > 0 && values.every((value) => Number.isInteger(Number(value)));
  if (!integers) {
    return dialect === "mysql" ? "DOUBLE" : dialect === "postgres" ? "double precision" : "REAL";
  }
  return dialect === "postgres" ? "integer" : "INTEGER";
}

const BOOLEAN_TRUE = new Set(["true", "yes", "y", "1", "是"]);
const BOOLEAN_FALSE = new Set(["false", "no", "n", "0", "否"]);

function escapeString(value: string, dialect: SqlDialect): string {
  const escaped = value.replace(/'/g, "''");
  return dialect === "mysql" ? `'${escaped.replace(/\\/g, "\\\\")}'` : `'${escaped}'`;
}

function literal(value: string, kind: ColumnKind, dialect: SqlDialect): string {
  const raw = value.trim();
  if (raw === "") return "NULL";

  if (kind === "number") {
    const numeric = raw.replace(/,/g, "");
    return Number.isFinite(Number(numeric)) ? numeric : escapeString(raw, dialect);
  }

  if (kind === "boolean") {
    const lower = raw.toLowerCase();
    if (BOOLEAN_TRUE.has(lower)) return dialect === "postgres" ? "TRUE" : "1";
    if (BOOLEAN_FALSE.has(lower)) return dialect === "postgres" ? "FALSE" : "0";
    return escapeString(raw, dialect);
  }

  return escapeString(raw, dialect);
}

export function buildCreateTable(table: CsvTable, options: SqlOptions): string {
  const stats = columnStats(table);
  const columns = stats.map((stat) => {
    const name = quoteIdent(sanitize(stat.name, `column_${stat.index + 1}`), options.dialect);
    return `  ${name} ${columnType(table, stat.index, stat.kind, options.dialect)}`;
  });
  return `CREATE TABLE ${quoteIdent(sanitize(options.table, "table_name"), options.dialect)} (\n${columns.join(
    ",\n"
  )}\n);`;
}

export function buildInserts(table: CsvTable, options: SqlOptions): string {
  if (table.rows.length === 0) return "";

  const stats = columnStats(table);
  const tableName = quoteIdent(sanitize(options.table, "table_name"), options.dialect);
  const columns = stats
    .map((stat) => quoteIdent(sanitize(stat.name, `column_${stat.index + 1}`), options.dialect))
    .join(", ");

  const batchSize = Math.max(1, options.batchSize);
  const statements: string[] = [];

  for (let start = 0; start < table.rows.length; start += batchSize) {
    const chunk = table.rows.slice(start, start + batchSize);
    const values = chunk
      .map((row) => {
        const cells = stats.map((stat) =>
          literal(row[stat.index] ?? "", stat.kind, options.dialect)
        );
        return `  (${cells.join(", ")})`;
      })
      .join(",\n");
    statements.push(`INSERT INTO ${tableName} (${columns}) VALUES\n${values};`);
  }

  return statements.join("\n\n");
}

export function buildSql(table: CsvTable, options: SqlOptions): string {
  const parts: string[] = [];
  if (options.includeCreate) parts.push(buildCreateTable(table, options));
  const inserts = buildInserts(table, options);
  if (inserts) parts.push(inserts);
  return parts.join("\n\n");
}

export const SQL_SAMPLE = `id,name,email,age,active,signup
1,Alice Chen,alice@example.com,29,true,2024-01-12
2,Bob Li,bob@example.com,34,false,2024-02-03
3,Carol Wu,carol@example.com,27,true,2024-03-21`;
