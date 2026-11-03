/**
 * Rasterising PDF compression.
 *
 * Every page is rendered with pdf.js at the requested DPI and re-embedded as a
 * JPEG in a fresh pdf-lib document. That reliably shrinks scan-heavy files, but
 * the original text layer, links and form fields are gone — the UI says so.
 */

import { PDFDocument } from "pdf-lib";
import { codedError } from "./errors";
import { openForRender, renderPage } from "./pdf-render";

export interface CompressOptions {
  /** Target render resolution; 72 keeps the original point size */
  dpi: number;
  /** JPEG quality, 0.3 – 0.95 */
  quality: number;
  grayscale: boolean;
}

export const COMPRESS_PRESETS: { id: string; zh: string; en: string; dpi: number; quality: number }[] = [
  { id: "light", zh: "轻度（清晰优先）", en: "Light", dpi: 150, quality: 0.82 },
  { id: "balanced", zh: "均衡（推荐）", en: "Balanced", dpi: 120, quality: 0.7 },
  { id: "strong", zh: "强力（体积优先）", en: "Strong", dpi: 96, quality: 0.55 },
];

function toGrayscale(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const grey = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = grey;
    data[i + 1] = grey;
    data[i + 2] = grey;
  }
  ctx.putImageData(image, 0, 0);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(codedError("image.encodeFailed"));
          return;
        }
        blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      "image/jpeg",
      quality
    );
  });
}

export async function compressPdf(
  file: File,
  options: CompressOptions,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const source = await openForRender(bytes);
  const output = await PDFDocument.create();

  try {
    const total = source.doc.numPages;
    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      const page = await source.doc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      page.cleanup();

      const scale = Math.max(0.2, options.dpi / 72);
      const rendered = await renderPage(source.doc, pageNumber, scale);
      if (options.grayscale) toGrayscale(rendered.canvas);

      const jpeg = await canvasToJpeg(rendered.canvas, options.quality);
      const embedded = await output.embedJpg(jpeg);
      const outPage = output.addPage([base.width, base.height]);
      outPage.drawImage(embedded, { x: 0, y: 0, width: base.width, height: base.height });

      rendered.canvas.width = 0;
      rendered.canvas.height = 0;
      onProgress?.(pageNumber, total);
    }

    const saved = await output.save();
    return new Blob([saved as BlobPart], { type: "application/pdf" });
  } finally {
    await source.destroy();
  }
}
