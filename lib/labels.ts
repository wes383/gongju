/**
 * Placement of tick labels in a small inline SVG.
 *
 * Charts here position labels at marks that can sit arbitrarily close to each
 * other — the near and far limits of a depth-of-field bar, for instance, are
 * only centimetres apart at wide apertures. Drawing each label centred on its
 * mark makes the numbers collide, so the labels are grouped into runs and each
 * run is re-centred as a whole. Runs that cannot fit side by side fall back to
 * one label per row.
 */

export type TextAnchor = "start" | "middle" | "end";

export interface LabelRequest {
  id: string;
  /** Position of the mark the label belongs to */
  x: number;
  anchor: TextAnchor;
  /** Estimated rendered width in the same units as `x` */
  width: number;
}

export interface PlacedLabel {
  id: string;
  /** Where the text should start, so every label is drawn with anchor "start" */
  left: number;
  /** Zero for the normal row, higher values stack below */
  row: number;
}

export interface LabelBounds {
  left: number;
  right: number;
  /** Minimum space between two labels on the same row */
  gap?: number;
}

const DEFAULT_GAP = 6;

/**
 * Rough width of a short label. Only digits, a decimal point, a unit and the
 * infinity sign appear in these charts, and they are close to the 0.6 em that
 * most UI fonts use for tabular figures. It is an estimate on purpose: the
 * exact width needs a DOM measurement, which is unavailable while rendering.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}

function leftEdge(item: LabelRequest): number {
  if (item.anchor === "start") return item.x;
  if (item.anchor === "end") return item.x - item.width;
  return item.x - item.width / 2;
}

/** Places every label on a row so that none overlap, keeping input order */
export function placeLabels(items: readonly LabelRequest[], bounds: LabelBounds): PlacedLabel[] {
  const gap = bounds.gap ?? DEFAULT_GAP;
  const span = Math.max(0, bounds.right - bounds.left);
  const placed = new Map<string, PlacedLabel>();

  const clamp = (left: number, width: number) =>
    Math.min(Math.max(left, bounds.left), Math.max(bounds.left, bounds.right - width));

  let run: Array<LabelRequest & { left: number }> = [];
  let runRight = -Infinity;

  const flush = () => {
    if (run.length === 0) return;
    const total = run.reduce((sum, item) => sum + item.width, 0) + gap * (run.length - 1);
    if (total <= span) {
      const first = run[0];
      const last = run[run.length - 1];
      const centre = (first.left + last.left + last.width) / 2;
      let cursor = clamp(centre - total / 2, total);
      for (const item of run) {
        placed.set(item.id, { id: item.id, left: cursor, row: 0 });
        cursor += item.width + gap;
      }
    } else {
      // Too tight to sit side by side — give each label its own row
      run.forEach((item, index) => {
        placed.set(item.id, { id: item.id, left: clamp(item.left, item.width), row: index });
      });
    }
    run = [];
    runRight = -Infinity;
  };

  const sorted = items
    .map((item) => ({ ...item, left: leftEdge(item) }))
    .sort((a, b) => a.left - b.left);

  for (const item of sorted) {
    if (run.length > 0 && item.left >= runRight + gap) flush();
    run.push(item);
    runRight = Math.max(runRight, item.left + item.width);
  }
  flush();

  return items.map(
    (item) => placed.get(item.id) ?? { id: item.id, left: clamp(leftEdge(item), item.width), row: 0 }
  );
}
