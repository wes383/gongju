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

export const FAVICON_SIZES = [16, 32, 48, 180, 192, 512];

/** Sizes that go into a multi-resolution favicon.ico */
export const ICO_SIZES = [16, 32, 48];

/** Maskable artwork only fills 80% of the canvas, so the rest can be cropped */
export const MASKABLE_INSET = 0.6;

export type FaviconKind = "ico" | "png" | "svg" | "maskable" | "manifest";

export interface FaviconTarget {
  id: string;
  /** File name written into the zip and used for single downloads */
  name: string;
  kind: FaviconKind;
  /** Edge length in pixels, only for raster targets */
  size?: number;
  /** Fill an opaque backdrop first — iOS and Android do not like transparency */
  background?: boolean;
  purpose: { zh: string; en: string };
}

export const FAVICON_TARGETS: FaviconTarget[] = [
  {
    id: "ico",
    name: "favicon.ico",
    kind: "ico",
    purpose: { zh: "浏览器标签页、旧版兼容", en: "Browser tabs, legacy support" },
  },
  {
    id: "svg",
    name: "favicon.svg",
    kind: "svg",
    purpose: { zh: "现代浏览器，可缩放", en: "Modern browsers, scalable" },
  },
  {
    id: "16",
    name: "favicon-16x16.png",
    kind: "png",
    size: 16,
    purpose: { zh: "浏览器标签页", en: "Browser tab" },
  },
  {
    id: "32",
    name: "favicon-32x32.png",
    kind: "png",
    size: 32,
    purpose: { zh: "标签页、高分屏", en: "Tab, high-DPI" },
  },
  {
    id: "48",
    name: "favicon-48x48.png",
    kind: "png",
    size: 48,
    purpose: { zh: "搜索结果、高分辨率", en: "Search results, high-res" },
  },
  {
    id: "apple",
    name: "apple-touch-icon.png",
    kind: "png",
    size: 180,
    background: true,
    purpose: { zh: "iOS 添加到主屏幕", en: "iOS home screen" },
  },
  {
    id: "192",
    name: "android-chrome-192x192.png",
    kind: "png",
    size: 192,
    purpose: { zh: "Android / PWA", en: "Android / PWA" },
  },
  {
    id: "512",
    name: "android-chrome-512x512.png",
    kind: "png",
    size: 512,
    purpose: { zh: "PWA 安装图标", en: "PWA install icon" },
  },
  {
    id: "manifest",
    name: "site.webmanifest",
    kind: "manifest",
    purpose: { zh: "PWA 图标声明", en: "PWA icon manifest" },
  },
];

export const FAVICON_OPTIONAL_TARGETS: FaviconTarget[] = [
  {
    id: "safari-pinned-tab",
    name: "safari-pinned-tab.svg",
    kind: "svg",
    purpose: { zh: "Safari 固定标签页", en: "Safari pinned tab" },
  },
  {
    id: "maskable-192",
    name: "icon-192-maskable.png",
    kind: "maskable",
    size: 192,
    background: true,
    purpose: { zh: "Android 自适应图标", en: "Android adaptive icon" },
  },
  {
    id: "maskable-512",
    name: "icon-512-maskable.png",
    kind: "maskable",
    size: 512,
    background: true,
    purpose: { zh: "PWA 自适应图标", en: "PWA adaptive icon" },
  },
];

/** Draw the bitmap onto a square canvas and export PNG bytes */
export async function renderFaviconPng(
  source: ImageBitmap,
  size: number,
  options: { background?: string; scale?: number } = {}
): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvasUnavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, size, size);
  }

  // Preserve the aspect ratio, centring the artwork. `scale` shrinks it so a
  // maskable icon keeps its subject inside the crop-safe zone.
  const box = Math.round(size * (options.scale ?? 1));
  const scale = Math.min(box / source.width, box / source.height);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  ctx.drawImage(
    source,
    Math.round((size - width) / 2),
    Math.round((size - height) / 2),
    width,
    height
  );

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
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  ].join("\n");
}

/** Web app manifest wiring the two Android icons plus their maskable variants */
export function faviconManifest(themeColor = "#ffffff"): string {
  return JSON.stringify(
    {
      name: "",
      short_name: "",
      icons: [
        { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
        {
          src: "/icon-192-maskable.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icon-512-maskable.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
      theme_color: themeColor,
      background_color: themeColor,
      display: "standalone",
    },
    null,
    2
  );
}

