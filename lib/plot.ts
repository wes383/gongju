/**
 * Geometry for the function plotter: sampling, axis ranges and tick marks.
 *
 * Nothing here touches the DOM. The evaluator is passed in as a plain function,
 * because the page compiles the user's expression with mathjs and this module
 * only decides where to evaluate it and how to frame the result.
 *
 * Two details matter for plots that do not look broken:
 *
 * - A point whose value is not finite becomes `null` rather than being dropped,
 *   so the renderer can break the path there instead of drawing a line across a
 *   pole (`tan`, `1/x`).
 * - The y-range is clipped at the 2nd and 98th percentile before padding. A
 *   single spike would otherwise squash everything else into a flat line.
 */

export const PLOT_SAMPLES = 900;

export interface PlotPoint {
  x: number;
  y: number | null;
}

export function sampleFunction(
  evaluate: (x: number) => number,
  xMin: number,
  xMax: number,
  samples: number = PLOT_SAMPLES
): PlotPoint[] {
  if (!(xMax > xMin)) return [];
  const count = Math.max(2, Math.min(4000, Math.round(samples)));
  const step = (xMax - xMin) / (count - 1);
  const points: PlotPoint[] = [];

  for (let i = 0; i < count; i += 1) {
    const x = i === count - 1 ? xMax : xMin + i * step;
    let y: number | null;
    try {
      const value = evaluate(x);
      y = Number.isFinite(value) ? value : null;
    } catch {
      y = null;
    }
    points.push({ x, y });
  }

  return points;
}

/** Linear-interpolated quantile over a sorted copy, kept local to avoid a lib cycle */
function quantile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const position = (values.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (position - lower);
}

export interface Range {
  min: number;
  max: number;
}

const DEFAULT_RANGE: Range = { min: -1, max: 1 };

/**
 * Vertical extent that keeps the interesting part of every series visible.
 * `clip` is the quantile tail ignored on each side; pass 0 to frame the raw
 * extremes instead.
 */
export function autoRange(
  series: PlotPoint[][],
  { clip = 0.02, padding = 0.08 }: { clip?: number; padding?: number } = {}
): Range {
  const values: number[] = [];
  for (const points of series) {
    for (const point of points) {
      if (point.y !== null) values.push(point.y);
    }
  }
  if (values.length === 0) return DEFAULT_RANGE;

  values.sort((a, b) => a - b);
  const low = quantile(values, clip);
  const high = quantile(values, 1 - clip);
  if (!(high > low)) {
    // A constant function still needs a visible band around it
    const center = low;
    return { min: center - 1, max: center + 1 };
  }

  const pad = (high - low) * padding;
  return { min: low - pad, max: high + pad };
}

/** 1 / 2 / 5 × 10^n steps, the spacing that reads as "round numbers" on an axis */
export function niceTicks(min: number, max: number, target = 6): number[] {
  if (!(max > min) || target < 1) return [];

  const raw = (max - min) / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalised = raw / magnitude;
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude;

  const first = Math.ceil(min / step);
  const last = Math.floor(max / step);
  const ticks: number[] = [];
  for (let i = first; i <= last; i += 1) {
    // Multiply rather than accumulate, so the ticks stay exact
    const value = i * step;
    ticks.push(Object.is(value, -0) ? 0 : Number(value.toPrecision(12)));
  }
  return ticks;
}

export function formatTick(value: number): string {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 100_000 || abs < 0.001) {
    return value.toExponential(1).replace("e+", "e");
  }
  return String(Number(value.toPrecision(6)));
}

/** Keeps the x axis from running into the padding when the range is tiny */
export function clampRange(range: Range, fallback: Range = DEFAULT_RANGE): Range {
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max) || !(range.max > range.min)) {
    return fallback;
  }
  return range;
}
