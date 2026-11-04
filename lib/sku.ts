/**
 * SKU matrices: the cartesian product of the option axes (colour × size × …),
 * each combination turned into a code and exported as CSV for bulk import.
 */

import { codedError } from "./errors";

export const MAX_SKUS = 5000;

export interface SkuAxis {
  name: string;
  values: string[];
}

export type SkuCodeMode = "value" | "index";

export interface SkuOptions {
  prefix?: string;
  separator?: string;
  /** "value" joins the option values, "index" numbers the rows */
  codeMode?: SkuCodeMode;
  /** Zero-padded digits for numbered codes, 0 for none */
  pad?: number;
}

export interface SkuItem {
  code: string;
  values: string[];
}

export interface SkuMatrix {
  items: SkuItem[];
  axes: SkuAxis[];
  /** Total combinations */
  total: number;
}

/** Trim, drop blanks and remove duplicates while keeping the original order */
export function cleanAxes(axes: SkuAxis[]): SkuAxis[] {
  return axes
    .map((axis) => {
      const seen = new Set<string>();
      const values = axis.values
        .map((value) => value.trim())
        .filter((value) => {
          if (!value || seen.has(value)) return false;
          seen.add(value);
          return true;
        });
      return { name: axis.name.trim(), values };
    })
    .filter((axis) => axis.values.length > 0);
}

export function skuMatrix(axes: SkuAxis[], options: SkuOptions = {}): SkuMatrix {
  const cleaned = cleanAxes(axes);
  if (cleaned.length === 0) throw codedError("sku.axis");
  if (cleaned.some((axis) => !axis.name)) throw codedError("sku.name");

  const total = cleaned.reduce((count, axis) => count * axis.values.length, 1);
  if (total > MAX_SKUS) throw codedError("sku.limit", String(MAX_SKUS));

  const separator = options.separator ?? "-";
  const prefix = options.prefix?.trim() ?? "";
  const mode = options.codeMode ?? "value";
  const pad = Math.min(6, Math.max(0, Math.floor(options.pad ?? 0)));

  const items: SkuItem[] = [];
  let index = 0;

  const walk = (depth: number, values: string[]) => {
    if (depth === cleaned.length) {
      index += 1;
      const code =
        mode === "index"
          ? [prefix, String(index).padStart(Math.max(pad, 1), "0")].filter(Boolean).join(separator)
          : [prefix, ...values].filter(Boolean).join(separator);
      items.push({ code, values: [...values] });
      return;
    }
    for (const value of cleaned[depth].values) {
      walk(depth + 1, [...values, value]);
    }
  };

  walk(0, []);

  return { items, axes: cleaned, total };
}

function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * CSV for a bulk import sheet: one column per axis, the code last, plus empty
 * price and stock columns so the file can be filled in and uploaded as is.
 */
export function skuCsv(matrix: SkuMatrix, skuHeader = "SKU", extraHeaders: string[] = []): string {
  const header = [...matrix.axes.map((axis) => axis.name), skuHeader, ...extraHeaders];
  const rows = matrix.items.map((item) => [...item.values, item.code, ...extraHeaders.map(() => "")]);
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
