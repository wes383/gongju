/**
 * Image helpers shared by the image tools.
 *
 * Everything runs in the browser: files are decoded with `createImageBitmap`
 * (falling back to `<img>`), drawn onto a canvas and re-encoded with
 * `canvas.toBlob`. Nothing is uploaded anywhere.
 */

import { codedError } from "./errors";

export { formatBytes, baseName, downloadBlob, downloadZip } from "./files";

export type ImageFormat = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

export const OUTPUT_FORMATS: { type: ImageFormat; label: string; ext: string; lossy: boolean }[] = [
  { type: "image/jpeg", label: "JPEG", ext: "jpg", lossy: true },
  { type: "image/png", label: "PNG", ext: "png", lossy: false },
  { type: "image/webp", label: "WebP", ext: "webp", lossy: true },
  { type: "image/avif", label: "AVIF", ext: "avif", lossy: true },
];

/** Refuse anything larger than this to avoid tab crashes on huge camera files. */
export const MAX_PIXELS = 40_000_000;

export function extensionFor(type: string): string {
  return OUTPUT_FORMATS.find((f) => f.type === type)?.ext ?? "png";
}

export function isLossy(type: string): boolean {
  return OUTPUT_FORMATS.find((f) => f.type === type)?.lossy ?? false;
}

/** Decode a file into an image. The object URL is revoked once decoded. */
export async function decodeFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    if (img.naturalWidth * img.naturalHeight > MAX_PIXELS) {
      throw codedError("image.tooLarge");
    }
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type Anchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export const ANCHORS: Anchor[] = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
];

function anchorFactors(anchor: Anchor): { fx: number; fy: number } {
  // "left" / "right" / "top" / "bottom" have no dash, so splitting on "-"
  // would read them as the vertical axis and fall back to the centre.
  const fy = anchor.startsWith("top") ? 0 : anchor.startsWith("bottom") ? 1 : 0.5;
  const fx = anchor.endsWith("left") ? 0 : anchor.endsWith("right") ? 1 : 0.5;
  return { fx, fy };
}

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Largest rectangle of the given aspect ratio that fits inside the source,
 * positioned according to the anchor. Used by the "crop to fill" mode.
 */
export function cropRect(
  sourceWidth: number,
  sourceHeight: number,
  targetRatio: number,
  anchor: Anchor = "center"
): SourceRect {
  const sourceRatio = sourceWidth / sourceHeight;
  let sw = sourceWidth;
  let sh = sourceHeight;
  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
  } else {
    sh = sourceWidth / targetRatio;
  }
  const { fx, fy } = anchorFactors(anchor);
  return {
    sx: (sourceWidth - sw) * fx,
    sy: (sourceHeight - sh) * fy,
    sw,
    sh,
  };
}

export interface RenderOptions {
  width: number;
  height: number;
  /** stretch = ignore ratio, contain = letterbox, cover = crop to fill */
  fit?: "stretch" | "contain" | "cover";
  anchor?: Anchor;
  /** Painted before the image, useful for flattening transparency */
  background?: string;
  /** Explicit source rectangle; overrides fit/anchor */
  source?: SourceRect;
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function renderImage(image: CanvasImageSource, opts: RenderOptions): HTMLCanvasElement {
  const { width, height, fit = "contain", anchor = "center", background, source } = opts;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw codedError("image.canvasUnavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const natural = naturalSize(image);
  const rect = source ?? { sx: 0, sy: 0, sw: natural.width, sh: natural.height };

  if (fit === "cover" && !source) {
    const crop = cropRect(natural.width, natural.height, canvas.width / canvas.height, anchor);
    ctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  if (fit === "contain" && !source) {
    const scale = Math.min(canvas.width / rect.sw, canvas.height / rect.sh);
    const w = rect.sw * scale;
    const h = rect.sh * scale;
    const { fx, fy } = anchorFactors(anchor);
    ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, (canvas.width - w) * fx, (canvas.height - h) * fy, w, h);
    return canvas;
  }

  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function naturalSize(image: CanvasImageSource): { width: number; height: number } {
  if (image instanceof HTMLImageElement) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  const source = image as { width?: number; height?: number; videoWidth?: number; videoHeight?: number };
  return {
    width: source.width ?? source.videoWidth ?? 0,
    height: source.height ?? source.videoHeight ?? 0,
  };
}

const supportCache = new Map<string, boolean>();

/** Canvas encoding support differs per browser; probe once per format. */
export async function supportsFormat(type: string): Promise<boolean> {
  const cached = supportCache.get(type);
  if (cached !== undefined) return cached;
  if (typeof document === "undefined") return false;
  const canvas = createCanvas(1, 1);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.8));
  // Browsers silently fall back to PNG when the type is unknown.
  const ok = !!blob && blob.type === type;
  supportCache.set(type, ok);
  return ok;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(codedError("image.encodeFailed"));
        else resolve(blob);
      },
      type,
      isLossy(type) ? quality : undefined
    );
  });
}

/**
 * Binary-search the quality so the encoded blob lands just under `targetBytes`.
 * Returns the closest blob that fits, or the smallest one if nothing fits.
 */
export async function encodeToTarget(
  canvas: HTMLCanvasElement,
  type: string,
  targetBytes: number
): Promise<{ blob: Blob; quality: number }> {
  if (!isLossy(type)) {
    const blob = await canvasToBlob(canvas, type);
    return { blob, quality: 1 };
  }
  let low = 0.05;
  let high = 0.95;
  let best: { blob: Blob; quality: number } | null = null;
  let smallest: { blob: Blob; quality: number } | null = null;

  for (let i = 0; i < 8; i += 1) {
    const quality = (low + high) / 2;
    const blob = await canvasToBlob(canvas, type, quality);
    if (!smallest || blob.size < smallest.blob.size) smallest = { blob, quality };
    if (blob.size <= targetBytes) {
      best = { blob, quality };
      low = quality;
    } else {
      high = quality;
    }
  }
  return best ?? smallest ?? { blob: await canvasToBlob(canvas, type, 0.05), quality: 0.05 };
}

/** Read a single pixel as #rrggbb. */export function pixelColor(ctx: CanvasRenderingContext2D, x: number, y: number): string {
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Relative luminance, used to pick a readable label colour on a swatch. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgbTuple(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Encode under a byte budget. Quality is searched first; if even the lowest
 * quality overshoots, the canvas is downscaled and tried again.
 */
export async function encodeUnderSize(
  image: CanvasImageSource,
  opts: {
    width: number;
    height: number;
    format: string;
    targetBytes: number;
    background?: string;
    minScale?: number;
  }
): Promise<{ blob: Blob; quality: number; width: number; height: number }> {
  const { format, targetBytes, background, minScale = 0.25 } = opts;
  let width = opts.width;
  let height = opts.height;
  let best: { blob: Blob; quality: number; width: number; height: number } | null = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const canvas = renderImage(image, { width, height, background });
    const { blob, quality } = await encodeToTarget(canvas, format, targetBytes);
    if (!best || blob.size < best.blob.size) best = { blob, quality, width, height };
    if (blob.size <= targetBytes) break;
    const nextScale = 0.8;
    if (width * nextScale < opts.width * minScale) break;
    width = Math.round(width * nextScale);
    height = Math.round(height * nextScale);
  }

  return best ?? { blob: await canvasToBlob(createCanvas(1, 1), format), quality: 0.5, width, height };
}
