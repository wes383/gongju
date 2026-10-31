/**
 * pdf-lib wrapper used by the PDF tools: loading, rebuilding and saving.
 *
 * Everything runs in the browser, files never leave the device.
 */

import { PDFDocument, type PDFPage } from "pdf-lib";
import { codedError, isCodedError } from "@/lib/errors";

export interface OpenedPdf {
  name: string;
  size: number;
  pageCount: number;
  doc: PDFDocument;
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

/** Parse PDF bytes, mapping pdf-lib's failures onto user-facing error codes. */
export async function openPdfBytes(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    if (doc.getPageCount() === 0) throw codedError("pdf.empty");
    return doc;
  } catch (error) {
    if (isCodedError(error)) throw error;
    // pdf-lib reports password-protected files as an encrypted PDF
    if (error instanceof Error && /encrypt/i.test(error.message)) {
      throw codedError("pdf.encrypted");
    }
    throw codedError("pdf.invalid");
  }
}

export async function openPdfFile(file: File): Promise<OpenedPdf> {
  if (!isPdfFile(file)) throw codedError("pdf.notPdf");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await openPdfBytes(bytes);
  return { doc, name: file.name, size: file.size, pageCount: doc.getPageCount() };
}

export async function savePdf(doc: PDFDocument): Promise<Blob> {
  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/**
 * Build a new document from selected pages of an existing one.
 *
 * pdf-lib has no page removal, so anything that deletes or reorders pages goes
 * through `copyPages`. AcroForm fields and bookmarks are not carried over.
 */
export async function rebuildPdf(
  source: PDFDocument,
  indices: number[],
  prepare?: (page: PDFPage, sourceIndex: number) => void | Promise<void>
): Promise<PDFDocument> {
  const out = await PDFDocument.create();
  const pages = await out.copyPages(source, indices);
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    out.addPage(page);
    if (prepare) await prepare(page, indices[i]);
  }
  return out;
}

/** Render text onto a transparent canvas so any script (CJK included) can be stamped. */
export async function textStampImage(
  text: string,
  { fontSize, color, weight = 600 }: { fontSize: number; color: string; weight?: number }
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const supersample = 2;
  const padding = Math.ceil(fontSize * 0.25);
  const font = `${weight} ${fontSize * supersample}px ui-sans-serif, system-ui, sans-serif`;

  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) throw codedError("pdf.canvasUnavailable");
  probe.font = font;
  const metrics = probe.measureText(text);
  const width = Math.ceil(metrics.width) + padding * 2;
  const height = Math.ceil(fontSize * supersample * 1.35) + padding * 2;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw codedError("pdf.canvasUnavailable");
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw codedError("image.encodeFailed");

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: width / supersample,
    height: height / supersample,
  };
}
