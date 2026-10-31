/**
 * Colour maths shared by the colour / CSS tools.
 *
 * Everything is plain sRGB (0–255 channels, 0–360 hue). Conversions are the
 * standard formulas, kept here so each tool stays about its own UI.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function rgbToHex({ r, g, b }: RGB): string {
  return `#${[r, g, b]
    .map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Accepts #rgb, #rrggbb, rgb(), rgba(), hsl(), hsla() and plain hex. */
export function parseColor(input: string): RGB | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  if (text.startsWith("#") || /^[0-9a-f]{3,8}$/.test(text)) {
    const hex = text.replace("#", "");
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return null;
  }

  const rgbMatch = text.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      return {
        r: clamp(parts[0], 0, 255),
        g: clamp(parts[1], 0, 255),
        b: clamp(parts[2], 0, 255),
      };
    }
    return null;
  }

  const hslMatch = text.match(/^hsla?\(([^)]+)\)$/);
  if (hslMatch) {
    const parts = hslMatch[1].split(/[,/\s]+/).filter(Boolean);
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    const l = parseFloat(parts[2]);
    if ([h, s, l].every((n) => Number.isFinite(n))) {
      return hslToRgb({ h, s, l });
    }
  }

  return null;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hue = ((h % 360) + 360) % 360 / 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  if (sat === 0) {
    const v = Math.round(light * 255);
    return { r: v, g: v, b: v };
  }
  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  return {
    r: Math.round(channel(hue + 1 / 3) * 255),
    g: Math.round(channel(hue) * 255),
    b: Math.round(channel(hue - 1 / 3) * 255),
  };
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
    else if (max === gn) h = ((bn - rn) / d + 2) / 6;
    else h = ((rn - gn) / d + 4) / 6;
  }
  return { h: h * 360, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const hue = (((h % 360) + 360) % 360) / 60;
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs((hue % 2) - 1));
  const m = val - c;
  const [r, g, b] =
    hue < 1
      ? [c, x, 0]
      : hue < 2
        ? [x, c, 0]
        : hue < 3
          ? [0, c, x]
          : hue < 4
            ? [0, x, c]
            : hue < 5
              ? [x, 0, c]
              : [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToCmyk({ r, g, b }: RGB): { c: number; m: number; y: number; k: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: ((1 - rn - k) / (1 - k)) * 100,
    m: ((1 - gn - k) / (1 - k)) * 100,
    y: ((1 - bn - k) / (1 - k)) * 100,
    k: k * 100,
  };
}

/** WCAG relative luminance */
export function relativeLuminance({ r, g, b }: RGB): number {
  const [rl, gl, bl] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Black or white, whichever reads better on the given colour. */
export function readableTextColor(rgb: RGB): string {
  return contrastRatio(rgb, { r: 0, g: 0, b: 0 }) >= contrastRatio(rgb, { r: 255, g: 255, b: 255 })
    ? "#000000"
    : "#ffffff";
}

export type HarmonyKind =
  | "complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "split"
  | "monochromatic";

export const HARMONY_OFFSETS: Record<Exclude<HarmonyKind, "monochromatic">, number[]> = {
  complementary: [0, 180],
  analogous: [-30, 0, 30],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
  split: [0, 150, 210],
};

/** Build a harmony from a base colour; monochromatic varies lightness instead. */
export function harmony(base: HSL, kind: HarmonyKind): HSL[] {
  if (kind === "monochromatic") {
    return [90, 75, 60, 45, 30].map((l) => ({ ...base, l }));
  }
  return HARMONY_OFFSETS[kind].map((offset) => ({ ...base, h: (base.h + offset + 360) % 360 }));
}

export function randomHex(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return rgbToHex({ r: bytes[0], g: bytes[1], b: bytes[2] });
}

/** Classic colour-vision-deficiency matrices (Brettel-style approximations). */
export const BLINDNESS_MATRICES: Record<
  "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia",
  number[][]
> = {
  protanopia: [
    [0.567, 0.433, 0.0],
    [0.558, 0.442, 0.0],
    [0.0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0.0],
    [0.0, 0.433, 0.567],
    [0.0, 0.475, 0.525],
  ],
  achromatopsia: [
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
    [0.299, 0.587, 0.114],
  ],
};

export function simulateBlindness(
  rgb: RGB,
  kind: keyof typeof BLINDNESS_MATRICES
): RGB {
  const m = BLINDNESS_MATRICES[kind];
  const channels = [rgb.r, rgb.g, rgb.b];
  const out = m.map((row) =>
    Math.round(clamp(row[0] * channels[0] + row[1] * channels[1] + row[2] * channels[2], 0, 255))
  );
  return { r: out[0], g: out[1], b: out[2] };
}

/** CSS colour string for a given alpha, used by the glassmorphism preview. */
export function rgbaString(rgb: RGB, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
