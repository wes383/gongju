/**
 * Descriptive statistics for a pasted column of numbers.
 *
 * Everything is computed in one pass over a sorted copy, and the conventions
 * are spelled out because "variance" and "quartile" both mean several things
 * depending on who is asking:
 *
 * - Quartiles use linear interpolation between order statistics (R type 7,
 *   the Excel `QUARTILE.INC` / NumPy default), not the median-of-halves rule.
 * - Spread is reported twice: population (divide by n) and sample (n − 1).
 * - Skewness and kurtosis are the bias-corrected sample estimators G1 and G2,
 *   with excess kurtosis (normal = 0) rather than Pearson's 3.
 * - Outliers are the 1.5 × IQR fence, the same rule box plots use.
 */

import { codedError } from "./errors";

export const MAX_VALUES = 200_000;

export interface ParsedNumbers {
  values: number[];
  /** Tokens that were not numbers, so the UI can say what it ignored */
  skipped: string[];
}

/** Splits on any run of whitespace, commas or semicolons */
export function parseNumbers(source: string): ParsedNumbers {
  const tokens = source.split(/[\s,;]+/).filter(Boolean);
  const values: number[] = [];
  const skipped: string[] = [];

  for (const token of tokens) {
    const value = Number(token);
    if (Number.isFinite(value)) values.push(value);
    else skipped.push(token);
  }

  if (values.length > MAX_VALUES) throw codedError("stats.tooMany", MAX_VALUES);
  return { values, skipped };
}

/** R type 7 linear interpolation; the caller must pass a sorted array */
export function quantileSorted(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 0) throw codedError("stats.empty");
  if (n === 1) return sorted[0];
  const position = (n - 1) * Math.min(1, Math.max(0, p));
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export interface Frequency {
  value: number;
  count: number;
}

export interface Summary {
  count: number;
  sum: number;
  min: number;
  max: number;
  range: number;
  mean: number;
  median: number;
  /** Every value sharing the highest count; callers decide how to show ties */
  modes: Frequency[];
  geometricMean: number | null;
  harmonicMean: number | null;
  variancePopulation: number;
  varianceSample: number | null;
  stdPopulation: number;
  stdSample: number | null;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number | null;
  kurtosis: number | null;
  /** Coefficient of variation, sample standard deviation over the mean */
  cv: number | null;
  outliers: { low: number[]; high: number[] };
  sorted: number[];
}

export function summarize(values: number[]): Summary {
  if (values.length === 0) throw codedError("stats.empty");

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const mean = sum / n;

  const q1 = quantileSorted(sorted, 0.25);
  const median = quantileSorted(sorted, 0.5);
  const q3 = quantileSorted(sorted, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;

  const deviations = sorted.map((value) => value - mean);
  const m2 = deviations.reduce((acc, d) => acc + d * d, 0) / n;

  const varianceSample = n > 1 ? (m2 * n) / (n - 1) : null;
  const stdPopulation = Math.sqrt(m2);
  const stdSample = varianceSample === null ? null : Math.sqrt(varianceSample);

  const counts = new Map<number, number>();
  for (const value of sorted) counts.set(value, (counts.get(value) ?? 0) + 1);
  // Spreading a 200k-entry Map into Math.max would blow the argument limit
  let top = 0;
  for (const count of counts.values()) if (count > top) top = count;
  const modes = [...counts.entries()]
    .filter(([, count]) => count === top)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value);

  const positive = sorted.every((value) => value > 0);
  const nonzero = sorted.every((value) => value !== 0);

  return {
    count: n,
    sum,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    mean,
    median,
    modes,
    geometricMean: positive
      ? Math.exp(sorted.reduce((acc, value) => acc + Math.log(value), 0) / n)
      : null,
    harmonicMean: positive ? n / sorted.reduce((acc, value) => acc + 1 / value, 0) : null,
    variancePopulation: m2,
    varianceSample,
    stdPopulation,
    stdSample,
    q1,
    q3,
    iqr,
    skewness:
      n >= 3 && stdSample !== null && stdSample > 0
        ? (n / ((n - 1) * (n - 2))) *
          deviations.reduce((acc, d) => acc + (d / stdSample) ** 3, 0)
        : null,
    kurtosis:
      n >= 4 && stdSample !== null && stdSample > 0
        ? (n * (n + 1) * deviations.reduce((acc, d) => acc + (d / stdSample) ** 4, 0)) /
            ((n - 1) * (n - 2) * (n - 3)) -
          (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
        : null,
    cv: nonzero && stdSample !== null && mean !== 0 ? stdSample / Math.abs(mean) : null,
    // m3 is only read by the skewness formula above; keeping it here would make
    // the summary agree with the returned skewness only by accident
    outliers: {
      low: sorted.filter((value) => value < lowFence),
      high: sorted.filter((value) => value > highFence),
    },
    sorted,
  };
}

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

export interface Histogram {
  bins: HistogramBin[];
  /** Bin width, 0 when every value is identical */
  width: number;
}

/**
 * Sturges' rule as a default bin count, capped so the chart stays readable on
 * wide screens and on very large samples.
 */
export function histogram(values: number[], binCount?: number): Histogram {
  if (values.length === 0) throw codedError("stats.empty");

  let min = values[0];
  let max = values[0];
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (min === max) {
    return { bins: [{ from: min, to: max, count: values.length }], width: 0 };
  }

  const wanted = binCount ?? Math.ceil(Math.log2(values.length)) + 1;
  const count = Math.min(40, Math.max(1, Math.round(wanted)));
  const width = (max - min) / count;
  const bins: HistogramBin[] = Array.from({ length: count }, (_, i) => ({
    from: min + i * width,
    to: i === count - 1 ? max : min + (i + 1) * width,
    count: 0,
  }));

  for (const value of values) {
    // The last bin is closed on the right so the maximum lands inside it
    const index = Math.min(count - 1, Math.floor((value - min) / width));
    bins[index].count += 1;
  }

  return { bins, width };
}

/**
 * The values inside the 1.5 × IQR fence — everything the outlier rows do not
 * list. A single far-away point stretches the histogram axis so much that the
 * rest of the sample collapses into one bar, so the chart offers this view.
 */
export function coreValues(values: number[], summary: Summary): number[] {
  const low = summary.q1 - 1.5 * summary.iqr;
  const high = summary.q3 + 1.5 * summary.iqr;
  return values.filter((value) => value >= low && value <= high);
}
