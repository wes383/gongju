/**
 * Metadata stripping for the two formats a browser can rewrite losslessly
 * enough to be useful: raster images and PDFs.
 *
 * Images are decoded and re-encoded, which drops every ancillary chunk — EXIF,
 * GPS, XMP, thumbnails, ICC profiles. PDFs keep their pages untouched and only
 * lose the info dictionary plus the XMP metadata stream attached to the
 * catalog. Anything else is rejected rather than silently passed through.
 */

import { PDFDict, PDFName, type PDFDocument } from "pdf-lib";
import { codedError } from "./errors";
import { baseName } from "./files";
import { canvasToBlob, decodeFile, extensionFor, renderImage, type ImageFormat } from "./image";
import { openPdfBytes } from "./pdf";

export type MetadataKind = "image" | "pdf" | "unsupported";

export interface CleanResult {
  blob: Blob;
  name: string;
  kind: "image" | "pdf";
  /** Number of removed metadata entries; 1 for images, which lose the whole block */
  removed: number;
}

const IMAGE_TYPES: Record<string, ImageFormat> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

export function detectMetadataKind(file: File): MetadataKind {
  if (IMAGE_TYPES[file.type] || /\.(jpe?g|png|webp)$/i.test(file.name)) return "image";
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  return "unsupported";
}

function imageTargetType(file: File): ImageFormat {
  if (IMAGE_TYPES[file.type]) return IMAGE_TYPES[file.type];
  const ext = /\.([^.]+)$/.exec(file.name)?.[1].toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Empty the info dictionary and detach the XMP stream.
 *
 * Returns how many entries were removed, which the UI reports as a rough
 * "how much was in there" signal.
 */
export function clearPdfMetadata(doc: PDFDocument): number {
  let removed = 0;

  const infoRef = doc.context.trailerInfo.Info;
  const info = infoRef ? doc.context.lookup(infoRef) : null;
  if (info instanceof PDFDict) {
    for (const [key] of info.entries()) {
      info.delete(key);
      removed += 1;
    }
  }

  const xmp = PDFName.of("Metadata");
  if (doc.catalog.has(xmp)) {
    doc.catalog.delete(xmp);
    removed += 1;
  }

  return removed;
}

async function cleanImage(file: File): Promise<CleanResult> {
  const image = await decodeFile(file);
  const type = imageTargetType(file);
  // JPEG and WebP cannot store transparency, so flatten onto white instead of
  // letting the encoder decide (which usually turns it black)
  const background = type === "image/png" ? undefined : "#ffffff";

  const canvas = renderImage(image, {
    width: image.naturalWidth,
    height: image.naturalHeight,
    fit: "stretch",
    background,
  });
  const blob = await canvasToBlob(canvas, type, 0.92);
  canvas.width = 0;
  canvas.height = 0;

  return {
    blob,
    name: `${baseName(file.name, "image")}-clean.${extensionFor(type)}`,
    kind: "image",
    removed: 1,
  };
}

async function cleanPdf(file: File): Promise<CleanResult> {
  const doc = await openPdfBytes(new Uint8Array(await file.arrayBuffer()));
  const removed = clearPdfMetadata(doc);
  const saved = await doc.save();
  return {
    blob: new Blob([saved as BlobPart], { type: "application/pdf" }),
    name: `${baseName(file.name, "document")}-clean.pdf`,
    kind: "pdf",
    removed,
  };
}

export async function cleanFileMetadata(file: File): Promise<CleanResult> {
  const kind = detectMetadataKind(file);
  if (kind === "image") return cleanImage(file);
  if (kind === "pdf") return cleanPdf(file);
  throw codedError("meta.unsupported", file.name);
}
