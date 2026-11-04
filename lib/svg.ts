/**
 * SVG helpers: a conservative optimiser (comments, metadata, whitespace,
 * long decimals, unused namespaces) plus rasterising through a canvas.
 */

export interface SvgOptimizeOptions {
  removeComments?: boolean;
  removeMetadata?: boolean;
  collapseWhitespace?: boolean;
  shortenNumbers?: boolean;
  removeDefaults?: boolean;
}

export type SvgOptimizeResult =
  | { ok: true; output: string; before: number; after: number }
  | { ok: false; message: "notSvg" | "empty" };

const DEFAULTS: Required<SvgOptimizeOptions> = {
  removeComments: true,
  removeMetadata: true,
  collapseWhitespace: true,
  shortenNumbers: true,
  removeDefaults: true,
};

function shortenDecimals(tag: string): string {
  return tag.replace(/-?\d*\.\d{3,}/g, (value) => {
    const rounded = Math.round(Number(value) * 1000) / 1000;
    return String(rounded);
  });
}

export function optimizeSvg(source: string, options: SvgOptimizeOptions = {}): SvgOptimizeResult {
  const config = { ...DEFAULTS, ...options };
  const input = source.trim();
  if (!input) return { ok: false, message: "empty" };
  if (!/<svg[\s>]/i.test(input)) return { ok: false, message: "notSvg" };

  let output = input;

  if (config.removeComments) {
    output = output.replace(/<!--[\s\S]*?-->/g, "");
  }
  if (config.removeMetadata) {
    output = output
      .replace(/<\?xml[\s\S]*?\?>/gi, "")
      .replace(/<!DOCTYPE[\s\S]*?>/gi, "");
    output = output.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
    output = output.replace(/<sodipodi:namedview[\s\S]*?\/>/gi, "");
  }

  // Work on open tags only, so text content is never touched
  output = output.replace(/<[a-zA-Z][^>]*>/g, (tag) => {
    let next = tag;
    if (config.shortenNumbers) next = shortenDecimals(next);
    if (config.removeDefaults) {
      next = next.replace(/\sversion="[^"]*"/i, "");
    }
    return next;
  });

  if (config.removeDefaults) {
    // Only drop the xlink namespace when nothing actually uses it
    const withoutDeclaration = output.replace(/\sxmlns:xlink="[^"]*"/gi, "");
    if (!/xlink:[a-zA-Z]/.test(withoutDeclaration)) {
      output = output.replace(/\sxmlns:xlink="[^"]*"/i, "");
    }
  }

  if (config.collapseWhitespace) {
    output = output
      .replace(/>\s+</g, "><")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n+/g, "");
  }

  // Drop containers that ended up empty after comment removal
  output = output.replace(/<(g|defs|style)>?\s*<\/\1>/g, "");
  output = output.trim();

  const size = (text: string) => new TextEncoder().encode(text).length;
  return {
    ok: true,
    output,
    before: size(input),
    after: size(output),
  };
}

/** Pretty print by putting each tag on its own line (best effort) */
export function formatSvg(source: string): string {
  return source
    .replace(/>\s*</g, ">\n<")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export interface SvgSize {
  width: number;
  height: number;
  /** True when the size came from the viewBox instead of width/height */
  fromViewBox: boolean;
}

/** Read the intrinsic size, falling back to the viewBox */
export function svgSize(source: string): SvgSize | null {
  const tag = /<svg[^>]*>/i.exec(source)?.[0];
  if (!tag) return null;

  const widthMatch = /\swidth="([\d.]+)(?:px)?"/i.exec(tag);
  const heightMatch = /\sheight="([\d.]+)(?:px)?"/i.exec(tag);
  if (widthMatch && heightMatch) {
    return {
      width: Number(widthMatch[1]),
      height: Number(heightMatch[1]),
      fromViewBox: false,
    };
  }

  const viewBox = /\sviewBox="([-\d.]+)[\s,]+([-\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)"/i.exec(
    tag
  );
  if (viewBox) {
    return {
      width: Number(viewBox[3]),
      height: Number(viewBox[4]),
      fromViewBox: true,
    };
  }

  return null;
}

export interface RasterizeOptions {
  width: number;
  height: number;
  /** CSS colour behind the drawing; transparent when omitted */
  background?: string;
}

/**
 * Draw an SVG string onto a canvas and return a PNG blob. The SVG must have
 * an intrinsic size or a viewBox, otherwise the browser refuses to draw it.
 */
export async function rasterizeSvg(
  source: string,
  { width, height, background }: RasterizeOptions
): Promise<Blob> {
  // Always emit exactly one XML declaration; callers may already supply one.
  const markup = `<?xml version="1.0" encoding="UTF-8"?>${source
    .trim()
    .replace(/^<\?xml[^>]*>\s*/i, "")}`;
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.decoding = "sync";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("svgLoadFailed"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvasUnavailable");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("canvasUnavailable"));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const SVG_SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" version="1.1">
  <!-- generated by a design tool -->
  <metadata>created 2026-01-01</metadata>
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect x="10.000000" y="10.000000" width="100.000000" height="100.000000" rx="18.000000" fill="url(#g1)"/>
  <circle cx="60.000000" cy="52.000000" r="17.500000" fill="#ffffff" opacity="0.850000"/>
  <rect x="42.000000" y="78.000000" width="36.000000" height="7.000000" rx="3.500000" fill="#ffffff" opacity="0.650000"/>
</svg>`;
