/**
 * Probability distributions for the distribution calculator.
 *
 * No dependency: the two special functions needed are small enough to carry.
 * `erf` uses the Abramowitz & Stegun 7.1.26 rational approximation (absolute
 * error below 1.5e-7), and `lgamma` uses the Lanczos g = 7, n = 9 series, which
 * is accurate to about 1e-15 for the positive arguments we pass it. A real
 * statistics library would be one more megabyte for two functions.
 *
 * Every distribution exposes the same surface — `pdf`, `cdf`, `quantile`, mean
 * and variance — so the UI can treat them uniformly. Discrete ones (binomial,
 * Poisson) return the point mass from `pdf`, and `quantile(p)` is the smallest
 * k whose cumulative probability reaches p.
 */

import { codedError } from "./errors";

export type DistributionId = "normal" | "binomial" | "poisson" | "exponential" | "uniform";

export interface DistributionParam {
  key: string;
  label: { zh: string; en: string };
  default: number;
  min?: number;
  max?: number;
  /** Reject non-integers (trials, successes) */
  integer?: boolean;
}

export interface DistributionInfo {
  id: DistributionId;
  label: { zh: string; en: string };
  description: { zh: string; en: string };
  discrete: boolean;
  params: DistributionParam[];
}

export const DISTRIBUTIONS: DistributionInfo[] = [
  {
    id: "normal",
    label: { zh: "正态分布", en: "Normal" },
    description: {
      zh: "连续对称分布，描述身高、误差、测量值等大量自然现象",
      en: "The symmetric bell curve behind heights, errors and most measurement noise",
    },
    discrete: false,
    params: [
      { key: "mu", label: { zh: "均值 μ", en: "Mean μ" }, default: 0 },
      { key: "sigma", label: { zh: "标准差 σ", en: "Std dev σ" }, default: 1, min: 0 },
    ],
  },
  {
    id: "binomial",
    label: { zh: "二项分布", en: "Binomial" },
    description: {
      zh: "n 次独立试验中成功的次数，每次成功概率为 p",
      en: "Successes in n independent trials, each with probability p",
    },
    discrete: true,
    params: [
      { key: "n", label: { zh: "试验次数 n", en: "Trials n" }, default: 20, min: 1, max: 1000, integer: true },
      { key: "p", label: { zh: "成功概率 p", en: "Probability p" }, default: 0.5, min: 0, max: 1 },
    ],
  },
  {
    id: "poisson",
    label: { zh: "泊松分布", en: "Poisson" },
    description: {
      zh: "固定时间或空间内稀有事件的发生次数",
      en: "How many rare events land in a fixed interval",
    },
    discrete: true,
    params: [{ key: "lambda", label: { zh: "平均次数 λ", en: "Rate λ" }, default: 4, min: 0 }],
  },
  {
    id: "exponential",
    label: { zh: "指数分布", en: "Exponential" },
    description: {
      zh: "泊松过程中两次事件之间的等待时间",
      en: "Waiting time between events in a Poisson process",
    },
    discrete: false,
    params: [{ key: "lambda", label: { zh: "发生率 λ", en: "Rate λ" }, default: 1, min: 0 }],
  },
  {
    id: "uniform",
    label: { zh: "均匀分布", en: "Uniform" },
    description: {
      zh: "区间内每个值出现的概率相同",
      en: "Every value in the interval is equally likely",
    },
    discrete: false,
    params: [
      { key: "a", label: { zh: "下界 a", en: "Lower a" }, default: 0 },
      { key: "b", label: { zh: "上界 b", en: "Upper b" }, default: 1 },
    ],
  },
];

/** Abramowitz & Stegun 7.1.26; |error| < 1.5e-7, which is far below display precision */
export function erf(x: number): number {
  // The rational fit leaves ~5e-10 at the origin, and a CDF of 0.5000000005 on
  // the mean reads like a bug; the value there is exactly zero by symmetry.
  if (x === 0) return 0;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** log Γ(x) for x > 0; the reflection formula is irrelevant here, all inputs are ≥ 1 */
export function lgamma(x: number): number {
  if (x < 1) {
    // Γ(x) = Γ(x+1)/x, so lgamma(x) = lgamma(x+1) − ln x
    return lgamma(x + 1) - Math.log(x);
  }
  let shifted = x - 1;
  let series = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i += 1) series += LANCZOS[i] / (shifted + i);
  shifted += 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x - 0.5) * Math.log(shifted) - shifted + Math.log(series);
}

function logChoose(n: number, k: number): number {
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
}

/** Acklam's rational approximation, refined once against the CDF */
export function normalQuantile(p: number): number {
  if (p <= 0) return Number.NEGATIVE_INFINITY;
  if (p >= 1) return Number.POSITIVE_INFINITY;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  const high = 1 - low;

  let x: number;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= high) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  // One Halley step against the exact CDF takes the error to machine precision
  const e = 0.5 * (1 + erf(x / Math.SQRT2)) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

export interface Distribution {
  id: DistributionId;
  discrete: boolean;
  pdf(x: number): number;
  cdf(x: number): number;
  /** Inverse CDF, clamped to [0, 1] input */
  quantile(p: number): number;
  mean: number;
  variance: number;
  /** Where the density is worth drawing, not the mathematical support */
  range: { min: number; max: number };
}

function parameter(params: Record<string, number>, key: string): number {
  const value = params[key];
  if (!Number.isFinite(value)) throw codedError("dist.param", key);
  return value;
}

export function createDistribution(
  id: DistributionId,
  params: Record<string, number>
): Distribution {
  switch (id) {
    case "normal": {
      const mu = parameter(params, "mu");
      const sigma = parameter(params, "sigma");
      if (sigma <= 0) throw codedError("dist.sigma");
      return {
        id,
        discrete: false,
        pdf: (x) => Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI)),
        cdf: (x) => 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2))),
        quantile: (p) => mu + sigma * normalQuantile(p),
        mean: mu,
        variance: sigma * sigma,
        range: { min: mu - 4 * sigma, max: mu + 4 * sigma },
      };
    }

    case "binomial": {
      const nRaw = parameter(params, "n");
      const p = parameter(params, "p");
      const n = Math.round(nRaw);
      if (n < 1) throw codedError("dist.trials");
      if (p < 0 || p > 1) throw codedError("dist.probability");
      const pmf = (k: number) => {
        if (!Number.isInteger(k) || k < 0 || k > n) return 0;
        if (p === 0) return k === 0 ? 1 : 0;
        if (p === 1) return k === n ? 1 : 0;
        return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
      };
      const cdf = (x: number) => {
        const limit = Math.floor(x);
        if (limit < 0) return 0;
        if (limit >= n) return 1;
        let total = 0;
        for (let k = 0; k <= limit; k += 1) total += pmf(k);
        return Math.min(1, total);
      };
      return {
        id,
        discrete: true,
        pdf: pmf,
        cdf,
        quantile: (q) => {
          let total = 0;
          for (let k = 0; k <= n; k += 1) {
            total += pmf(k);
            if (total >= q) return k;
          }
          return n;
        },
        mean: n * p,
        variance: n * p * (1 - p),
        range: { min: -0.5, max: n + 0.5 },
      };
    }

    case "poisson": {
      const lambda = parameter(params, "lambda");
      if (lambda <= 0) throw codedError("dist.lambda", "λ");
      const pmf = (k: number) => {
        if (!Number.isInteger(k) || k < 0) return 0;
        return Math.exp(-lambda + k * Math.log(lambda) - lgamma(k + 1));
      };
      // Far enough out that the tail is below any display precision
      const limit = Math.max(30, Math.ceil(lambda + 12 * Math.sqrt(lambda) + 20));
      const cdf = (x: number) => {
        const stop = Math.floor(x);
        if (stop < 0) return 0;
        if (stop >= limit) return 1;
        let total = 0;
        for (let k = 0; k <= stop; k += 1) total += pmf(k);
        return Math.min(1, total);
      };
      return {
        id,
        discrete: true,
        pdf: pmf,
        cdf,
        quantile: (q) => {
          let total = 0;
          for (let k = 0; k <= limit; k += 1) {
            total += pmf(k);
            if (total >= q) return k;
          }
          return limit;
        },
        mean: lambda,
        variance: lambda,
        range: { min: -0.5, max: limit },
      };
    }

    case "exponential": {
      const lambda = parameter(params, "lambda");
      if (lambda <= 0) throw codedError("dist.lambda", "λ");
      return {
        id,
        discrete: false,
        pdf: (x) => (x < 0 ? 0 : lambda * Math.exp(-lambda * x)),
        cdf: (x) => (x < 0 ? 0 : 1 - Math.exp(-lambda * x)),
        quantile: (p) => -Math.log(1 - p) / lambda,
        mean: 1 / lambda,
        variance: 1 / (lambda * lambda),
        range: { min: 0, max: 5 / lambda },
      };
    }

    case "uniform": {
      const a = parameter(params, "a");
      const b = parameter(params, "b");
      if (!(b > a)) throw codedError("dist.bounds");
      const width = b - a;
      return {
        id,
        discrete: false,
        pdf: (x) => (x < a || x > b ? 0 : 1 / width),
        cdf: (x) => (x <= a ? 0 : x >= b ? 1 : (x - a) / width),
        quantile: (p) => a + p * width,
        mean: (a + b) / 2,
        variance: (width * width) / 12,
        range: { min: a - width * 0.1, max: b + width * 0.1 },
      };
    }

    default:
      throw codedError("dist.unknown", String(id));
  }
}

/** P(X ≤ x) and its complement, the pair shown next to the curve */
export function tailProbabilities(dist: Distribution, x: number): { below: number; above: number } {
  const below = dist.cdf(x);
  return { below, above: 1 - below };
}
