/**
 * True PDF redaction by rasterisation.
 *
 * Drawing black boxes with pdf-lib only hides glyphs: the text stays in the
 * content stream and can still be selected, copied or extracted. Rebuilding
 * every page as an image drops the whole object graph — text runs, annotations,
 * attachments, scripts and form fields — so nothing survives underneath the
 * black rectangles. The trade-off is a larger, image-only PDF that can no
 * longer be searched, and the UI states that plainly.
 */

import { PDFDocument } from "pdf-lib";
import { codedError } from "./errors";
import { canvasToBlob } from "./image";
import { openForRender, renderPage } from "./pdf-render";

/** Normalised to the page box: 0–1 from the top-left corner. */
export interface RedactRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfRedactOptions {
  /** Render resolution; 150 keeps small print legible */
  dpi: number;
  quality: number;
}

/** Drop accidental clicks: anything thinner than this is not a usable box. */
const MIN_SIZE = 0.004;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Build a normalised rect from two drag points, or null when it is too small. */
export function rectFromDrag(x0: number, y0: number, x1: number, y1: number): RedactRect | null {
  const left = clamp01(Math.min(x0, x1));
  const top = clamp01(Math.min(y0, y1));
  const width = clamp01(Math.max(x0, x1)) - left;
  const height = clamp01(Math.max(y0, y1)) - top;
  if (width < MIN_SIZE || height < MIN_SIZE) return null;
  return { x: left, y: top, width, height };
}

export function totalRects(pages: RedactRect[][]): number {
  return pages.reduce((sum, page) => sum + page.length, 0);
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas, "image/jpeg", quality);
  return new Uint8Array(await blob.arrayBuffer());
}

function paint(canvas: HTMLCanvasElement, rects: RedactRect[]): void {
  if (rects.length === 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw codedError("pdf.canvasUnavailable");

  ctx.fillStyle = "#000000";
  for (const rect of rects) {
    ctx.fillRect(
      Math.round(rect.x * canvas.width),
      Math.round(rect.y * canvas.height),
      Math.max(1, Math.round(rect.width * canvas.width)),
      Math.max(1, Math.round(rect.height * canvas.height))
    );
  }
}

/**
 * Rebuild the document page by page with the given boxes burned in.
 *
 * `pages[i]` holds the boxes for page `i + 1`; pages without boxes are still
 * rasterised, because the point is to leave no hidden text behind anywhere.
 */
export async function redactPdf(
  file: File,
  pages: RedactRect[][],
  options: PdfRedactOptions,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  let source;
  try {
    source = await openForRender(bytes);
  } catch (error) {
    const name = error instanceof Error ? `${error.name} ${error.message}` : "";
    throw codedError(/password/i.test(name) ? "pdf.encrypted" : "pdf.invalid");
  }

  const output = await PDFDocument.create();

  try {
    const total = source.doc.numPages;
    const scale = Math.max(0.5, Math.min(4, options.dpi / 72));

    for (let index = 0; index < total; index += 1) {
      const page = await source.doc.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      page.cleanup();

      const rendered = await renderPage(source.doc, index + 1, scale);
      paint(rendered.canvas, pages[index] ?? []);

      const jpeg = await canvasToJpeg(rendered.canvas, options.quality);
      const embedded = await output.embedJpg(jpeg);
      const outPage = output.addPage([base.width, base.height]);
      outPage.drawImage(embedded, { x: 0, y: 0, width: base.width, height: base.height });

      rendered.canvas.width = 0;
      rendered.canvas.height = 0;
      onProgress?.(index + 1, total);
    }

    output.setProducer("GongJu");
    output.setCreator("GongJu");
    const saved = await output.save();
    return new Blob([saved as BlobPart], { type: "application/pdf" });
  } finally {
    await source.destroy();
  }
}
