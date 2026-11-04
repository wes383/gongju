import { describe, expect, it } from "vitest";
import {
  bell,
  callOf,
  catalan,
  combination,
  combinationWithRepetition,
  derangement,
  digitCount,
  factorial,
  formatCount,
  formulaOf,
  groupDigits,
  needsK,
  permutation,
  permutationWithRepetition,
  scientific,
  stirlingSecond,
  MAX_N,
} from "@/lib/combinatorics";
import { isCodedError } from "@/lib/errors";

function codeOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (isCodedError(error)) return error.code;
    return "uncoded";
  }
  return "no-error";
}

describe("factorial", () => {
  it("handles the empty and small cases", () => {
    expect(factorial(0)).toBe(1n);
    expect(factorial(1)).toBe(1n);
    expect(factorial(5)).toBe(120n);
    expect(factorial(20)).toBe(2432902008176640000n);
  });

  it("keeps all 5736 digits of 2000!", () => {
    expect(digitCount(factorial(2000))).toBe(5736);
  });
});

describe("permutation and combination", () => {
  it("counts ordered picks", () => {
    expect(permutation(10, 3)).toBe(720n);
    expect(permutation(10, 0)).toBe(1n);
    expect(permutation(10, 10)).toBe(3628800n);
  });

  it("counts unordered picks", () => {
    expect(combination(10, 3)).toBe(120n);
    expect(combination(49, 6)).toBe(13983816n);
    expect(combination(10, 0)).toBe(1n);
    expect(combination(10, 10)).toBe(1n);
  });

  it("agrees with the well-known C(100, 50)", () => {
    expect(combination(100, 50)).toBe(100891344545564193334812497256n);
  });

  it("is symmetric in k", () => {
    expect(combination(1000, 3)).toBe(combination(1000, 997));
  });

  it("rejects k > n instead of returning zero", () => {
    expect(codeOf(() => permutation(5, 6))).toBe("comb.kRange");
    expect(codeOf(() => combination(5, 6))).toBe("comb.kRange");
  });

  it("rejects negative and oversized n", () => {
    expect(codeOf(() => factorial(-1))).toBe("comb.notInteger");
    expect(codeOf(() => factorial(MAX_N + 1))).toBe("comb.tooLarge");
    expect(codeOf(() => combination(2.5, 1))).toBe("comb.notInteger");
  });
});

describe("sampling with repetition", () => {
  it("counts ordered picks with replacement", () => {
    expect(permutationWithRepetition(2, 10)).toBe(1024n);
    expect(permutationWithRepetition(0, 0)).toBe(1n);
    expect(permutationWithRepetition(5, 0)).toBe(1n);
  });

  it("uses stars and bars for unordered picks", () => {
    expect(combinationWithRepetition(3, 2)).toBe(6n);
    expect(combinationWithRepetition(5, 3)).toBe(35n);
    expect(combinationWithRepetition(0, 0)).toBe(1n);
  });

  it("returns zero when there is nothing to choose from", () => {
    expect(combinationWithRepetition(0, 3)).toBe(0n);
  });
});

describe("derangements and Catalan numbers", () => {
  it("matches the derangement sequence", () => {
    const expected = [1n, 0n, 1n, 2n, 9n, 44n, 265n, 1854n, 14833n, 133496n, 1334961n];
    expect(expected.map((_, n) => derangement(n))).toEqual(expected);
  });

  it("matches the Catalan sequence", () => {
    const expected = [
      1n, 1n, 2n, 5n, 14n, 42n, 132n, 429n, 1430n, 4862n, 16796n,
    ];
    expect(expected.map((_, n) => catalan(n))).toEqual(expected);
  });
});

describe("Stirling and Bell numbers", () => {
  it("builds the S(5, k) row", () => {
    expect([1, 2, 3, 4, 5].map((k) => stirlingSecond(5, k))).toEqual([
      1n,
      15n,
      25n,
      10n,
      1n,
    ]);
    expect(stirlingSecond(0, 0)).toBe(1n);
  });

  it("returns zero for k > n instead of throwing", () => {
    expect(stirlingSecond(3, 5)).toBe(0n);
  });

  it("matches the Bell sequence", () => {
    const expected = [1n, 1n, 2n, 5n, 15n, 52n, 203n, 877n, 4140n, 21147n, 115975n];
    expect(expected.map((_, n) => bell(n))).toEqual(expected);
  });

  it("caps the quadratic table", () => {
    expect(codeOf(() => bell(201))).toBe("comb.tooLarge");
  });
});

describe("formatting", () => {
  it("groups digits in threes", () => {
    expect(groupDigits(0n)).toBe("0");
    expect(groupDigits(999n)).toBe("999");
    expect(groupDigits(1234567n)).toBe("1,234,567");
    expect(groupDigits(-1234n)).toBe("-1,234");
  });

  it("counts digits including the leading one", () => {
    expect(digitCount(0n)).toBe(1);
    expect(digitCount(9n)).toBe(1);
    expect(digitCount(10n ** 20n)).toBe(21);
  });

  it("switches to scientific notation for long values", () => {
    expect(scientific(10n ** 21n)).toBe("1e+21");
    expect(scientific(123456789n)).toBe("1.23456e+8");
    expect(scientific(-123456789n, 3)).toBe("-1.23e+8");
  });

  it("keeps short counts exact and abbreviates long ones", () => {
    expect(formatCount(720n)).toBe("720");
    expect(formatCount(1234567n)).toBe("1,234,567");
    expect(formatCount(10n ** 30n)).toBe("1e+30");
  });
});

describe("labels", () => {
  it("writes the call notation", () => {
    expect(callOf("combination", 10, 3)).toBe("C(10, 3)");
    expect(callOf("permutation", 10, 3)).toBe("P(10, 3)");
    expect(callOf("catalan", 5, 0)).toBe("C(10, 5) / 6");
  });

  it("knows which operations read k", () => {
    expect(needsK("combination")).toBe(true);
    expect(needsK("factorial")).toBe(false);
    expect(needsK("bell")).toBe(false);
  });

  it("has a formula for every operation", () => {
    const ids = [
      "permutation",
      "combination",
      "permutationRepeat",
      "combinationRepeat",
      "factorial",
      "derangement",
      "catalan",
      "stirling",
      "bell",
    ] as const;
    for (const id of ids) expect(formulaOf(id).length).toBeGreaterThan(0);
  });
});
