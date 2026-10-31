import QRCode from "qrcode";

export type QrLevel = "L" | "M" | "Q" | "H";

export interface QrOptions {
  /** Output width in px (the QR is square) */
  size: number;
  /** Quiet zone in modules */
  margin: number;
  dark: string;
  light: string;
  level: QrLevel;
}

export const DEFAULT_QR: QrOptions = {
  size: 320,
  margin: 2,
  dark: "#000000",
  light: "#ffffff",
  level: "M",
};

/** Escape the characters that would break the WIFI: payload. */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifi(input: {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}): string {
  const parts = [`T:${input.encryption}`, `S:${escapeWifi(input.ssid)}`];
  if (input.encryption !== "nopass") parts.push(`P:${escapeWifi(input.password)}`);
  parts.push(`H:${input.hidden ? "true" : "false"}`);
  return `WIFI:${parts.join(";")};;`;
}

export function buildVCard(input: {
  name: string;
  org: string;
  phone: string;
  email: string;
  url: string;
}): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  if (input.name) lines.push(`FN:${input.name}`);
  if (input.org) lines.push(`ORG:${input.org}`);
  if (input.phone) lines.push(`TEL;TYPE=CELL:${input.phone}`);
  if (input.email) lines.push(`EMAIL:${input.email}`);
  if (input.url) lines.push(`URL:${input.url}`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

/**
 * Render a QR code to a canvas. `logo` is drawn in the middle on a plate of
 * the background colour, which keeps the modules underneath readable.
 */
export async function renderQr(
  text: string,
  opts: QrOptions,
  logo?: HTMLImageElement | null
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, text, {
    width: opts.size,
    margin: opts.margin,
    errorCorrectionLevel: opts.level,
    color: { dark: opts.dark, light: opts.light },
  });

  if (logo && logo.complete && logo.naturalWidth > 0) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const size = canvas.width;
      const logoSize = Math.round(size * 0.2);
      const pad = Math.round(size * 0.012);
      const x = (size - logoSize) / 2;
      const y = (size - logoSize) / 2;
      ctx.fillStyle = opts.light;
      ctx.beginPath();
      ctx.roundRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2, pad * 1.5);
      ctx.fill();
      ctx.drawImage(logo, x, y, logoSize, logoSize);
    }
  }

  return canvas;
}

export function qrSvg(text: string, opts: QrOptions): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: opts.margin,
    errorCorrectionLevel: opts.level,
    color: { dark: opts.dark, light: opts.light },
  });
}

export interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Decode a QR code from an image, video frame or canvas.
 * Pass `crop` to decode a zoomed-in region, which helps when the code is small.
 */
export async function decodeQrFromImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  crop?: SourceRect
) {
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  if (crop) ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
  else ctx.drawImage(source, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
}
