/**
 * pdf.js wrapper for rasterising pages.
 *
 * Kept apart from `lib/pdf.ts` so the ~1 MB pdf.js bundle is only pulled in by
 * the two tools that actually need to draw pages.
 */

import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsModule: Promise<PdfjsModule> | null = null;

function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsModule) {
    pdfjsModule = import("pdfjs-dist").then((mod) => {
      if (!mod.GlobalWorkerOptions.workerPort && !mod.GlobalWorkerOptions.workerSrc) {
        try {
          mod.GlobalWorkerOptions.workerPort = new Worker(
            new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
            { type: "module" }
          );
        } catch {
          // Without a worker pdf.js falls back to parsing on the main thread
        }
      }
      return mod;
    });
  }
  return pdfjsModule;
}

export interface RenderablePdf {
  doc: PDFDocumentProxy;
  /** Releases the document and its worker; call it when the file changes */
  destroy: () => Promise<void>;
}

/** Open a PDF for rendering. Pass a copy: pdf.js transfers the buffer to its worker. */
export async function openForRender(bytes: Uint8Array): Promise<RenderablePdf> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({ data: bytes.slice() });
  const doc = await task.promise;
  return { doc, destroy: () => task.destroy() };
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Draw one page onto a canvas.
 *
 * `scale` is relative to the 72 DPI base size, so 2 renders at 144 DPI.
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number
): Promise<RenderedPage> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvas, viewport }).promise;
  page.cleanup();
  return { canvas, width: canvas.width, height: canvas.height };
}
