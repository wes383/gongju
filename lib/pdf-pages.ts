/** Page-selection parsing and page-geometry helpers shared by the PDF tools. */

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

const NAMED_SIZES: { label: string; width: number; height: number }[] = [
  { label: "A3", width: 841.89, height: 1190.55 },
  { label: "A4", width: A4_WIDTH, height: A4_HEIGHT },
  { label: "A5", width: 419.53, height: 595.28 },
  { label: "Letter", width: 612, height: 792 },
  { label: "Legal", width: 612, height: 1008 },
  { label: "Tabloid", width: 792, height: 1224 },
];

export interface PageRange {
  /** 1-based, inclusive */
  start: number;
  /** 1-based, inclusive */
  end: number;
}

/**
 * Parse a page selection such as `1-3, 5, 8-` into contiguous groups.
 *
 * An empty string selects every page. Returns `null` when the input is
 * malformed or refers to pages outside `1..total`, so callers can show an error
 * instead of silently dropping pages.
 */
export function parseRangeGroups(input: string, total: number): PageRange[] | null {
  if (total <= 0) return null;
  const text = input.trim();
  if (!text) return [{ start: 1, end: total }];

  const groups: PageRange[] = [];

  for (const token of text.split(/[,，;；\s]+/).filter(Boolean)) {
    const range = /^(\d+)?\s*-\s*(\d+)?$/.exec(token);
    if (range && (range[1] || range[2])) {
      let start = range[1] ? Number(range[1]) : 1;
      let end = range[2] ? Number(range[2]) : total;
      if (start > end) [start, end] = [end, start];
      if (start < 1 || end > total) return null;
      groups.push({ start, end });
      continue;
    }
    if (/^\d+$/.test(token)) {
      const page = Number(token);
      if (page < 1 || page > total) return null;
      groups.push({ start: page, end: page });
      continue;
    }
    return null;
  }

  return groups.length > 0 ? groups : null;
}

/** Same as `parseRangeGroups`, flattened into zero-based page indices. */
export function parsePageRanges(input: string, total: number): number[] | null {
  const groups = parseRangeGroups(input, total);
  if (!groups) return null;
  const indices: number[] = [];
  const seen = new Set<number>();
  for (const { start, end } of groups) {
    for (let page = start; page <= end; page += 1) {
      if (seen.has(page)) continue;
      seen.add(page);
      indices.push(page - 1);
    }
  }
  return indices.length > 0 ? indices : null;
}

/** Human-readable size label such as `A4` or `612 × 792 pt`. */
export function pageSizeLabel(width: number, height: number): string {
  for (const size of NAMED_SIZES) {
    const portrait =
      Math.abs(width - size.width) < 3 && Math.abs(height - size.height) < 3;
    const landscape =
      Math.abs(width - size.height) < 3 && Math.abs(height - size.width) < 3;
    if (portrait) return size.label;
    if (landscape) return `${size.label} ↻`;
  }
  return `${Math.round(width)} × ${Math.round(height)} pt`;
}
