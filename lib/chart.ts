/**
 * Chart data parsing plus the SVG renderer used by the chart maker tool.
 *
 * The renderer emits plain SVG on purpose: the preview and the PNG export
 * share one drawing path, and a canvas-only chart library could not produce
 * the vector export the tool promises.
 */

import { parseCsv } from "./csv";
import { escapeHtml } from "./encoding";
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
const FONT = "system-ui, -apple-system, 'Segoe UI', 'Noto Sans SC', sans-serif";

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
   Rendering
   ══════════════════════════════════════════════════════════════ */

export interface ChartOptions {
  kind: ChartKind;
  title?: string;
  width?: number;
  height?: number;
  theme?: ChartTheme;
  showLegend?: boolean;
  showValues?: boolean;
}

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

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function formatChartNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${round(value / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${round(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${round(value / 1_000)}k`;
  if (abs > 0 && abs < 0.01) return value.toExponential(2);
  return String(round(value));
}

export function niceScale(min: number, max: number, ticks = 5): { min: number; max: number; step: number } {
  let lo = Number.isFinite(min) ? min : 0;
  let hi = Number.isFinite(max) ? max : 1;
  if (lo === hi) {
    if (lo === 0) hi = 1;
    else if (lo > 0) lo = 0;
    else hi = 0;
  }
  const span = hi - lo || 1;
  const rough = span / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  return {
    min: Math.floor(lo / step) * step,
    max: Math.ceil(hi / step) * step,
    step,
  };
}

function dataRange(data: ChartData): { min: number; max: number } {
  const values: number[] = [];
  for (const series of data.series) {
    for (const value of series.values) {
      if (value !== null && Number.isFinite(value)) values.push(value);
    }
  }
  if (values.length === 0) throw codedError("chart.empty");
  return { min: Math.min(...values), max: Math.max(...values) };
}

interface LegendEntry {
  name: string;
  color: string;
}

interface LegendRow {
  entries: { name: string; color: string; x: number }[];
}

function layoutLegend(entries: LegendEntry[], maxWidth: number): LegendRow[] {
  const rows: LegendRow[] = [];
  let current: LegendRow = { entries: [] };
  let cursor = 0;
  for (const entry of entries) {
    const width = textWidth(entry.name, 12) + 22;
    if (cursor + width > maxWidth && current.entries.length > 0) {
      rows.push(current);
      current = { entries: [] };
      cursor = 0;
    }
    current.entries.push({ ...entry, x: cursor });
    cursor += width;
  }
  if (current.entries.length > 0) rows.push(current);
  return rows;
}

function legendSvg(rows: LegendRow[], x: number, y: number, theme: ChartTheme): string {
  return rows
    .map((row, rowIndex) =>
      row.entries
        .map(
          (entry) =>
            `<rect x="${round(x + entry.x)}" y="${round(y + rowIndex * 18 - 8)}" width="9" height="9" rx="2" fill="${entry.color}"/>` +
            `<text x="${round(x + entry.x + 14)}" y="${round(y + rowIndex * 18)}" font-size="12" fill="${theme.muted}">${escapeHtml(entry.name)}</text>`
        )
        .join("")
    )
    .join("");
}

function svgRoot(options: {
  width: number;
  height: number;
  theme: ChartTheme;
  title: string;
  body: string;
}): string {
  const { width, height, theme, title, body } = options;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img">` +
    `<title>${escapeHtml(title || "Chart")}</title>` +
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${theme.background}"/>` +
    body +
    `</svg>`
  );
}

export function renderChartSvg(data: ChartData, options: ChartOptions): string {
  const width = options.width ?? 760;
  const height = options.height ?? 440;
  const theme = options.theme ?? LIGHT_THEME;
  const title = options.title?.trim() ?? "";
  if (options.kind === "pie") return renderPie(data, { width, height, theme, title, showLegend: options.showLegend ?? true });
  return renderAxisChart(data, { ...options, width, height, theme, title });
}

function renderAxisChart(
  data: ChartData,
  options: Required<Pick<ChartOptions, "kind">> & {
    width: number;
    height: number;
    theme: ChartTheme;
    title: string;
    showLegend?: boolean;
    showValues?: boolean;
  }
): string {
  const { kind, width, height, theme, title } = options;
  const showLegend = options.showLegend ?? true;
  const showValues = options.showValues ?? false;

  const { min: dataMin, max: dataMax } = dataRange(data);
  const { min, max, step } = niceScale(Math.min(0, dataMin), dataMax, 5);

  const legendEntries: LegendEntry[] = showLegend
    ? data.series.map((series, index) => ({ name: series.name, color: CHART_COLORS[index % CHART_COLORS.length] }))
    : [];
  const legendRows = layoutLegend(legendEntries, width - 48);
  const titleHeight = title ? 24 : 0;
  const legendHeight = legendRows.length * 18;

  const padL = 58;
  const padR = 22;
  const padB = 42;
  const padT = 14 + titleHeight + legendHeight + (legendRows.length ? 10 : 0);
  const plotW = Math.max(120, width - padL - padR);
  const plotH = Math.max(100, height - padT - padB);

  const yOf = (value: number) => padT + plotH - ((value - min) / (max - min || 1)) * plotH;
  const zeroY = yOf(Math.max(min, Math.min(max, 0)));
  const band = plotW / Math.max(1, data.labels.length);

  const parts: string[] = [];
  if (title) {
    parts.push(
      `<text x="24" y="24" font-size="16" font-weight="600" fill="${theme.text}">${escapeHtml(title)}</text>`
    );
  }
  if (legendRows.length > 0) {
    parts.push(legendSvg(legendRows, 24, 34 + titleHeight, theme));
  }

  // Horizontal grid and value axis labels
  const ticks: number[] = [];
  for (let value = min; value <= max + step / 2; value += step) ticks.push(round(value));
  for (const tick of ticks) {
    const y = yOf(tick);
    parts.push(
      `<line x1="${padL}" y1="${round(y)}" x2="${padL + plotW}" y2="${round(y)}" stroke="${theme.grid}" stroke-width="1"/>` +
        `<text x="${padL - 10}" y="${round(y + 4)}" font-size="11" text-anchor="end" fill="${theme.muted}">${escapeHtml(formatChartNumber(tick))}</text>`
    );
  }
  parts.push(
    `<line x1="${padL}" y1="${round(zeroY)}" x2="${padL + plotW}" y2="${round(zeroY)}" stroke="${theme.axis}" stroke-width="1"/>`
  );

  // Category labels: every nth when crowded, so they never overlap
  const labelStep = Math.max(1, Math.ceil(data.labels.length / 12));
  data.labels.forEach((label, index) => {
    if (index % labelStep !== 0 && index !== data.labels.length - 1) return;
    parts.push(
      `<text x="${round(padL + band * (index + 0.5))}" y="${height - 16}" font-size="11" text-anchor="middle" fill="${theme.muted}">${escapeHtml(
        truncate(label, 12)
      )}</text>`
    );
  });

  if (kind === "bar") {
    const slot = band / data.series.length;
    const barWidth = Math.max(3, slot * 0.78);
    data.series.forEach((series, seriesIndex) => {
      const color = CHART_COLORS[seriesIndex % CHART_COLORS.length];
      series.values.forEach((value, index) => {
        if (value === null) return;
        const top = Math.min(yOf(value), zeroY);
        const barHeight = Math.max(1, Math.abs(zeroY - yOf(value)));
        const x = padL + band * index + slot * seriesIndex + (slot - barWidth) / 2;
        parts.push(
          `<rect x="${round(x)}" y="${round(top)}" width="${round(barWidth)}" height="${round(barHeight)}" rx="2" fill="${color}"/>`
        );
        if (showValues) {
          parts.push(
            `<text x="${round(x + barWidth / 2)}" y="${round(value >= 0 ? top - 4 : top + barHeight + 12)}" font-size="10" text-anchor="middle" fill="${theme.muted}">${escapeHtml(
              formatChartNumber(value)
            )}</text>`
          );
        }
      });
    });
  } else if (kind === "scatter") {
    const numericLabels = data.labels.every((label) => toNumber(label) !== null);
    const xs = numericLabels ? data.labels.map((label) => Number(label.replace(/,/g, ""))) : data.labels.map((_, index) => index);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const xOf = (index: number) =>
      numericLabels && xMax !== xMin
        ? padL + ((xs[index] - xMin) / (xMax - xMin)) * plotW
        : padL + band * (index + 0.5);

    data.series.forEach((series, seriesIndex) => {
      const color = CHART_COLORS[seriesIndex % CHART_COLORS.length];
      series.values.forEach((value, index) => {
        if (value === null) return;
        parts.push(
          `<circle cx="${round(xOf(index))}" cy="${round(yOf(value))}" r="4" fill="${color}" fill-opacity="0.85"/>`
        );
      });
    });
  } else {
    // line / area share the coordinate mapping; area adds a fill below the line
    const xOf = (index: number) => padL + band * (index + 0.5);
    data.series.forEach((series, seriesIndex) => {
      const color = CHART_COLORS[seriesIndex % CHART_COLORS.length];
      const segments: number[][] = [];
      let current: number[] = [];
      series.values.forEach((value, index) => {
        if (value === null) {
          if (current.length > 0) segments.push(current);
          current = [];
        } else {
          current.push(index);
        }
      });
      if (current.length > 0) segments.push(current);

      for (const segment of segments) {
        if (segment.length === 0) continue;
        const points = segment.map((index) => `${round(xOf(index))},${round(yOf(series.values[index] as number))}`);
        if (kind === "area") {
          const baseline = round(zeroY);
          parts.push(
            `<path d="M ${round(xOf(segment[0]))} ${baseline} L ${points.join(" L ")} L ${round(
              xOf(segment[segment.length - 1])
            )} ${baseline} Z" fill="${color}" fill-opacity="0.18" stroke="none"/>`
          );
        }
        parts.push(
          `<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
        );
        if (segment.length === 1 || data.labels.length <= 24) {
          segment.forEach((index) => {
            parts.push(`<circle cx="${round(xOf(index))}" cy="${round(yOf(series.values[index] as number))}" r="3" fill="${color}"/>`);
          });
        }
      }
    });
  }

  return svgRoot({ width, height, theme, title, body: parts.join("") });
}

function renderPie(
  data: ChartData,
  options: { width: number; height: number; theme: ChartTheme; title: string; showLegend: boolean }
): string {
  const { width, height, theme, title, showLegend } = options;
  const series = data.series[0];
  if (!series) throw codedError("chart.empty");

  const values = series.values.map((value) => (value === null ? 0 : Math.max(0, value)));
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) throw codedError("chart.empty");

  const legendEntries: LegendEntry[] = data.labels.map((label, index) => ({
    name: `${label} · ${round((values[index] / total) * 100)}%`,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const titleHeight = title ? 24 : 0;
  const top = 14 + titleHeight;
  const radius = Math.max(60, Math.min(width * 0.26, (height - top - 24) * 0.42));
  const cx = 32 + radius;
  const cy = top + (height - top - 20) / 2;

  const parts: string[] = [];
  if (title) {
    parts.push(`<text x="24" y="24" font-size="16" font-weight="600" fill="${theme.text}">${escapeHtml(title)}</text>`);
  }

  let angle = 0;
  values.forEach((value, index) => {
    if (value <= 0) return;
    const slice = (value / total) * Math.PI * 2;
    const color = CHART_COLORS[index % CHART_COLORS.length];
    if (slice >= Math.PI * 2 - 0.001) {
      parts.push(`<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(radius)}" fill="${color}"/>`);
    } else {
      parts.push(`<path d="${arcPath(cx, cy, radius, angle, angle + slice)}" fill="${color}" stroke="${theme.background}" stroke-width="1.5"/>`);
    }
    if (slice > 0.28 && radius > 70) {
      const middle = angle + slice / 2;
      const px = cx + radius * 0.62 * Math.cos(middle - Math.PI / 2);
      const py = cy + radius * 0.62 * Math.sin(middle - Math.PI / 2);
      parts.push(
        `<text x="${round(px)}" y="${round(py + 4)}" font-size="11" text-anchor="middle" fill="#ffffff" font-weight="600">${round(
          (value / total) * 100
        )}%</text>`
      );
    }
    angle += slice;
  });

  if (showLegend) {
    const legendX = cx + radius + 28;
    const legendHeight = legendEntries.length * 20;
    const startY = cy - legendHeight / 2 + 10;
    legendEntries.forEach((entry, index) => {
      parts.push(
        `<rect x="${round(legendX)}" y="${round(startY + index * 20 - 9)}" width="10" height="10" rx="2" fill="${entry.color}"/>` +
          `<text x="${round(legendX + 16)}" y="${round(startY + index * 20)}" font-size="12" fill="${theme.text}">${escapeHtml(
            truncate(entry.name, 28)
          )}</text>`
      );
    });
  }

  return svgRoot({ width, height, theme, title, body: parts.join("") });
}

function arcPath(cx: number, cy: number, radius: number, start: number, end: number): string {
  const a0 = start - Math.PI / 2;
  const a1 = end - Math.PI / 2;
  const x0 = cx + radius * Math.cos(a0);
  const y0 = cy + radius * Math.sin(a0);
  const x1 = cx + radius * Math.cos(a1);
  const y1 = cy + radius * Math.sin(a1);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${round(x0)} ${round(y0)} A ${round(radius)} ${round(radius)} 0 ${large} 1 ${round(x1)} ${round(
    y1
  )} L ${round(cx)} ${round(cy)} Z`;
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
