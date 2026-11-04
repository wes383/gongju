/**
 * Dense-matrix helpers for the matrix calculator.
 *
 * Matrices are plain nested arrays wrapped in a `{ rows, cols, data }` shell:
 * no classes, no prototype methods, so results can be formatted, compared in
 * tests or serialised without ceremony. Every routine assumes a rectangular
 * input; `parseMatrix` is the only place that checks it.
 *
 * The numeric tolerance is absolute (1e-12). That is plenty for hand-entered
 * numbers, and the routines that care about conditioning (rank) scale it to the
 * largest entry instead.
 */

import { codedError } from "./errors";

export interface Matrix {
  rows: number;
  cols: number;
  data: number[][];
}

const EPS = 1e-12;

export function matrix(rows: number, cols: number, data: number[][]): Matrix {
  return { rows, cols, data };
}

/**
 * Accepts rows separated by newlines or semicolons, cells by spaces, commas or
 * tabs, and an optional `[ ... ]` wrapper — the shapes people paste from Excel,
 * MATLAB, Python and chat logs alike.
 */
export function parseMatrix(source: string): Matrix {
  const body = source
    .replace(/^\s*\[/, "")
    .replace(/\]\s*$/, "")
    .trim();
  if (!body) throw codedError("matrix.empty");

  const lines = body
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) throw codedError("matrix.empty");

  const data = lines.map((line) =>
    line
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((cell) => {
        const value = Number(cell);
        if (!Number.isFinite(value)) throw codedError("matrix.invalid", cell);
        return value;
      })
  );

  const cols = data[0].length;
  if (cols === 0) throw codedError("matrix.empty");
  if (data.some((row) => row.length !== cols)) throw codedError("matrix.ragged");

  return { rows: data.length, cols, data };
}

/** 12 significant digits is enough to hide binary noise without lying */
export function formatCell(value: number, digits = 12): string {
  if (Number.isNaN(value)) return "NaN";
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "−∞";
  const rounded = Number(value.toPrecision(digits));
  return String(rounded === 0 ? 0 : rounded);
}

export function formatMatrix(m: Matrix, digits = 12): string {
  return m.data.map((row) => `[${row.map((v) => formatCell(v, digits)).join(", ")}]`).join("\n");
}

function requireSquare(a: Matrix): void {
  if (a.rows !== a.cols) throw codedError("matrix.notSquare", a.rows, a.cols);
}

function requireSameSize(a: Matrix, b: Matrix): void {
  if (a.rows !== b.rows || a.cols !== b.cols) {
    throw codedError(
      "matrix.sizeMismatch",
      `${a.rows}×${a.cols}`,
      `${b.rows}×${b.cols}`
    );
  }
}

export function add(a: Matrix, b: Matrix): Matrix {
  requireSameSize(a, b);
  return {
    rows: a.rows,
    cols: a.cols,
    data: a.data.map((row, r) => row.map((v, c) => v + b.data[r][c])),
  };
}

export function subtract(a: Matrix, b: Matrix): Matrix {
  requireSameSize(a, b);
  return {
    rows: a.rows,
    cols: a.cols,
    data: a.data.map((row, r) => row.map((v, c) => v - b.data[r][c])),
  };
}

export function scalarMultiply(a: Matrix, k: number): Matrix {
  return { rows: a.rows, cols: a.cols, data: a.data.map((row) => row.map((v) => v * k)) };
}

export function multiply(a: Matrix, b: Matrix): Matrix {
  if (a.cols !== b.rows) throw codedError("matrix.mulMismatch", a.cols, b.rows);
  const data = Array.from({ length: a.rows }, (_, r) =>
    Array.from({ length: b.cols }, (_, c) => {
      let sum = 0;
      for (let k = 0; k < a.cols; k += 1) sum += a.data[r][k] * b.data[k][c];
      return sum;
    })
  );
  return { rows: a.rows, cols: b.cols, data };
}

export function transpose(a: Matrix): Matrix {
  return {
    rows: a.cols,
    cols: a.rows,
    data: Array.from({ length: a.cols }, (_, c) => Array.from({ length: a.rows }, (_, r) => a.data[r][c])),
  };
}

export function identity(n: number): Matrix {
  return {
    rows: n,
    cols: n,
    data: Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => (r === c ? 1 : 0))),
  };
}

export function trace(a: Matrix): number {
  requireSquare(a);
  return a.data.reduce((sum, row, i) => sum + row[i], 0);
}

/** LU decomposition with partial pivoting; a singular matrix has determinant 0 */
export function determinant(a: Matrix): number {
  requireSquare(a);
  const n = a.rows;
  const m = a.data.map((row) => row.slice());
  let det = 1;

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < EPS) return 0;
    if (pivot !== col) {
      [m[pivot], m[col]] = [m[col], m[pivot]];
      det = -det;
    }
    det *= m[col][col];
    for (let r = col + 1; r < n; r += 1) {
      const factor = m[r][col] / m[col][col];
      if (factor === 0) continue;
      for (let c = col; c < n; c += 1) m[r][c] -= factor * m[col][c];
    }
  }

  return det;
}

/** Gauss-Jordan on `[a | I]`; throws for a singular matrix instead of returning garbage */
export function inverse(a: Matrix): Matrix {
  requireSquare(a);
  const n = a.rows;
  const m = a.data.map((row, r) => [...row, ...Array.from({ length: n }, (_, c) => (r === c ? 1 : 0))]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) < EPS) throw codedError("matrix.singular");

    if (pivot !== col) [m[pivot], m[col]] = [m[col], m[pivot]];
    const lead = m[col][col];
    for (let c = 0; c < 2 * n; c += 1) m[col][c] /= lead;

    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = m[r][col];
      if (factor === 0) continue;
      for (let c = 0; c < 2 * n; c += 1) m[r][c] -= factor * m[col][c];
    }
  }

  return { rows: n, cols: n, data: m.map((row) => row.slice(n)) };
}

/** Row-reduction to echelon form, counting non-zero rows */
export function rank(a: Matrix): number {
  const m = a.data.map((row) => row.slice());
  const scale = Math.max(1, ...m.flat().map((v) => Math.abs(v)));
  const eps = scale * 1e-10;
  let filled = 0;

  for (let col = 0; col < a.cols && filled < a.rows; col += 1) {
    let pivot = filled;
    for (let r = filled + 1; r < a.rows; r += 1) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    if (Math.abs(m[pivot][col]) <= eps) continue;

    [m[pivot], m[filled]] = [m[filled], m[pivot]];
    for (let r = filled + 1; r < a.rows; r += 1) {
      const factor = m[r][col] / m[filled][col];
      if (factor === 0) continue;
      for (let c = col; c < a.cols; c += 1) m[r][c] -= factor * m[filled][c];
    }
    filled += 1;
  }

  return filled;
}
