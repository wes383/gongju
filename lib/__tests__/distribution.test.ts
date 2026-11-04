import { describe, expect, it } from "vitest";
import {
  DISTRIBUTIONS,
  createDistribution,
  erf,
  lgamma,
  normalQuantile,
  tailProbabilities,
} from "@/lib/distribution";
import { isCodedError } from "@/lib/errors";

describe("special functions", () => {
  it("matches known erf values", () => {
    expect(erf(0)).toBe(0);
    expect(erf(1)).toBeCloseTo(0.8427008, 6);
    expect(erf(-1)).toBeCloseTo(-0.8427008, 6);
  });

  it("reproduces factorials through lgamma", () => {
    expect(lgamma(1)).toBeCloseTo(0, 10);
    expect(lgamma(2)).toBeCloseTo(0, 10);
    expect(Math.exp(lgamma(6))).toBeCloseTo(120, 6);
    expect(lgamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 10);
  });

  it("inverts the normal CDF", () => {
    expect(normalQuantile(0.5)).toBeCloseTo(0, 10);
    expect(normalQuantile(0.975)).toBeCloseTo(1.959964, 5);
    expect(normalQuantile(0.001)).toBeCloseTo(-3.090232, 4);
  });
});

describe("normal", () => {
  const normal = createDistribution("normal", { mu: 0, sigma: 1 });

  it("peaks at the mean", () => {
    expect(normal.pdf(0)).toBeCloseTo(0.3989423, 6);
  });

  it("has the textbook CDF", () => {
    expect(normal.cdf(0)).toBeCloseTo(0.5, 10);
    expect(normal.cdf(1.96)).toBeCloseTo(0.975, 5);
    expect(normal.cdf(-1.96)).toBeCloseTo(0.025, 5);
  });

  it("round-trips quantile through the CDF", () => {
    for (const p of [0.01, 0.25, 0.5, 0.9, 0.999]) {
      expect(normal.cdf(normal.quantile(p))).toBeCloseTo(p, 8);
    }
  });

  it("shifts and scales with the parameters", () => {
    const shifted = createDistribution("normal", { mu: 100, sigma: 15 });
    expect(shifted.mean).toBe(100);
    expect(shifted.variance).toBe(225);
    expect(shifted.cdf(100)).toBeCloseTo(0.5, 10);
    expect(shifted.range).toEqual({ min: 40, max: 160 });
  });
});

describe("binomial", () => {
  const binom = createDistribution("binomial", { n: 10, p: 0.3 });

  it("sums to one across the support", () => {
    let total = 0;
    for (let k = 0; k <= 10; k += 1) total += binom.pdf(k);
    expect(total).toBeCloseTo(1, 10);
  });

  it("drops non-integers and out-of-range values", () => {
    expect(binom.pdf(-1)).toBe(0);
    expect(binom.pdf(2.5)).toBe(0);
    expect(binom.pdf(11)).toBe(0);
  });

  it("reports the mean and variance", () => {
    expect(binom.mean).toBeCloseTo(3, 10);
    expect(binom.variance).toBeCloseTo(2.1, 10);
  });

  it("accumulates into a CDF and back through the quantile", () => {
    expect(binom.cdf(10)).toBe(1);
    expect(binom.cdf(-1)).toBe(0);
    expect(binom.cdf(3)).toBeCloseTo(0.6496107, 6);
    expect(binom.quantile(binom.cdf(3))).toBe(3);
  });

  it("handles the degenerate p = 0 and p = 1 cases", () => {
    const never = createDistribution("binomial", { n: 5, p: 0 });
    expect(never.pdf(0)).toBe(1);
    expect(never.pdf(1)).toBe(0);
    expect(never.mean).toBe(0);
    const always = createDistribution("binomial", { n: 5, p: 1 });
    expect(always.pdf(5)).toBe(1);
    expect(always.cdf(4)).toBe(0);
    expect(always.cdf(5)).toBe(1);
  });
});

describe("poisson", () => {
  const poisson = createDistribution("poisson", { lambda: 4 });

  it("sums to one", () => {
    let total = 0;
    for (let k = 0; k < 200; k += 1) total += poisson.pdf(k);
    expect(total).toBeCloseTo(1, 8);
  });

  it("matches lambda for mean and variance", () => {
    expect(poisson.mean).toBe(4);
    expect(poisson.variance).toBe(4);
  });

  it("knows its first values", () => {
    expect(poisson.pdf(0)).toBeCloseTo(Math.exp(-4), 10);
    expect(poisson.cdf(0)).toBeCloseTo(Math.exp(-4), 10);
    expect(poisson.cdf(100)).toBe(1);
  });

  it("returns the smallest k reaching the probability", () => {
    expect(poisson.quantile(0.5)).toBe(4);
    expect(poisson.quantile(0.99)).toBe(9);
  });
});

describe("exponential", () => {
  const exponential = createDistribution("exponential", { lambda: 2 });

  it("has no mass below zero", () => {
    expect(exponential.pdf(-1)).toBe(0);
    expect(exponential.cdf(-1)).toBe(0);
  });

  it("follows 1 − e^(−λx)", () => {
    expect(exponential.cdf(0.5)).toBeCloseTo(1 - Math.exp(-1), 10);
  });

  it("inverts its own CDF", () => {
    expect(exponential.quantile(1 - Math.exp(-1))).toBeCloseTo(0.5, 10);
  });

  it("reports the mean and variance", () => {
    expect(exponential.mean).toBe(0.5);
    expect(exponential.variance).toBe(0.25);
  });
});

describe("uniform", () => {
  const uniform = createDistribution("uniform", { a: 2, b: 6 });

  it("is flat inside the interval and empty outside", () => {
    expect(uniform.pdf(4)).toBe(0.25);
    expect(uniform.pdf(1)).toBe(0);
    expect(uniform.pdf(7)).toBe(0);
  });

  it("ramps linearly", () => {
    expect(uniform.cdf(2)).toBe(0);
    expect(uniform.cdf(4)).toBe(0.5);
    expect(uniform.cdf(6)).toBe(1);
  });

  it("inverts its own CDF", () => {
    expect(uniform.quantile(0.25)).toBe(3);
  });

  it("reports the mean and variance", () => {
    expect(uniform.mean).toBe(4);
    expect(uniform.variance).toBeCloseTo(16 / 12, 10);
  });
});

describe("validation", () => {
  function code(fn: () => unknown): string | null {
    try {
      fn();
      return null;
    } catch (error) {
      return isCodedError(error) ? error.code : "unexpected";
    }
  }

  it("rejects impossible parameters", () => {
    expect(code(() => createDistribution("normal", { mu: 0, sigma: 0 }))).toBe("dist.sigma");
    expect(code(() => createDistribution("binomial", { n: 0, p: 0.5 }))).toBe("dist.trials");
    expect(code(() => createDistribution("binomial", { n: 10, p: 1.5 }))).toBe(
      "dist.probability"
    );
    expect(code(() => createDistribution("poisson", { lambda: 0 }))).toBe("dist.lambda");
    expect(code(() => createDistribution("uniform", { a: 4, b: 4 }))).toBe("dist.bounds");
    expect(code(() => createDistribution("normal", { mu: Number.NaN, sigma: 1 }))).toBe(
      "dist.param"
    );
  });

  it("lists a complete parameter set for every advertised distribution", () => {
    for (const info of DISTRIBUTIONS) {
      expect(info.params.length).toBeGreaterThan(0);
      const values = Object.fromEntries(info.params.map((p) => [p.key, p.default]));
      expect(() => createDistribution(info.id, values)).not.toThrow();
    }
  });
});

describe("tail probabilities", () => {
  it("splits the CDF into two halves", () => {
    const normal = createDistribution("normal", { mu: 0, sigma: 1 });
    const { below, above } = tailProbabilities(normal, 0);
    expect(below).toBeCloseTo(0.5, 10);
    expect(above).toBeCloseTo(0.5, 10);
  });
});
