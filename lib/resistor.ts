/**
 * Resistor colour codes.
 *
 * Everything here is pure arithmetic on the standard IEC 60062 table, so it
 * can run during render and be unit tested without a DOM.
 */
import { codedError } from "./errors";
import { formatNumber } from "./units";

export type BandColorId =
  | "black"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "violet"
  | "grey"
  | "white"
  | "gold"
  | "silver";

export interface BandColor {
  id: BandColorId;
  name: { zh: string; en: string };
  /** Swatch colour; gold and silver are the only metallic bands */
  hex: string;
  /** Significant digit, null for gold and silver */
  digit: number | null;
  multiplier: number | null;
  /** Tolerance as a fraction of the nominal value */
  tolerance: number | null;
  /** Temperature coefficient in ppm/K */
  tempco: number | null;
}

export const BAND_COLORS: BandColor[] = [
  {
    id: "black",
    name: { zh: "黑", en: "Black" },
    hex: "#111111",
    digit: 0,
    multiplier: 1,
    tolerance: null,
    tempco: null,
  },
  {
    id: "brown",
    name: { zh: "棕", en: "Brown" },
    hex: "#8b4513",
    digit: 1,
    multiplier: 10,
    tolerance: 0.01,
    tempco: 100,
  },
  {
    id: "red",
    name: { zh: "红", en: "Red" },
    hex: "#d92b2b",
    digit: 2,
    multiplier: 100,
    tolerance: 0.02,
    tempco: 50,
  },
  {
    id: "orange",
    name: { zh: "橙", en: "Orange" },
    hex: "#f08a24",
    digit: 3,
    multiplier: 1e3,
    tolerance: null,
    tempco: 15,
  },
  {
    id: "yellow",
    name: { zh: "黄", en: "Yellow" },
    hex: "#f2c81c",
    digit: 4,
    multiplier: 1e4,
    tolerance: null,
    tempco: 25,
  },
  {
    id: "green",
    name: { zh: "绿", en: "Green" },
    hex: "#1f9d55",
    digit: 5,
    multiplier: 1e5,
    tolerance: 0.005,
    tempco: 20,
  },
  {
    id: "blue",
    name: { zh: "蓝", en: "Blue" },
    hex: "#2563eb",
    digit: 6,
    multiplier: 1e6,
    tolerance: 0.0025,
    tempco: 10,
  },
  {
    id: "violet",
    name: { zh: "紫", en: "Violet" },
    hex: "#7c3aed",
    digit: 7,
    multiplier: 1e7,
    tolerance: 0.001,
    tempco: 5,
  },
  {
    id: "grey",
    name: { zh: "灰", en: "Grey" },
    hex: "#808080",
    digit: 8,
    multiplier: 1e8,
    tolerance: 0.0005,
    tempco: 1,
  },
  {
    id: "white",
    name: { zh: "白", en: "White" },
    hex: "#f5f5f5",
    digit: 9,
    multiplier: 1e9,
    tolerance: null,
    tempco: null,
  },
  {
    id: "gold",
    name: { zh: "金", en: "Gold" },
    hex: "#c9a227",
    digit: null,
    multiplier: 0.1,
    tolerance: 0.05,
    tempco: null,
  },
  {
    id: "silver",
    name: { zh: "银", en: "Silver" },
    hex: "#b9b9c0",
    digit: null,
    multiplier: 0.01,
    tolerance: 0.1,
    tempco: null,
  },
];

const BY_ID = new Map(BAND_COLORS.map((color) => [color.id, color]));

export function bandColor(id: BandColorId): BandColor {
  const color = BY_ID.get(id);
  if (!color) throw codedError("res.color", id);
  return color;
}

/** 4, 5 or 6 bands; 3-band parts are rare enough to skip */
export const BAND_COUNTS = [4, 5, 6] as const;
export type BandCount = (typeof BAND_COUNTS)[number];

/** Colours that make sense in a given slot, so the picker can hide the rest */
export function colorsForSlot(slot: "digit" | "multiplier" | "tolerance" | "tempco"): BandColor[] {
  switch (slot) {
    case "digit":
      return BAND_COLORS.filter((color) => color.digit !== null);
    case "multiplier":
      return BAND_COLORS.filter((color) => color.multiplier !== null);
    case "tolerance":
      return BAND_COLORS.filter((color) => color.tolerance !== null);
    case "tempco":
      return BAND_COLORS.filter((color) => color.tempco !== null);
  }
}

export interface DecodedResistor {
  ohms: number;
  /** Digits as typed by the colour bands, e.g. "47" */
  digits: string;
  multiplier: number;
  tolerance: number | null;
  tempco: number | null;
  min: number | null;
  max: number | null;
  /** "47 × 100 Ω" for the working-out line */
  expression: string;
}

export function decodeBands(colors: BandColorId[]): DecodedResistor {
  if (colors.length !== 4 && colors.length !== 5 && colors.length !== 6) {
    throw codedError("res.bandCount", colors.length);
  }
  const significant = colors.length === 4 ? 2 : 3;
  let digits = "";
  for (let i = 0; i < significant; i += 1) {
    const color = bandColor(colors[i]);
    if (color.digit === null) throw codedError("res.digitSlot", i + 1);
    digits += String(color.digit);
  }
  const multiplierColor = bandColor(colors[significant]);
  if (multiplierColor.multiplier === null) throw codedError("res.multiplierSlot", significant + 1);
  const toleranceColor = bandColor(colors[significant + 1]);
  const tempcoColor = colors[significant + 2] ? bandColor(colors[significant + 2]) : null;

  const digitsValue = Number(digits);
  const ohms = digitsValue * multiplierColor.multiplier;
  if (!Number.isFinite(ohms) || ohms <= 0) throw codedError("res.zero");
  const tolerance = toleranceColor.tolerance;

  return {
    ohms,
    digits,
    multiplier: multiplierColor.multiplier,
    tolerance,
    tempco: tempcoColor ? tempcoColor.tempco : null,
    min: tolerance === null ? null : ohms * (1 - tolerance),
    max: tolerance === null ? null : ohms * (1 + tolerance),
    expression: `${digits} × ${formatNumber(multiplierColor.multiplier)} Ω`,
  };
}

/** Nearest colour whose tolerance is closest to the requested fraction */
function toleranceColorFor(tolerance: number): BandColor {
  const candidates = BAND_COLORS.filter((color) => color.tolerance !== null);
  let best = candidates[0];
  for (const color of candidates) {
    if (Math.abs(color.tolerance! - tolerance) < Math.abs(best.tolerance! - tolerance) - 1e-12) {
      best = color;
    }
  }
  return best;
}

function tempcoColorFor(tempco: number): BandColor {
  const candidates = BAND_COLORS.filter((color) => color.tempco !== null);
  let best = candidates[0];
  for (const color of candidates) {
    if (Math.abs(color.tempco! - tempco) < Math.abs(best.tempco! - tempco) - 1e-12) {
      best = color;
    }
  }
  return best;
}

export interface EncodedResistor {
  colors: BandColorId[];
  /** Value the bands actually spell out, which may differ after rounding */
  ohms: number;
  exact: boolean;
  tolerance: number;
  tempco: number | null;
}

/**
 * Turn a resistance into bands.
 *
 * The mantissa is normalised into the digit slots and rounded down to an
 * integer, so 4670 Ω on a 4-band part comes out as 4700 Ω — that difference is
 * reported through `exact` rather than hidden.
 */
export function encodeValue(
  ohms: number,
  options: { bands?: BandCount; tolerance?: number; tempco?: number } = {}
): EncodedResistor {
  const bands = options.bands ?? 4;
  const tolerance = options.tolerance ?? 0.01;
  if (!Number.isFinite(ohms) || ohms <= 0) throw codedError("res.positive");

  const significant = bands === 4 ? 2 : 3;
  const limit = 10 ** significant - 1;
  let mantissa = ohms;
  let exponent = 0;
  // Normalise into [10^(n-1), 10^n) so the mantissa fills every digit slot
  while (mantissa >= limit + 1) {
    mantissa /= 10;
    exponent += 1;
  }
  while (mantissa < 10 ** (significant - 1)) {
    mantissa *= 10;
    exponent -= 1;
  }
  let leading = Math.round(mantissa);
  let place = exponent;
  if (leading > limit) {
    // Rounding pushed 99 up to 100 — carry one place instead of losing a digit
    leading = 10 ** (significant - 1);
    place += 1;
  }
  if (place < -2 || place > 9) throw codedError("res.outOfRange", formatOhms(ohms));

  const multiplier = 10 ** place;
  const digitColors = String(leading)
    .padStart(significant, "0")
    .split("")
    .map((digit) => BAND_COLORS.find((color) => color.digit === Number(digit))!.id);
  const toleranceBand = toleranceColorFor(tolerance);
  const colors: BandColorId[] = [
    ...digitColors,
    BAND_COLORS.find((color) => color.multiplier === multiplier)!.id,
    toleranceBand.id,
  ];
  if (bands === 6) colors.push(tempcoColorFor(options.tempco ?? 100).id);

  const actual = leading * multiplier;
  return {
    colors,
    ohms: actual,
    exact: Math.abs(actual - ohms) <= ohms * 1e-9,
    tolerance: toleranceBand.tolerance!,
    tempco: bands === 6 ? tempcoColorFor(options.tempco ?? 100).tempco : null,
  };
}

/** "4.7 kΩ" with a sensible prefix for every decade */
export function formatOhms(ohms: number): string {
  if (!Number.isFinite(ohms)) return "—";
  const abs = Math.abs(ohms);
  if (abs >= 1e9) return `${formatNumber(ohms / 1e9, 4)} GΩ`;
  if (abs >= 1e6) return `${formatNumber(ohms / 1e6, 4)} MΩ`;
  if (abs >= 1e3) return `${formatNumber(ohms / 1e3, 4)} kΩ`;
  if (abs >= 1) return `${formatNumber(ohms, 4)} Ω`;
  return `${formatNumber(ohms * 1e3, 4)} mΩ`;
}
