/**
 * Braille cell helpers shared by the Grade 1 and Grade 2 converters.
 *
 * A cell is a Unicode braille pattern (U+2800 + bitmask); dots are written as
 * the digits 1–6, so `cellFromDots("145")` is ⠙.
 */

const CELL_BASE = 0x2800;

export function cellFromDots(dots: string): string {
  let value = 0;
  for (const char of dots) {
    const bit = Number(char) - 1;
    if (bit >= 0 && bit < 6) value |= 1 << bit;
  }
  return String.fromCharCode(CELL_BASE + value);
}

export function dotsFromCell(cell: string): string {
  const code = cell.codePointAt(0) ?? 0;
  if (code < CELL_BASE || code > CELL_BASE + 0xff) return "";
  const value = code - CELL_BASE;
  const dots: number[] = [];
  for (let bit = 0; bit < 6; bit += 1) {
    if (value & (1 << bit)) dots.push(bit + 1);
  }
  return dots.join("");
}

export function isBrailleCell(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code >= CELL_BASE && code <= CELL_BASE + 0xff;
}

/** Render a space separated dot pattern ("5 145") as cells (⠐⠙) */
export function cellsFromDots(dots: string): string {
  return dots
    .split(/\s+/)
    .filter(Boolean)
    .map(cellFromDots)
    .join("");
}

export const EN_LETTERS: Record<string, string> = {
  a: "1",
  b: "12",
  c: "14",
  d: "145",
  e: "15",
  f: "124",
  g: "1245",
  h: "125",
  i: "24",
  j: "245",
  k: "13",
  l: "123",
  m: "134",
  n: "1345",
  o: "135",
  p: "1234",
  q: "12345",
  r: "1235",
  s: "234",
  t: "2345",
  u: "136",
  v: "1236",
  w: "2456",
  x: "1346",
  y: "13456",
  z: "1356",
};

export const EN_PUNCT: Record<string, string> = {
  ",": "2",
  ".": "256",
  "?": "26",
  "!": "235",
  ";": "23",
  ":": "25",
  "'": "3",
  '"': "2356",
  "-": "36",
  "/": "34",
};

const DIGIT_LETTERS = "abcdefghij";

/** Digit 1 maps to `a`, digit 0 to `j` */
export function digitLetter(digit: number): string {
  return DIGIT_LETTERS[(digit + 9) % 10];
}

export function letterDigit(letter: string): number {
  const index = DIGIT_LETTERS.indexOf(letter);
  return index < 0 ? -1 : (index + 1) % 10;
}

export const EN_BY_DOTS: Record<string, string> = Object.fromEntries(
  Object.entries(EN_LETTERS).map(([letter, dots]) => [dots, letter])
);

/** `⠠` (dot 6) marks the next letter as a capital */
export const CAPITAL_SIGN = "6";
/** `⠼` (dots 3456) switches the following letters to digits */
export const NUMBER_SIGN = "3456";
