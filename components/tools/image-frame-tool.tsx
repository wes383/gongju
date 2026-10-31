"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDrop, ImagePreview, useImageFiles } from "@/components/tools/image-drop";
import { OptionBar, OptionField, Toggle } from "@/components/tools/tool-ui";
import {
  baseName,
  canvasToBlob,
  createCanvas,
  decodeFile,
  downloadBlob,
  formatBytes,
} from "@/lib/image";

const COPY = {
  zh: {
    radius: "圆角",
    border: "边框",
    borderUnit: "px",
    shadowSize: "阴影大小",
    padding: "留白",
    color: "颜色",
    background: "背景",
    shadow: "阴影",
    transparent: "透明背景",
    preview: "预览",
    download: "下载 PNG",
    empty: "选择图片后显示预览",
    circle: "圆形",
    note: "圆角和留白按图片短边的百分比计算，换分辨率后比例不变。透明背景与阴影互斥。",
  },
  en: {
    radius: "Radius",
    border: "Border",
    borderUnit: "px",
    shadowSize: "Shadow size",
    padding: "Padding",
    color: "Colour",
    background: "Background",
    shadow: "Shadow",
    transparent: "Transparent",
    preview: "Preview",
    download: "Download PNG",
    empty: "Pick an image to see the preview",
    circle: "Circle",
    note: "Radius and padding are percentages of the shorter edge, so the look survives a change of resolution. Transparency and shadow are mutually exclusive.",
  },
};

export function ImageFrameTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const [radius, setRadius] = React.useState(6);
  const [border, setBorder] = React.useState(0);
  const [shadowSize, setShadowSize] = React.useState(3);
  const [padding, setPadding] = React.useState(0);
  const [color, setColor] = React.useState("#111111");
  const [background, setBackground] = React.useState("#ffffff");
  const [shadow, setShadow] = React.useState(false);
  const [transparent, setTransparent] = React.useState(false);

  const [preview, setPreview] = React.useState<{ url: string; blob: Blob; width: number; height: number } | null>(null);
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    const timer = window.setTimeout(async () => {
      if (!image) {
        setPreview(null);
        return;
      }
      setWorking(true);
      try {
        const img = await decodeFile(image.file);
        const short = Math.min(img.naturalWidth, img.naturalHeight);
        const pad = Math.round((short * padding) / 100);
        const radiusPx = (short * radius) / 100;
        const borderPx = border;

        const canvas = createCanvas(img.naturalWidth + pad * 2, img.naturalHeight + pad * 2);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (!transparent) {
          ctx.fillStyle = background;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.save();
        if (shadow && !transparent) {
          const blur = (short * shadowSize) / 100;
          ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
          ctx.shadowBlur = blur;
          ctx.shadowOffsetY = blur * 0.4;
        }
        ctx.beginPath();
        ctx.roundRect(pad, pad, img.naturalWidth, img.naturalHeight, radiusPx);
        ctx.fillStyle = transparent ? "#ffffff" : background;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pad, pad, img.naturalWidth, img.naturalHeight, radiusPx);
        ctx.clip();
        ctx.drawImage(img, pad, pad);
        ctx.restore();

        if (borderPx > 0) {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = borderPx;
          ctx.beginPath();
          // Stroke sits inside the rounded rect so the canvas does not clip it
          ctx.roundRect(
            pad + borderPx / 2,
            pad + borderPx / 2,
            img.naturalWidth - borderPx,
            img.naturalHeight - borderPx,
            Math.max(0, radiusPx - borderPx / 2)
          );
          ctx.stroke();
          ctx.restore();
        }

        const blob = await canvasToBlob(canvas, "image/png");
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setPreview({ url: created, blob, width: canvas.width, height: canvas.height });
      } finally {
        if (!cancelled) setWorking(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (created) URL.revokeObjectURL(created);
    };
  }, [image, radius, border, padding, color, background, shadow, shadowSize, transparent]);

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
            <OptionField label={t.radius}>
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                aria-label={t.radius}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-9 font-mono text-[11px] text-foreground-subtle">{radius}%</span>
              <Button
                type="button"
                variant={radius === 50 ? "default" : "outline"}
                size="xs"
                onClick={() => setRadius(50)}
              >
                {t.circle}
              </Button>
            </OptionField>

            <OptionField label={t.border}>
              <input
                type="range"
                min={0}
                max={60}
                step={1}
                value={border}
                onChange={(e) => setBorder(Number(e.target.value))}
                aria-label={t.border}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-9 font-mono text-[11px] text-foreground-subtle">{border}px</span>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label={t.color}
                size="xs"
                className="h-8 w-10 cursor-pointer p-1"
              />
            </OptionField>

            <OptionField label={t.padding}>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
                aria-label={t.padding}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-9 font-mono text-[11px] text-foreground-subtle">{padding}%</span>
              <Input
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                aria-label={t.background}
                size="xs"
                className="h-8 w-10 cursor-pointer p-1"
              />
            </OptionField>
          </OptionBar>

          <OptionBar>
            <Toggle
              checked={transparent}
              onChange={(on) => {
                setTransparent(on);
                // A shadow needs an opaque surface to fall on
                if (on) setShadow(false);
              }}
              label={t.transparent}
            />
            <Toggle
              checked={shadow}
              onChange={(on) => {
                setShadow(on);
                if (on) setTransparent(false);
              }}
              label={t.shadow}
            />
            {shadow && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground-muted">{t.shadowSize}</span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={shadowSize}
                  onChange={(e) => setShadowSize(Number(e.target.value))}
                  aria-label={t.shadowSize}
                  className="w-24 accent-[var(--accent)]"
                />
                <span className="w-9 font-mono text-[11px] text-foreground-subtle">
                  {shadowSize}%
                </span>
              </div>
            )}
            <Button
              type="button"
              size="xs"
              className="ml-auto gap-1.5"
              disabled={!preview}
              onClick={() => preview && downloadBlob(preview.blob, `${baseName(image.name)}-framed.png`)}
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
