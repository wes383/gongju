/**
 * Redaction primitives for the image masking tool.
 *
 * Rects are stored in source-image pixels so the export is independent of how
 * large the preview happens to be on screen.
 */

export type RedactMode = "mosaic" | "blur" | "solid";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RedactOptions {
  mode: RedactMode;
  /** Mosaic cell size in source pixels */
  blockSize: number;
  /** Gaussian blur radius in source pixels */
  blur: number;
  /** Fill colour for `solid` */
  color: string;
}

export const DEFAULT_REDACT: RedactOptions = {
  mode: "mosaic",
  blockSize: 12,
  blur: 10,
  color: "#000000",
};

/** Rect from two drag points, clamped to the image bounds */
export function normalizeRect(
  start: { x: number; y: number },
  end: { x: number; y: number },
  bounds: { width: number; height: number }
): Rect {
  const x = Math.max(0, Math.min(start.x, end.x));
  const y = Math.max(0, Math.min(start.y, end.y));
  const right = Math.min(bounds.width, Math.max(start.x, end.x));
  const bottom = Math.min(bounds.height, Math.max(start.y, end.y));
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/** Ignore accidental clicks that would produce a one-pixel smear */
export function isUsableRect(rect: Rect, min = 4): boolean {
  return rect.width >= min && rect.height >= min;
}

function pixelate(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  rect: Rect,
  blockSize: number,
  scale: number
): void {
  const size = Math.max(2, Math.round(blockSize * scale));
  const cellsX = Math.max(1, Math.ceil(rect.width / size));
  const cellsY = Math.max(1, Math.ceil(rect.height / size));

  const small = document.createElement("canvas");
  small.width = cellsX;
  small.height = cellsY;
  const smallCtx = small.getContext("2d");
  if (!smallCtx) return;
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, cellsX, cellsY);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, cellsX, cellsY, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();
}

/**
 * Draw the redactions onto a canvas that already holds the image.
 *
 * `scale` maps whatever unit the caller used (usually preview pixels) to the
 * canvas pixels, so the same rect list works on screen and on export.
 */
export function drawRedactions(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  rects: Rect[],
  options: RedactOptions,
  scale = 1
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  for (const rect of rects) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (options.mode === "solid") {
      ctx.fillStyle = options.color;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      continue;
    }
    if (options.mode === "mosaic") {
      pixelate(ctx, source, rect, options.blockSize, scale);
      continue;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();
    ctx.filter = `blur(${Math.max(1, options.blur * scale)}px)`;
    ctx.drawImage(source, 0, 0, width, height);
    ctx.restore();
  }
}
