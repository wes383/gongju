"use client";

import * as React from "react";
import { Pipette, RotateCcw } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { CopyButton, OptionBar, OptionField } from "@/components/tools/tool-ui";
import { createCanvas, decodeFile, hexToRgbTuple, luminance } from "@/lib/image";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    pick: "点击图片取色",
    picked: "取到的颜色",
    palette: "主要颜色",
    colors: "颜色数",
    reset: "重新取色",
    note: "取色读取的是画布上的真实像素值，缩放显示不会影响准确度；主要颜色按 4 位量化统计后取占比最高的几组。",
    empty: "选择图片后开始取色",
    share: "占比",
  },
  en: {
    pick: "Click the image to pick a colour",
    picked: "Picked colour",
    palette: "Dominant colours",
    colors: "Colours",
    reset: "Reset",
    note: "Sampling reads real pixels from the canvas, so the display scale does not affect accuracy. Dominant colours are 4-bit quantised buckets sorted by share.",
    empty: "Pick an image to start",
    share: "share",
  },
};

const MAX_EDGE = 1400;

interface Swatch {
  hex: string;
  share: number;
}

export function ImageColorTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [picked, setPicked] = React.useState<{ id: string; hex: string } | null>(null);
  const [palette, setPalette] = React.useState<{ id: string; swatches: Swatch[] } | null>(null);
  const [count, setCount] = React.useState(6);

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
      // Extract the top 12 once; the slider simply shows fewer of them
      setPalette({ id: image.id, swatches: extractPalette(ctx, canvas.width, canvas.height, 12) });
    }, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [image]);

  const handlePick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const [r, g, b] = ctx.getImageData(
      Math.min(Math.max(x, 0), canvas.width - 1),
      Math.min(Math.max(y, 0), canvas.height - 1),
      1,
      1
    ).data;
    setPicked({ id: image.id, hex: rgbToHex(r, g, b) });
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
        hint={t.pick}
      />

      {image && (
        <>
          <OptionBar>
            <OptionField label={t.colors}>
              <input
                type="range"
                min={3}
                max={12}
                step={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                aria-label={t.colors}
                className="w-28 accent-[var(--accent)]"
              />
              <span className="w-6 font-mono text-[11px] text-foreground-subtle">{count}</span>
            </OptionField>

            {current && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground-muted">{t.picked}</span>
                <span
                  className="h-6 w-6 rounded border border-border"
                  style={{ background: current }}
                  aria-hidden="true"
                />
                <code className="font-mono text-xs text-foreground">{current.toUpperCase()}</code>
                <CopyButton value={current.toUpperCase()} size="icon-xs" />
              </div>
            )}

            {picked && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setPicked(null)}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.reset}
              </Button>
            )}
          </OptionBar>

          <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
            <div className="overflow-hidden rounded-lg border border-border bg-surface p-3">
              <canvas
                ref={canvasRef}
                onClick={handlePick}
                className="mx-auto block max-h-[460px] max-w-full cursor-crosshair rounded"
              />
              <p className="mt-2 text-center text-[11px] text-foreground-subtle">
                <Pipette className="mr-1 inline h-3 w-3" />
                {t.pick}
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex h-10 items-center border-b border-border px-3">
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                  {t.palette}
                </span>
              </header>
              <ul>
                {swatches.slice(0, count).map((swatch) => {
                  const [r, g, b] = hexToRgbTuple(swatch.hex);
                  const [h, s, l] = rgbToHsl(r, g, b);
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
                        className="h-8 w-8 shrink-0 rounded border border-border"
                        style={{ background: swatch.hex }}
                        aria-label={swatch.hex}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-foreground">{swatch.hex.toUpperCase()}</p>
                        <p className="truncate font-mono text-[10px] text-foreground-subtle">
                          rgb({r}, {g}, {b}) · hsl({h}, {s}%, {l}%)
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-foreground-subtle">
                        {Math.round(swatch.share * 100)}%
                      </span>
                      <CopyButton value={swatch.hex.toUpperCase()} size="icon-xs" />
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {current && <ColorDetails hex={current} />}

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}

function ColorDetails({ hex }: { hex: string }) {
  const [r, g, b] = hexToRgbTuple(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const light = luminance(hex) > 0.5;
  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-lg border border-border px-4 py-3"
      style={{ background: hex }}
    >
      {[
        ["HEX", hex.toUpperCase()],
        ["RGB", `${r}, ${g}, ${b}`],
        ["HSL", `${h}°, ${s}%, ${l}%`],
      ].map(([label, value]) => (
        <div key={label} className={cn("flex items-center gap-2", light ? "text-black" : "text-white")}>
          <span className="font-mono text-[10px] uppercase opacity-60">{label}</span>
          <code className="font-mono text-xs">{value}</code>
        </div>
      ))}
      <CopyButton
        value={hex.toUpperCase()}
        size="xs"
        className={cn("ml-auto", light ? "text-black hover:bg-black/10" : "text-white hover:bg-white/15")}
      />
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
