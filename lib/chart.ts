/**
 * Chart data parsing plus the small formatting helpers shared by the
 * Recharts preview. Chart drawing itself lives in the client component.
 */

import { parseCsv } from "./csv";
import { codedError } from "./errors";

export type ChartKind = "bar" | "line" | "area" | "pie" | "scatter";

export interface ChartSeries {
  name: string;
  /** One entry per label; null marks a gap (empty or non-numeric cell) */
  values: (number | null)[];
}

export interface ChartData {
  labels: string[];
  series: ChartSeries[];
  format: "csv" | "json";
}

export interface ChartTheme {
  text: string;
  muted: string;
  grid: string;
  axis: string;
  background: string;
}

export const LIGHT_THEME: ChartTheme = {
  text: "#18181b",
  muted: "#71717a",
  grid: "#e4e4e7",
  axis: "#a1a1aa",
  background: "#ffffff",
};

export const DARK_THEME: ChartTheme = {
  text: "#f4f4f5",
  muted: "#a1a1aa",
  grid: "#2e2e33",
  axis: "#52525b",
  background: "#131316",
};

export const CHART_COLORS = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#a855f7",
  "#f97316",
  "#0ea5e9",
];

const MAX_POINTS = 240;

/** Font stack shared by the preview, the exported SVG and the mind map */
export const CHART_FONT = "system-ui, -apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif";

/* ══════════════════════════════════════════════════════════════
   Parsing
   ══════════════════════════════════════════════════════════════ */

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/,/g, "").replace(/\s/g, "");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface ChartParseOptions {
  /** Legend name for inputs that carry no column names (a bare number array) */
  valueLabel?: string;
}

/**
 * Read CSV or JSON into labels plus numeric series.
 *
 * CSV: the first column is the category axis, every other column whose cells
 * parse as numbers becomes a series. JSON: an array of objects is split into
 * a label key and numeric keys; an array of numbers or an object of
 * label → number becomes one series.
 */
export function parseChartData(text: string, options: ChartParseOptions = {}): ChartData {
  const src = text.replace(/^\uFEFF/, "").trim();
  if (!src) throw codedError("chart.empty");

  if (src.startsWith("[") || src.startsWith("{")) {
    return parseJsonData(src, options.valueLabel ?? "Value");
  }
  return parseCsvData(src);
}

function parseCsvData(text: string): ChartData {
  const table = parseCsv(text);
  if (!table) throw codedError("chart.empty");

  const rows = table.rows.slice(0, MAX_POINTS);
  const labels = rows.map((row, index) => row[0]?.trim() || `#${index + 1}`);

  // A single numeric column has no category axis, so use row numbers instead
  if (table.header.length === 1) {
    const values = rows.map((row) => toNumber(row[0]));
    if (!values.some((v) => v !== null)) throw codedError("chart.noSeries");
    return {
      labels: rows.map((_, index) => `#${index + 1}`),
      series: [{ name: table.header[0] || "Value", values }],
      format: "csv",
    };
  }

  const series: ChartSeries[] = [];
  for (let column = 1; column < table.header.length; column += 1) {
    const values = rows.map((row) => toNumber(row[column]));
    if (values.some((v) => v !== null)) {
      series.push({ name: table.header[column] || `Column ${column + 1}`, values });
    }
  }
  if (series.length === 0) throw codedError("chart.noSeries");

  return { labels, series, format: "csv" };
}

function parseJsonData(text: string, valueLabel: string): ChartData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw codedError("chart.jsonInvalid");
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) throw codedError("chart.empty");

    if (parsed.every((item) => toNumber(item) !== null)) {
      const values = parsed.slice(0, MAX_POINTS).map((item) => toNumber(item));
      return {
        labels: values.map((_, index) => `#${index + 1}`),
        series: [{ name: valueLabel, values }],
        format: "json",
      };
    }

    if (Array.isArray(parsed[0])) {
      return parseJsonRows(parsed as unknown[][]);
    }

    const records = parsed.filter(isRecord).slice(0, MAX_POINTS);
    if (records.length === 0) throw codedError("chart.empty");
    return parseRecords(records);
  }

  if (isRecord(parsed)) {
    const entries = Object.entries(parsed);
    if (entries.length === 0) throw codedError("chart.empty");

    // label → number, e.g. { "A": 12, "B": 5 }
    if (entries.every(([, value]) => toNumber(value) !== null)) {
      return {
        labels: entries.slice(0, MAX_POINTS).map(([key]) => key),
        series: [
          {
            name: valueLabel,
            values: entries.slice(0, MAX_POINTS).map(([, value]) => toNumber(value)),
          },
        ],
        format: "json",
      };
    }

    // label → object, e.g. { "A": { x: 1, y: 2 } }
    if (entries.every(([, value]) => isRecord(value))) {
      const records: Record<string, unknown>[] = entries.slice(0, MAX_POINTS).map(([key, value]) => ({
        ...(value as Record<string, unknown>),
        __label: key,
      }));
      const keys: string[] = [];
      for (const record of records) {
        for (const key of Object.keys(record)) if (!keys.includes(key)) keys.push(key);
      }
      const series = keys
        .filter((key) => key !== "__label")
        .map((key) => ({ name: key, values: records.map((record) => toNumber(record[key])) }))
        .filter((entry) => entry.values.some((v) => v !== null));
      if (series.length === 0) throw codedError("chart.noSeries");
      return {
        labels: records.map((record) => String(record.__label)),
        series,
        format: "json",
      };
    }

    return parseRecords([parsed]);
  }

  throw codedError("chart.empty");
}

/** Array of arrays: optional header row, first column is the label */
function parseJsonRows(rows: unknown[][]): ChartData {
  const first = rows[0] ?? [];
  const hasHeader = first.every((cell) => toNumber(cell) === null);
  const header = hasHeader
    ? first.map((cell, index) => String(cell ?? "").trim() || `Column ${index + 1}`)
    : first.map((_, index) => `Column ${index + 1}`);
  const body = (hasHeader ? rows.slice(1) : rows).slice(0, MAX_POINTS);

  const labels = body.map((row, index) => String(row[0] ?? "").trim() || `#${index + 1}`);
  const series: ChartSeries[] = [];
  for (let column = 1; column < header.length; column += 1) {
    const values = body.map((row) => toNumber(row[column]));
    if (values.some((v) => v !== null)) series.push({ name: header[column], values });
  }
  if (series.length === 0) throw codedError("chart.noSeries");
  return { labels, series, format: "json" };
}

/** Objects: choose a text column as the label, numeric columns as series */
function parseRecords(records: Record<string, unknown>[]): ChartData {
  const keys: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  if (keys.length === 0) throw codedError("chart.empty");

  const labelKey =
    keys.find((key) => records.some((record) => toNumber(record[key]) === null)) ??
    keys.find((key) => records.every((record) => record[key] !== undefined)) ??
    keys[0];

  const labels = records.map((record, index) => String(record[labelKey] ?? "").trim() || `#${index + 1}`);

  const series: ChartSeries[] = [];
  for (const key of keys) {
    if (key === labelKey) continue;
    const values = records.map((record) => toNumber(record[key]));
    if (values.some((v) => v !== null)) series.push({ name: key, values });
  }
  if (series.length === 0) throw codedError("chart.noSeries");

  return { labels, series, format: "json" };
}

/* ══════════════════════════════════════════════════════════════
   Formatting helpers
   ══════════════════════════════════════════════════════════════ */

/** Font size aware width estimate; CJK glyphs are roughly twice as wide */
export function textWidth(text: string, size: number): number {
  let width = 0;
  for (const char of text) {
    width += /[\u2e80-\u9fff\uff00-\uffef]/.test(char) ? size : size * 0.55;
  }
  return width;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatChartNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${round(value / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${round(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${round(value / 1_000)}k`;
  if (abs > 0 && abs < 0.01) return value.toExponential(2);
  return String(round(value));
}



export const CHART_SAMPLES = {
  zh: {
    sales: `月份,销售额,利润
1月,120,32
2月,156,41
3月,178,52
4月,204,61
5月,232,70
6月,260,84`,
  },
  en: {
    sales: `Month,Sales,Profit
Jan,120,32
Feb,156,41
Mar,178,52
Apr,204,61
May,232,70
Jun,260,84`,
  },
} as const;
