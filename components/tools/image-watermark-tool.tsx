"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageDrop, ImagePreview, useImageFiles } from "@/components/tools/image-drop";
import { OptionBar, OptionField, Toggle } from "@/components/tools/tool-ui";
import {
  ANCHORS,
  baseName,
  canvasToBlob,
  decodeFile,
  downloadBlob,
  formatBytes,
  renderImage,
  type Anchor,
} from "@/lib/image";
import { cn } from "@/lib/utils";

export type FontKey = "sans" | "serif" | "kai" | "mono";

/**
 * Each option is a cross-platform stack: the first name that exists on the
 * user's system wins, so 宋体 picks Songti SC on macOS and SimSun on Windows.
 */
const FONTS: Record<FontKey, { stack: string; weight: number }> = {
  sans: {
    stack: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    weight: 600,
  },
  serif: {
    stack: '"Songti SC", SimSun, "Noto Serif SC", "Source Han Serif SC", serif',
    weight: 500,
  },
  kai: {
    stack: '"Kaiti SC", KaiTi, STKaiti, "Kaiti TC", serif',
    weight: 400,
  },
  mono: {
    stack: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    weight: 600,
  },
};

const WEIGHTS = [400, 500, 600, 700] as const;

const COPY = {
  zh: {
    text: "水印文字",
    placeholder: "© 你的名字",
    size: "字号",
    color: "颜色",
    opacity: "不透明度",
    font: "字体",
    weight: "字重",
    weights: { 400: "常规", 500: "中等", 600: "加粗", 700: "特粗" },
    gap: "间距",
    fonts: { sans: "黑体", serif: "宋体", kai: "楷体", mono: "等宽" },
    position: "位置",
    margin: "边距",
    rotate: "旋转",
    tile: "平铺",
    download: "下载",
    preview: "预览",
    empty: "输入水印文字后显示预览",
    note: "字号按图片宽度的百分比计算，同一套设置在小图和大图上看起来比例一致。",
  },
  en: {
    text: "Watermark text",
    placeholder: "© Your name",
    size: "Size",
    color: "Color",
    opacity: "Opacity",
    font: "Font",
    weight: "Weight",
    weights: { 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold" },
    gap: "Gap",
    fonts: { sans: "Sans", serif: "Serif", kai: "Kai", mono: "Mono" },
    position: "Position",
    margin: "Margin",
    rotate: "Rotate",
    tile: "Tile",
    download: "Download",
    preview: "Preview",
    empty: "Type some text to see the preview",
    note: "Font size is a percentage of the image width, so one setting looks the same on small and large images.",
  },
};

export function ImageWatermarkTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const [text, setText] = React.useState("© Your Name");
  const [size, setSize] = React.useState(5);
  const [color, setColor] = React.useState("#ffffff");
  const [opacity, setOpacity] = React.useState(70);
  const [font, setFont] = React.useState<FontKey>("sans");
  const [weight, setWeight] = React.useState(600);
  const [anchor, setAnchor] = React.useState<Anchor>("bottom-right");
  const [margin, setMargin] = React.useState(4);
  const [rotate, setRotate] = React.useState(0);
  const [tile, setTile] = React.useState(false);

  const [preview, setPreview] = React.useState<{ url: string; blob: Blob; width: number; height: number } | null>(null);
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    const timer = window.setTimeout(async () => {
      if (!image || !text.trim()) {
        setPreview(null);
        return;
      }
      setWorking(true);
      try {
        const img = await decodeFile(image.file);
        const canvas = renderImage(img, {
          width: img.naturalWidth,
          height: img.naturalHeight,
          fit: "stretch",
        });
        drawWatermark(canvas, {
          text: text.trim(),
          sizePercent: size,
          color,
          opacity: opacity / 100,
          anchor,
          marginPercent: margin,
          rotate,
          tile,
          font,
          weight,
        });
        const blob = await canvasToBlob(canvas, "image/png");
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setPreview({ url: created, blob, width: canvas.width, height: canvas.height });
      } finally {
        if (!cancelled) setWorking(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (created) URL.revokeObjectURL(created);
    };
  }, [image, text, size, color, opacity, anchor, margin, rotate, tile, font, weight]);

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
          <OptionBar>
            <OptionField label={t.text}>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.placeholder}
                aria-label={t.text}
                size="xs"
                className="w-52"
              />
            </OptionField>

            <OptionField label={t.size}>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                aria-label={t.size}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-8 font-mono text-[11px] text-foreground-subtle">{size}%</span>
            </OptionField>

            <OptionField label={t.color}>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label={t.color}
                size="xs"
                className="h-8 w-10 cursor-pointer p-1"
              />
            </OptionField>

            <OptionField label={t.font}>
              <Select
                value={font}
                onValueChange={(v) => {
                  setFont(v as FontKey);
                  // Start from the weight that font actually has on this system
                  setWeight(FONTS[v as FontKey].weight);
                }}
              >
                <SelectTrigger size="xs" aria-label={t.font} className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FONTS) as FontKey[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {t.fonts[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            <OptionField label={t.weight}>
              <Select value={String(weight)} onValueChange={(v) => setWeight(Number(v))}>
                <SelectTrigger size="xs" aria-label={t.weight} className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEIGHTS.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      {t.weights[w]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            <OptionField label={t.opacity}>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                aria-label={t.opacity}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-8 font-mono text-[11px] text-foreground-subtle">{opacity}%</span>
            </OptionField>
          </OptionBar>

          <OptionBar>
            <span className="text-xs font-medium text-foreground-muted">{t.position}</span>
            <div className={cn("grid grid-cols-3 gap-1", tile && "pointer-events-none opacity-40")}>
              {ANCHORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAnchor(option)}
                  aria-label={option}
                  aria-pressed={anchor === option}
                  className={cn(
                    "h-5 w-5 rounded-[4px] border transition-colors duration-base ease-out",
                    anchor === option
                      ? "border-accent bg-accent"
                      : "border-border-strong hover:bg-hover-bg-strong"
                  )}
                />
              ))}
            </div>

            <OptionField label={tile ? t.gap : t.margin}>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                aria-label={tile ? t.gap : t.margin}
                className="w-20 accent-[var(--accent)]"
              />
              <span className="w-8 font-mono text-[11px] text-foreground-subtle">{margin}%</span>
            </OptionField>

            <OptionField label={t.rotate}>
              <input
                type="range"
                min={-90}
                max={90}
                step={5}
                value={rotate}
                onChange={(e) => setRotate(Number(e.target.value))}
                aria-label={t.rotate}
                className="w-20 accent-[var(--accent)]"
              />
              <span className="w-8 font-mono text-[11px] text-foreground-subtle">{rotate}°</span>
            </OptionField>

            <Toggle checked={tile} onChange={setTile} label={t.tile} />

            <Button
              type="button"
              size="xs"
              className="ml-auto gap-1.5"
              disabled={!preview}
              onClick={() =>
                preview &&
                downloadBlob(preview.blob, `${baseName(image.name)}-watermark.png`)
              }
            >
              <Download className="h-3.5 w-3.5" />
              {t.download}
            </Button>
          </OptionBar>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-10 items-center gap-2 border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.preview}
              </span>
              <span className="text-[11px] text-foreground-subtle">
                {preview ? `${preview.width}×${preview.height} · ${formatBytes(preview.blob.size)}` : ""}
              </span>
              {working && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-foreground-subtle" />}
            </header>
            <div className="p-3">
              {preview ? (
                <ImagePreview src={preview.url} alt={t.preview} />
              ) : (
                <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
              )}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}

function drawWatermark(
  canvas: HTMLCanvasElement,
  opts: {
    text: string;
    sizePercent: number;
    color: string;
    opacity: number;
    anchor: Anchor;
    marginPercent: number;
    rotate: number;
    tile: boolean;
    font: FontKey;
    weight: number;
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const fontSize = Math.max(8, Math.round((width * opts.sizePercent) / 100));
  ctx.font = `${opts.weight} ${fontSize}px ${FONTS[opts.font].stack}`;
  ctx.fillStyle = opts.color;
  ctx.globalAlpha = opts.opacity;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  const textWidth = ctx.measureText(opts.text).width;
  const margin = Math.round((width * opts.marginPercent) / 100);
  const angle = (opts.rotate * Math.PI) / 180;

  if (opts.tile) {
    // Margin doubles as the gap between repeats; rotation is honoured as-is
    const stepX = textWidth + fontSize * 2 + margin;
    const stepY = fontSize * 3 + margin;
    for (let y = 0; y < height + stepY; y += stepY) {
      for (let x = -textWidth; x < width + textWidth; x += stepX) {
        ctx.save();
        ctx.translate(x + textWidth / 2, y);
        ctx.rotate(angle);
        ctx.fillText(opts.text, -textWidth / 2, 0);
        ctx.restore();
      }
    }
    return;
  }

  const [vertical, horizontal] = opts.anchor.split("-");
  const fx = horizontal === "left" ? 0 : horizontal === "right" ? 1 : 0.5;
  const fy = vertical === "top" ? 0 : vertical === "bottom" ? 1 : 0.5;
  const x = margin + (width - margin * 2 - textWidth) * fx;
  const y = margin + (height - margin * 2 - fontSize) * fy + fontSize / 2;

  ctx.save();
  // Rotate around the text centre so the anchor still points where expected
  ctx.translate(x + textWidth / 2, y);
  ctx.rotate(angle);
  ctx.fillText(opts.text, -textWidth / 2, 0);
  ctx.restore();
}

