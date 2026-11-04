import { describe, expect, it } from "vitest";
import {
  add,
  determinant,
  formatMatrix,
  identity,
  inverse,
  matrix,
  multiply,
  parseMatrix,
  rank,
  scalarMultiply,
  subtract,
  trace,
  transpose,
} from "@/lib/matrix";
import { isCodedError } from "@/lib/errors";

const A = matrix(2, 2, [
  [1, 2],
  [3, 4],
]);

describe("parse matrix", () => {
  it("reads newline- and semicolon-separated rows", () => {
    expect(parseMatrix("1 2\n3 4")).toEqual(A);
    expect(parseMatrix("1,2;3,4")).toEqual(A);
    expect(parseMatrix("  [1, 2; 3, 4]  ")).toEqual(A);
  });

  it("accepts tabs, decimals and exponents", () => {
    expect(parseMatrix("1.5\t-2\n1e3\t.5")).toEqual(
      matrix(2, 2, [
        [1.5, -2],
        [1000, 0.5],
      ])
    );
  });

  it("drops blank lines", () => {
    expect(parseMatrix("1 2\n\n3 4\n")).toEqual(A);
  });

  it("rejects empty input, bad cells and ragged rows", () => {
    expect(() => parseMatrix("   ")).toThrowError(/matrix\.empty/);
    expect(() => parseMatrix("1 x")).toThrowError(/matrix\.invalid/);
    expect(() => parseMatrix("1 2\n3")).toThrowError(/matrix\.ragged/);
  });
});

describe("arithmetic", () => {
  it("multiplies conforming matrices", () => {
    const b = matrix(2, 3, [
      [5, 6, 7],
      [8, 9, 10],
    ]);
    expect(multiply(A, b)).toEqual(
      matrix(2, 3, [
        [21, 24, 27],
        [47, 54, 61],
      ])
    );
  });

  it("rejects a mismatched inner dimension", () => {
    let caught: unknown;
    try {
      multiply(matrix(2, 3, [[1, 2, 3], [4, 5, 6]]), A);
    } catch (error) {
      caught = error;
    }
    expect(isCodedError(caught) && caught.code).toBe("matrix.mulMismatch");
  });

  it("adds, subtracts and scales", () => {
    expect(add(A, A)).toEqual(matrix(2, 2, [[2, 4], [6, 8]]));
    expect(subtract(A, A)).toEqual(matrix(2, 2, [[0, 0], [0, 0]]));
    expect(scalarMultiply(A, 2)).toEqual(matrix(2, 2, [[2, 4], [6, 8]]));
  });

  it("refuses to add matrices of different shapes", () => {
    expect(() => add(A, matrix(3, 1, [[1], [2], [3]]))).toThrowError(/matrix\.sizeMismatch/);
  });

  it("transposes at any shape", () => {
    expect(transpose(A)).toEqual(matrix(2, 2, [[1, 3], [2, 4]]));
    expect(transpose(matrix(1, 3, [[1, 2, 3]]))).toEqual(matrix(3, 1, [[1], [2], [3]]));
  });
});

describe("square properties", () => {
  it("computes the determinant", () => {
    expect(determinant(A)).toBeCloseTo(-2, 10);
    expect(
      determinant(
        matrix(3, 3, [
          [6, 1, 1],
          [4, -2, 5],
          [2, 8, 7],
        ])
      )
    ).toBeCloseTo(-306, 10);
  });

  it("returns 0 for a singular matrix", () => {
    expect(determinant(matrix(2, 2, [[1, 2], [2, 4]]))).toBe(0);
  });

  it("inverts so that A · A⁻¹ = I", () => {
    const product = multiply(A, inverse(A));
    const expected = identity(2);
    product.data.forEach((row, r) =>
      row.forEach((value, c) => expect(value).toBeCloseTo(expected.data[r][c], 10))
    );
  });

  it("throws on a singular inverse", () => {
    expect(() => inverse(matrix(2, 2, [[1, 2], [2, 4]]))).toThrowError(/matrix\.singular/);
  });

  it("requires a square matrix for det, inverse and trace", () => {
    const wide = matrix(2, 3, [[1, 2, 3], [4, 5, 6]]);
    expect(() => determinant(wide)).toThrowError(/matrix\.notSquare/);
    expect(() => inverse(wide)).toThrowError(/matrix\.notSquare/);
    expect(() => trace(wide)).toThrowError(/matrix\.notSquare/);
  });

  it("sums the diagonal", () => {
    expect(trace(A)).toBe(5);
  });
});

describe("rank", () => {
  it("counts independent rows", () => {
    expect(rank(A)).toBe(2);
    expect(rank(matrix(2, 2, [[1, 2], [2, 4]]))).toBe(1);
    expect(rank(matrix(3, 3, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]))).toBe(0);
  });

  it("handles non-square matrices", () => {
    expect(rank(matrix(2, 3, [[1, 2, 3], [2, 4, 6]]))).toBe(1);
    expect(rank(matrix(3, 2, [[1, 0], [0, 1], [1, 1]]))).toBe(2);
  });
});

describe("formatting", () => {
  it("writes one bracketed row per line", () => {
    expect(formatMatrix(A)).toBe("[1, 2]\n[3, 4]");
  });

  it("rounds binary noise and normalises negative zero", () => {
    expect(formatMatrix(matrix(1, 1, [[0.1 + 0.2]]))).toBe("[0.3]");
    expect(formatMatrix(matrix(1, 1, [[-0]]))).toBe("[0]");
    expect(formatMatrix(matrix(1, 1, [[1 / 3]]), 6)).toBe("[0.333333]");
  });
});
