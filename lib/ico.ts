/**
 * Minimal ICO writer: modern browsers and Windows Vista+ accept PNG payloads
 * inside the container, so no BMP encoding is needed.
 */

export interface IcoImage {
  /** Square edge length in pixels; 256 is stored as 0 in the directory */
  size: number;
  png: Uint8Array;
}

const HEADER_SIZE = 6;
const ENTRY_SIZE = 16;

export function buildIco(images: IcoImage[]): Uint8Array {
  if (images.length === 0) throw new Error("ico.empty");
  if (images.length > 255) throw new Error("ico.tooMany");

  let offset = HEADER_SIZE + ENTRY_SIZE * images.length;
  const total = offset + images.reduce((sum, image) => sum + image.png.byteLength, 0);
  const buffer = new Uint8Array(total);
  const view = new DataView(buffer.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // 1 = icon
  view.setUint16(4, images.length, true);

  images.forEach((image, index) => {
    const entry = HEADER_SIZE + ENTRY_SIZE * index;
    const edge = image.size >= 256 ? 0 : image.size;

    buffer[entry] = edge; // width
    buffer[entry + 1] = edge; // height
    buffer[entry + 2] = 0; // palette colours
    buffer[entry + 3] = 0; // reserved
    view.setUint16(entry + 4, 1, true); // colour planes
    view.setUint16(entry + 6, 32, true); // bits per pixel
    view.setUint32(entry + 8, image.png.byteLength, true);
    view.setUint32(entry + 12, offset, true);

    buffer.set(image.png, offset);
    offset += image.png.byteLength;
  });

  return buffer;
}

/** Read back the directory, useful for verifying a generated icon */
export function readIcoDirectory(bytes: Uint8Array): { size: number; length: number }[] {
  if (bytes.byteLength < HEADER_SIZE) return [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(4, true);
  const entries: { size: number; length: number }[] = [];
  for (let index = 0; index < count; index++) {
    const entry = HEADER_SIZE + ENTRY_SIZE * index;
    if (entry + ENTRY_SIZE > bytes.byteLength) break;
    const edge = bytes[entry] === 0 ? 256 : bytes[entry];
    entries.push({ size: edge, length: view.getUint32(entry + 8, true) });
  }
  return entries;
}

export const FAVICON_SIZES = [16, 32, 48, 64, 128, 180, 192, 512];

/** Sizes that go into a multi-resolution favicon.ico */
export const ICO_SIZES = [16, 32, 48];

/** Draw the bitmap onto a square canvas and export PNG bytes */
export async function renderFaviconPng(
  source: ImageBitmap,
  size: number,
  background?: string
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvasUnavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }

  // Preserve the aspect ratio, centring the artwork
  const scale = Math.min(size / source.width, size / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  ctx.drawImage(source, Math.round((size - width) / 2), Math.round((size - height) / 2), width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("canvasUnavailable"));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

/** HTML snippet that points at every generated size */
export function faviconHtml(): string {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join("\n");
}
