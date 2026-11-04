"use client";

import * as React from "react";
import { Check, Copy, Pipette, X } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { ZoomStage, ZoomToggle } from "@/components/tools/zoom-stage";
import { createCanvas, decodeFile, hexToRgbTuple } from "@/lib/image";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    pick: "悬停预览颜色，点击取色",
    picked: "取到的颜色",
    palette: "主要颜色",
    note: "取色读取的是画布上的真实像素值，缩放显示不会影响准确度；主要颜色按 4 位量化统计后取占比最高的 8 组。",
    share: "占比",
    expand: "放大预览",
    collapse: "退出放大",
  },
  en: {
    pick: "Hover to preview a colour, click to pick it",
    picked: "Picked colour",
    palette: "Dominant colours",
    note: "Sampling reads real pixels from the canvas, so the display scale does not affect accuracy. Dominant colours are the top 8 of the 4-bit quantised buckets.",
    share: "share",
    expand: "Expand preview",
    collapse: "Exit expand",
  },
};

const MAX_EDGE = 1400;
const PALETTE_SIZE = 8;

interface Swatch {
  hex: string;
  share: number;
}

/**
 * Copy chip: the icon makes it obvious the value is copyable, the label says
 * which format will land in the clipboard.
 */
function CopyFormat({
  label,
  value,
  showLabel = false,
  className,
}: {
  label: string;
  value: string;
  showLabel?: boolean;
  className?: string;
}) {
  const t = useCopy(CHIP_COPY);
  const [state, setState] = React.useState<"idle" | "done" | "failed">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1200);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={`${t.copy} ${label} · ${value}`}
      aria-label={`${t.copy} ${label}`}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded px-1.5 transition-colors duration-base ease-out",
        state === "done"
          ? "text-green-fg"
          : state === "failed"
            ? "text-red-fg"
            : "text-foreground-subtle hover:bg-hover-bg hover:text-foreground",
        className
      )}
    >
      {state === "done" ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : state === "failed" ? (
        <X className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {showLabel && <span className="font-mono text-[10px] uppercase">{label}</span>}
    </button>
  );
}

const CHIP_COPY = {
  zh: { copy: "复制" },
  en: { copy: "Copy" },
};

export function ImageColorTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [picked, setPicked] = React.useState<{ id: string; hex: string } | null>(null);
  const [expanded, setExpanded] = React.useState(false);
  const [palette, setPalette] = React.useState<{ id: string; swatches: Swatch[] } | null>(null);
  const [hover, setHover] = React.useState<{
    x: number;
    y: number;
    boxW: number;
    boxH: number;
    hex: string;
  } | null>(null);

  // Palette entries are tagged with their source image so a new file never
  // shows the previous colours while it decodes.
  const swatches = palette && image && palette.id === image.id ? palette.swatches : [];

  React.useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!image || !canvasRef.current) return;
      const img = await decodeFile(image.file);
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPalette({
        id: image.id,
        swatches: extractPalette(ctx, canvas.width, canvas.height, PALETTE_SIZE),
      });
    }, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [image]);

  const sampleAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(Math.max(Math.floor(((clientX - rect.left) / rect.width) * canvas.width), 0), canvas.width - 1);
    const y = Math.min(Math.max(Math.floor(((clientY - rect.top) / rect.height) * canvas.height), 0), canvas.height - 1);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    return {
      hex: rgbToHex(r, g, b),
      x: clientX - rect.left,
      y: clientY - rect.top,
      boxW: rect.width,
      boxH: rect.height,
    };
  };

  const handleMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const sample = sampleAt(event.clientX, event.clientY);
    if (sample)
      setHover({
        x: sample.x,
        y: sample.y,
        boxW: sample.boxW,
        boxH: sample.boxH,
        hex: sample.hex,
      });
  };

  const handlePick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const sample = sampleAt(event.clientX, event.clientY);
    if (sample && image) setPicked({ id: image.id, hex: sample.hex });
  };

  const current =
    picked && image && picked.id === image.id ? picked.hex : (swatches[0]?.hex ?? null);

  return (
    <div className="flex flex-col gap-4">
      <ImageDrop
        images={images}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        error={error}
        loading={loading}
      />

      {image && (
        <>
          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <ZoomStage
              expanded={expanded}
              onCollapse={() => setExpanded(false)}
              collapseLabel={t.collapse}
              className="overflow-hidden"
            >
              {(full) => (
                <>
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      onMouseMove={handleMove}
                      onMouseLeave={() => setHover(null)}
                      onClick={handlePick}
                      className={cn(
                        "mx-auto block max-w-full cursor-crosshair rounded",
                        full ? "max-h-[calc(100dvh-9rem)]" : "max-h-[460px]"
                      )}
                    />
                    {hover && (
                      <div
                        className="pointer-events-none absolute z-10 flex items-center gap-1.5 rounded bg-black/80 px-1.5 py-1 shadow"
                        style={{
                          left: Math.min(hover.x + 14, Math.max(hover.boxW - 96, 0)),
                          top: Math.min(hover.y + 14, Math.max(hover.boxH - 34, 0)),
                        }}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-sm border border-white/40"
                          style={{ background: hover.hex }}
                        />
                        <span className="font-mono text-[10px] text-white">
                          {hover.hex.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 flex items-center justify-center gap-2 text-center text-[11px] text-foreground-subtle">
                    <Pipette className="inline h-3 w-3" />
                    {t.pick}
                    {!full && (
                      <ZoomToggle
                        expanded={expanded}
                        onToggle={() => setExpanded((prev) => !prev)}
                        expandLabel={t.expand}
                        collapseLabel={t.collapse}
                      />
                    )}
                  </p>
                </>
              )}
            </ZoomStage>

            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex h-10 items-center border-b border-border px-3">
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                  {t.palette}
                </span>
              </header>
              <ul>
                {swatches.map((swatch) => {
                  const [r, g, b] = hexToRgbTuple(swatch.hex);
                  const [h, s, l] = rgbToHsl(r, g, b);
                  const hex = swatch.hex.toUpperCase();
                  return (
                    <li
                      key={swatch.hex}
                      className={cn(
                        "flex items-center gap-2 border-b border-border px-3 py-2 last:border-b-0",
                        current === swatch.hex && "bg-hover-bg"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => image && setPicked({ id: image.id, hex: swatch.hex })}
                        className="h-7 w-7 shrink-0 rounded border border-border"
                        style={{ background: swatch.hex }}
                        aria-label={hex}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-foreground">{hex}</p>
                        <p className="font-mono text-[10px] text-foreground-subtle">
                          {Math.round(swatch.share * 100)}%
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <CopyFormat label="HEX" value={hex} showLabel />
                        <CopyFormat label="RGB" value={`rgb(${r}, ${g}, ${b})`} showLabel />
                        <CopyFormat label="HSL" value={`hsl(${h}, ${s}%, ${l}%)`} showLabel />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {current && <ColorDetails hex={current} label={t.picked} />}

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}

function ColorDetails({ hex, label }: { hex: string; label: string }) {
  const [r, g, b] = hexToRgbTuple(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const rows = [
    { key: "HEX", value: hex.toUpperCase() },
    { key: "RGB", value: `rgb(${r}, ${g}, ${b})` },
    { key: "HSL", value: `hsl(${h}, ${s}%, ${l}%)` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-3">
      <div
        className="h-14 w-14 shrink-0 rounded-md border border-border"
        style={{ background: hex }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[11px] uppercase tracking-wide text-foreground-subtle">{label}</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase text-foreground-subtle">
                {row.key}
              </span>
              <code className="font-mono text-xs text-foreground">{row.value}</code>
              <CopyFormat label={row.key} value={row.value} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Quantise to 4 bits per channel, then average the real colours in each bucket. */
function extractPalette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number
): Swatch[] {
  const sample = createCanvas(Math.min(width, 240), Math.min(height, 240));
  const sctx = sample.getContext("2d", { willReadFrequently: true });
  if (!sctx) return [];
  sctx.drawImage(ctx.canvas, 0, 0, sample.width, sample.height);
  const { data } = sctx.getImageData(0, 0, sample.width, sample.height);

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  const total = sample.width * sample.height;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += data[i];
      bucket.g += data[i + 1];
      bucket.b += data[i + 2];
      bucket.n += 1;
    } else {
      buckets.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], n: 1 });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((bucket) => ({
      hex: rgbToHex(
        Math.round(bucket.r / bucket.n),
        Math.round(bucket.g / bucket.n),
        Math.round(bucket.b / bucket.n)
      ),
      share: bucket.n / total,
    }));
}
