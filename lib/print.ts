/**
 * Print sizes: paper formats, pixel ↔ physical size at a given DPI, and the
 * bleed / safe area box that a print shop expects.
 *
 * Paper dimensions are portrait, in millimetres, as defined by ISO 216 and the
 * usual photographic print sizes.
 */
import { codedError } from "./errors";

export interface PaperSize {
  id: string;
  name: { zh: string; en: string };
  /** Portrait width in mm */
  width: number;
  /** Portrait height in mm */
  height: number;
}

const MM_PER_INCH = 25.4;

export const PAPER_SIZES: PaperSize[] = [
  { id: "a3", name: { zh: "A3", en: "A3" }, width: 297, height: 420 },
  { id: "a4", name: { zh: "A4", en: "A4" }, width: 210, height: 297 },
  { id: "a5", name: { zh: "A5", en: "A5" }, width: 148, height: 210 },
  { id: "a6", name: { zh: "A6", en: "A6" }, width: 105, height: 148 },
  { id: "b5", name: { zh: "B5", en: "B5" }, width: 176, height: 250 },
  { id: "letter", name: { zh: "Letter（美式信纸）", en: "Letter" }, width: 215.9, height: 279.4 },
  { id: "legal", name: { zh: "Legal（美式法律用纸）", en: "Legal" }, width: 215.9, height: 355.6 },
  { id: "photo5", name: { zh: "5 寸（3.5 × 5 in）", en: "5 inch (3.5 × 5 in)" }, width: 89, height: 127 },
  { id: "photo6", name: { zh: "6 寸（4 × 6 in）", en: "6 inch (4 × 6 in)" }, width: 102, height: 152 },
  { id: "photo7", name: { zh: "7 寸（5 × 7 in）", en: "7 inch (5 × 7 in)" }, width: 127, height: 178 },
  { id: "photo8", name: { zh: "8 寸（6 × 8 in）", en: "8 inch (6 × 8 in)" }, width: 152, height: 203 },
  { id: "photo10", name: { zh: "10 寸（8 × 10 in）", en: "10 inch (8 × 10 in)" }, width: 203, height: 254 },
  { id: "photo12", name: { zh: "12 寸（10 × 12 in）", en: "12 inch (10 × 12 in)" }, width: 254, height: 305 },
];

export function getPaper(id: string): PaperSize {
  const found = PAPER_SIZES.find((paper) => paper.id === id);
  if (!found) throw codedError("print.paper", id);
  return found;
}

export interface PhysicalSize {
  widthMm: number;
  heightMm: number;
  widthIn: number;
  heightIn: number;
}

function physical(widthMm: number, heightMm: number): PhysicalSize {
  return {
    widthMm,
    heightMm,
    widthIn: widthMm / MM_PER_INCH,
    heightIn: heightMm / MM_PER_INCH,
  };
}

/** Physical size of an image at a given DPI */
export function printSize(pixelWidth: number, pixelHeight: number, dpi: number): PhysicalSize {
  if (!Number.isFinite(pixelWidth) || pixelWidth <= 0) throw codedError("print.pixels");
  if (!Number.isFinite(pixelHeight) || pixelHeight <= 0) throw codedError("print.pixels");
  if (!Number.isFinite(dpi) || dpi <= 0) throw codedError("print.dpi");
  return physical((pixelWidth / dpi) * MM_PER_INCH, (pixelHeight / dpi) * MM_PER_INCH);
}

/** Pixels needed to print a given physical size at a given DPI */
export function pixelsFor(widthMm: number, heightMm: number, dpi: number): { width: number; height: number } {
  if (!Number.isFinite(widthMm) || widthMm <= 0) throw codedError("print.size");
  if (!Number.isFinite(heightMm) || heightMm <= 0) throw codedError("print.size");
  if (!Number.isFinite(dpi) || dpi <= 0) throw codedError("print.dpi");
  return {
    width: Math.round((widthMm / MM_PER_INCH) * dpi),
    height: Math.round((heightMm / MM_PER_INCH) * dpi),
  };
}

/** Effective resolution of an image printed at a given physical width */
export function resolutionOf(pixelWidth: number, widthMm: number): number {
  if (!Number.isFinite(pixelWidth) || pixelWidth <= 0) throw codedError("print.pixels");
  if (!Number.isFinite(widthMm) || widthMm <= 0) throw codedError("print.size");
  return pixelWidth / (widthMm / MM_PER_INCH);
}

export type Quality = "excellent" | "good" | "fair" | "low";

/** Print-shop rule of thumb: 300 ppi for close viewing, 150 ppi is the floor */
export function qualityOf(ppi: number): Quality {
  if (ppi >= 300) return "excellent";
  if (ppi >= 200) return "good";
  if (ppi >= 150) return "fair";
  return "low";
}

export interface BleedInput {
  widthMm: number;
  heightMm: number;
  /** Extra image beyond the trim line on every side */
  bleedMm: number;
  /** Distance from the trim line to the safe zone */
  safeMm: number;
  dpi?: number;
}

export interface BleedResult {
  trim: PhysicalSize;
  /** Trim plus bleed on all four sides — the file size */
  withBleed: PhysicalSize;
  /** Area that survives trimming and stays clear of the edge */
  safe: PhysicalSize;
  /** Pixel dimensions at the requested DPI */
  pixels: { width: number; height: number } | null;
}

export function bleedBox({ widthMm, heightMm, bleedMm, safeMm, dpi }: BleedInput): BleedResult {
  if (!Number.isFinite(widthMm) || widthMm <= 0) throw codedError("print.size");
  if (!Number.isFinite(heightMm) || heightMm <= 0) throw codedError("print.size");
  if (!Number.isFinite(bleedMm) || bleedMm < 0) throw codedError("print.bleed");
  if (!Number.isFinite(safeMm) || safeMm < 0) throw codedError("print.safe");
  if (safeMm * 2 >= Math.min(widthMm, heightMm)) throw codedError("print.safeTooBig");

  const outer = physical(widthMm + bleedMm * 2, heightMm + bleedMm * 2);
  const safe = physical(widthMm - safeMm * 2, heightMm - safeMm * 2);
  return {
    trim: physical(widthMm, heightMm),
    withBleed: outer,
    safe,
    pixels: dpi && dpi > 0 ? pixelsFor(outer.widthMm, outer.heightMm, dpi) : null,
  };
}

/** mm → in, rounded for display */
export function toInches(mm: number): number {
  return mm / MM_PER_INCH;
}
