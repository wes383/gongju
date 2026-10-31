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
import { OptionBar, OptionField, Segmented, Toggle } from "@/components/tools/tool-ui";
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

export type FontKey = "sans" | "serif";

/**
 * Fonts come from the site's own webfonts, loaded only for this route.
 * Latin face first, CJK face second: Inter / Playfair have no CJK glyphs, so the
 * browser falls through to Noto Sans SC / Noto Serif SC for those glyphs.
 */
const FONTS: Record<
  FontKey,
  { latinVar: string; cjkVar: string; fallback: string; weight: number }
> = {
  sans: {
    latinVar: "--font-inter",
    cjkVar: "--font-noto-sans-sc",
    fallback:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    weight: 500,
  },
  serif: {
    latinVar: "--font-playfair",
    cjkVar: "--font-noto-serif-sc",
    fallback: '"Songti SC", SimSun, "Noto Serif SC", serif',
    weight: 400,
  },
};

const WEIGHTS = [400, 500, 700] as const;

/** Read the real family names out of the CSS variables next/font generates. */
function familyFor(el: HTMLElement | null, kind: FontKey): string {
  const spec = FONTS[kind];
  if (typeof window === "undefined" || !el) return spec.fallback;
  const css = getComputedStyle(el);
  const latin = css.getPropertyValue(spec.latinVar).trim();
  const cjk = css.getPropertyValue(spec.cjkVar).trim();
  const stack = [latin, cjk].filter(Boolean).join(", ");
  return stack ? `${stack}, ${spec.fallback}` : spec.fallback;
}

const COPY = {
  zh: {
    text: "水印文字",
    placeholder: "© 你的名字",
    size: "字号",
    color: "颜色",
    opacity: "不透明度",
    font: "字体",
    weight: "字重",
    weights: { 400: "常规", 500: "中等", 700: "加粗" },
    gap: "间距",
    fonts: { sans: "无衬线", serif: "衬线" },
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
    weights: { 400: "Regular", 500: "Medium", 700: "Bold" },
    gap: "Gap",
    fonts: { sans: "Sans", serif: "Serif" },
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
  const rootRef = React.useRef<HTMLDivElement>(null);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const [text, setText] = React.useState("© Your Name");
  const [size, setSize] = React.useState(5);
  const [color, setColor] = React.useState("#ffffff");
  const [opacity, setOpacity] = React.useState(70);
  const [font, setFont] = React.useState<FontKey>("sans");
  const [weight, setWeight] = React.useState(500);
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
        const family = familyFor(rootRef.current, font);
        // Canvas silently falls back if the face is not ready yet
        try {
          await document.fonts.load(`${weight} 16px ${family}`);
        } catch {
          /* keep the fallback stack */
        }
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
          family,
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
    <div ref={rootRef} className="flex flex-col gap-4">
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
              <Segmented
                ariaLabel={t.font}
                value={font}
                onChange={(next) => {
                  setFont(next);
                  // Adopt the weight that face is actually loaded with
                  setWeight(FONTS[next].weight);
                }}
                options={[
                  { value: "sans", label: t.fonts.sans },
                  { value: "serif", label: t.fonts.serif },
                ]}
              />
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
    family: string;
    weight: number;
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const fontSize = Math.max(8, Math.round((width * opts.sizePercent) / 100));
  ctx.font = `${opts.weight} ${fontSize}px ${opts.family}`;
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
    // Centre the grid: starting at 0 leaves a half-cut row along the top edge
    const cols = Math.ceil(width / stepX) + 1;
    const rows = Math.ceil(height / stepY) + 1;
    const startX = (width - (cols - 1) * stepX) / 2;
    const startY = (height - (rows - 1) * stepY) / 2;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        ctx.save();
        ctx.translate(startX + col * stepX, startY + row * stepY);
        ctx.rotate(angle);
        ctx.fillText(opts.text, -textWidth / 2, 0);
        ctx.restore();
      }
    }
    return;
  }

  // "left" / "right" have no dash: startsWith/endsWith handles both those and
  // the compound anchors ("top-left"), where split("-") would misread the axis.
  const fx = opts.anchor.endsWith("left") ? 0 : opts.anchor.endsWith("right") ? 1 : 0.5;
  const fy = opts.anchor.startsWith("top") ? 0 : opts.anchor.startsWith("bottom") ? 1 : 0.5;
  const x = margin + (width - margin * 2 - textWidth) * fx;
  const y = margin + (height - margin * 2 - fontSize) * fy + fontSize / 2;

  ctx.save();
  // Rotate around the text centre so the anchor still points where expected
  ctx.translate(x + textWidth / 2, y);
  ctx.rotate(angle);
  ctx.fillText(opts.text, -textWidth / 2, 0);
  ctx.restore();
}

