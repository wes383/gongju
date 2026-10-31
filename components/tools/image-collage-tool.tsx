"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDrop, ImagePreview, useImageFiles } from "@/components/tools/image-drop";
import { OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import { cn } from "@/lib/utils";
import {
  canvasToBlob,
  createCanvas,
  decodeFile,
  downloadBlob,
  formatBytes,
} from "@/lib/image";

const COPY = {
  zh: {
    direction: "方向",
    vertical: "纵向",
    horizontal: "横向",
    gap: "间距",
    background: "背景",
    width: "总宽",
    height: "总高",
    align: "对齐",
    scaleMode: "缩放",
    scaleFill: "铺满",
    scaleFit: "不放大",
    alignLeft: "靠左",
    alignRight: "靠右",
    alignTop: "靠上",
    alignBottom: "靠下",
    center: "居中",
    preview: "预览",
    download: "下载长图",
    empty: "添加两张以上图片后开始拼接",
    note: "「铺满」把所有图缩放到统一宽度（横向时为高度）；「不放大」保留小图的原始尺寸，空出的部分按对齐方式摆放并用背景色填充。",
    tooMany: "最多拼接 30 张",
  },
  en: {
    direction: "Direction",
    vertical: "Vertical",
    horizontal: "Horizontal",
    gap: "Gap",
    background: "Background",
    width: "Width",
    height: "Height",
    align: "Align",
    scaleMode: "Scale",
    scaleFill: "Fill",
    scaleFit: "No upscale",
    alignLeft: "Left",
    alignRight: "Right",
    alignTop: "Top",
    alignBottom: "Bottom",
    center: "Center",
    preview: "Preview",
    download: "Download",
    empty: "Add at least two images to stitch them",
    note: "Fill scales every image to the shared width (height when horizontal). No upscale keeps small images at their own size and places them using the alignment, with the background colour filling the gap.",
    tooMany: "Up to 30 images",
  },
};

export function ImageCollageTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles({ multiple: true, limit: 30 });

  const [direction, setDirection] = React.useState<"vertical" | "horizontal">("vertical");
  const [gap, setGap] = React.useState(0);
  const [background, setBackground] = React.useState("#ffffff");
  const [customSize, setCustomSize] = React.useState(0);
  const [align, setAlign] = React.useState<"start" | "center" | "end">("center");
  const [scaleMode, setScaleMode] = React.useState<"fill" | "fit">("fill");
  const [preview, setPreview] = React.useState<{ url: string; blob: Blob; width: number; height: number } | null>(null);
  const [working, setWorking] = React.useState(false);

  // The shared edge follows the largest source until the user overrides it
  const autoSize = React.useMemo(() => {
    if (images.length === 0) return 0;
    return direction === "vertical"
      ? Math.max(...images.map((i) => i.width))
      : Math.max(...images.map((i) => i.height));
  }, [direction, images]);
  const size = customSize || autoSize;

  React.useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    const timer = window.setTimeout(async () => {
      if (images.length < 2 || size < 1) {
        setPreview(null);
        return;
      }
      setWorking(true);
      try {
        const decoded = await Promise.all(images.map((item) => decodeFile(item.file)));
        // fill: every image takes the target edge. fit: small images keep their
        // own size, which is what makes the alignment control meaningful.
        const scaled = decoded.map((img) => {
          if (direction === "vertical") {
            const w = scaleMode === "fit" ? Math.min(size, img.naturalWidth) : size;
            return { w, h: Math.max(1, Math.round((img.naturalHeight * w) / img.naturalWidth)) };
          }
          const h = scaleMode === "fit" ? Math.min(size, img.naturalHeight) : size;
          return { w: Math.max(1, Math.round((img.naturalWidth * h) / img.naturalHeight)), h };
        });

        const totalWidth =
          direction === "vertical" ? size : scaled.reduce((sum, s) => sum + s.w, 0) + gap * (scaled.length - 1);
        const totalHeight =
          direction === "vertical" ? scaled.reduce((sum, s) => sum + s.h, 0) + gap * (scaled.length - 1) : size;

        const canvas = createCanvas(totalWidth, totalHeight);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingQuality = "high";

        let offset = 0;
        decoded.forEach((img, i) => {
          const box = scaled[i];
          const x =
            direction === "vertical"
              ? align === "start"
                ? 0
                : align === "end"
                  ? size - box.w
                  : (size - box.w) / 2
              : offset;
          const y =
            direction === "horizontal"
              ? align === "start"
                ? 0
                : align === "end"
                  ? size - box.h
                  : (size - box.h) / 2
              : offset;
          ctx.drawImage(img, x, y, box.w, box.h);
          offset += (direction === "vertical" ? box.h : box.w) + gap;
        });

        const blob = await canvasToBlob(canvas, "image/png");
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setPreview({ url: created, blob, width: canvas.width, height: canvas.height });
      } finally {
        if (!cancelled) setWorking(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (created) URL.revokeObjectURL(created);
    };
  }, [images, direction, gap, background, size, align, scaleMode]);

  return (
    <div className="flex flex-col gap-4">
      <ImageDrop
        images={images}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        error={error}
        loading={loading}
        multiple
      />

      {images.length > 0 && (
        <>
          <OptionBar>
            <Segmented
              ariaLabel={t.direction}
              value={direction}
              onChange={(next) => {
                setDirection(next);
                setCustomSize(0);
              }}
              options={[
                { value: "vertical", label: t.vertical },
                { value: "horizontal", label: t.horizontal },
              ]}
            />

            <OptionField label={direction === "vertical" ? t.width : t.height}>
              <Input
                type="number"
                min={16}
                max={20000}
                value={size}
                onChange={(e) => setCustomSize(Math.min(Math.max(Number(e.target.value) || 16, 16), 20000))}
                aria-label={direction === "vertical" ? t.width : t.height}
                size="xs"
                className="w-20 text-center font-mono"
              />
            </OptionField>

            <OptionField label={t.gap}>
              <input
                type="range"
                min={0}
                max={80}
                step={2}
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
                aria-label={t.gap}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-8 font-mono text-[11px] text-foreground-subtle">{gap}px</span>
            </OptionField>

            <OptionField label={t.background}>
              <Input
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                aria-label={t.background}
                size="xs"
                className="h-8 w-10 cursor-pointer p-1"
              />
            </OptionField>

            <OptionField label={t.scaleMode}>
              <Segmented
                ariaLabel={t.scaleMode}
                value={scaleMode}
                onChange={setScaleMode}
                options={[
                  { value: "fill", label: t.scaleFill },
                  { value: "fit", label: t.scaleFit },
                ]}
              />
            </OptionField>

            <OptionField label={t.align}>
              <Segmented
                ariaLabel={t.align}
                value={align}
                onChange={setAlign}
                className={cn(scaleMode === "fill" && "pointer-events-none opacity-40")}
                options={[
                  {
                    value: "start",
                    label: direction === "vertical" ? t.alignLeft : t.alignTop,
                  },
                  { value: "center", label: t.center },
                  {
                    value: "end",
                    label: direction === "vertical" ? t.alignRight : t.alignBottom,
                  },
                ]}
              />
            </OptionField>

            <Button
              type="button"
              size="xs"
              className="ml-auto gap-1.5"
              disabled={!preview}
              onClick={() => preview && downloadBlob(preview.blob, `collage-${preview.width}x${preview.height}.png`)}
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
                <ImagePreview src={preview.url} alt={t.preview} height="h-[480px]" />
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
