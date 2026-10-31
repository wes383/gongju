"use client";

import * as React from "react";
import { Download, Link2, Link2Off, Loader2 } from "lucide-react";
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
import { OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import {
  ANCHORS,
  baseName,
  canvasToBlob,
  cropRect,
  decodeFile,
  downloadBlob,
  extensionFor,
  formatBytes,
  isLossy,
  OUTPUT_FORMATS,
  renderImage,
  type Anchor,
  type ImageFormat,
} from "@/lib/image";
import { clamp, cn } from "@/lib/utils";

const COPY = {
  zh: {
    mode: "模式",
    resize: "缩放",
    crop: "裁剪",
    width: "宽",
    height: "高",
    lock: "锁定比例",
    preset: "常用尺寸",
    custom: "自定义",
    anchor: "裁剪位置",
    format: "输出格式",
    quality: "质量",
    background: "背景",
    download: "下载",
    result: "结果",
    empty: "调整尺寸后显示预览",
    cropNoop: "输出比例和原图一致，没有可裁剪的部分——改一下宽或高",
    note: "裁剪会按目标比例从原图裁掉多余部分，再缩放到指定尺寸；缩放则是整张图拉伸到目标尺寸。",
  },
  en: {
    mode: "Mode",
    resize: "Resize",
    crop: "Crop",
    width: "Width",
    height: "Height",
    lock: "Lock ratio",
    preset: "Presets",
    custom: "Custom",
    anchor: "Crop anchor",
    format: "Format",
    quality: "Quality",
    background: "Background",
    download: "Download",
    result: "Result",
    empty: "Adjust the size to see the preview",
    cropNoop: "The output ratio matches the source, so there is nothing to crop — change the width or height",
    note: "Crop keeps the target aspect ratio, cuts the overflow away and scales to the exact size; resize stretches the whole image.",
  },
};

const PRESETS: { label: string; width: number; height: number }[] = [
  { label: "1920 × 1080", width: 1920, height: 1080 },
  { label: "1280 × 720", width: 1280, height: 720 },
  { label: "1080 × 1080", width: 1080, height: 1080 },
  { label: "800 × 800", width: 800, height: 800 },
  { label: "头像 512 × 512", width: 512, height: 512 },
  { label: "一寸 295 × 413", width: 295, height: 413 },
  { label: "二寸 413 × 579", width: 413, height: 579 },
];

export function ImageResizeTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const [mode, setMode] = React.useState<"resize" | "crop">("resize");
  const [dims, setDims] = React.useState<{ id: string; width: number; height: number } | null>(null);
  const [lock, setLock] = React.useState(true);
  const [anchor, setAnchor] = React.useState<Anchor>("center");
  const [format, setFormat] = React.useState<ImageFormat>("image/png");
  const [quality, setQuality] = React.useState(90);
  const [background, setBackground] = React.useState("#ffffff");
  const [preview, setPreview] = React.useState<{ url: string; blob: Blob; width: number; height: number } | null>(null);
  const [working, setWorking] = React.useState(false);

  // The size follows the loaded image until the user edits it, so no effect is
  // needed to copy dimensions into state.
  const width = dims && image && dims.id === image.id ? dims.width : (image?.width ?? 0);
  const height = dims && image && dims.id === image.id ? dims.height : (image?.height ?? 0);
  const ratio = image ? image.width / image.height : 1;
  // Reflect the current size in the trigger: a preset name when it matches one
  // Same ratio as the source means every anchor produces the same pixels
  const cropNoop =
    mode === "crop" && image ? Math.abs(width / height - ratio) < 0.005 : false;
  const matchedPreset =
    PRESETS.find((p) => p.width === width && p.height === height)?.label ?? "";

  const applySize = (nextWidth: number, nextHeight: number) => {
    if (!image) return;
    setDims({ id: image.id, width: nextWidth, height: nextHeight });
  };

  const setWidthValue = (value: number) => {
    const next = clamp(value, 1, 20000);
    applySize(next, lock ? Math.max(1, Math.round(next / ratio)) : height);
  };

  const setHeightValue = (value: number) => {
    const next = clamp(value, 1, 20000);
    applySize(lock ? Math.max(1, Math.round(next * ratio)) : width, next);
  };

  React.useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    const timer = window.setTimeout(async () => {
      if (!image || width < 1 || height < 1) {
        setPreview(null);
        return;
      }
      setWorking(true);
      try {
        const img = await decodeFile(image.file);
        const canvas =
          mode === "crop"
            ? renderImage(img, {
                width,
                height,
                source: cropRect(img.naturalWidth, img.naturalHeight, width / height, anchor),
              })
            : renderImage(img, {
                width,
                height,
                fit: "stretch",
                background: format === "image/jpeg" ? background : undefined,
              });
        const blob = await canvasToBlob(canvas, format, quality / 100);
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
  }, [image, mode, width, height, anchor, format, quality, background]);

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
            <Segmented
              ariaLabel={t.mode}
              value={mode}
              onChange={(next) => {
                setMode(next);
                if (next === "crop") setLock(false);
              }}
              options={[
                { value: "resize", label: t.resize },
                { value: "crop", label: t.crop },
              ]}
            />

            <OptionField label={t.width}>
              <Input
                type="number"
                min={1}
                max={20000}
                value={width}
                onChange={(e) => setWidthValue(Number(e.target.value) || 1)}
                aria-label={t.width}
                size="xs"
                className="w-20 text-center font-mono"
              />
            </OptionField>
            <OptionField label={t.height}>
              <Input
                type="number"
                min={1}
                max={20000}
                value={height}
                onChange={(e) => setHeightValue(Number(e.target.value) || 1)}
                aria-label={t.height}
                size="xs"
                className="w-20 text-center font-mono"
              />
            </OptionField>

            <button
              type="button"
              onClick={() => setLock(!lock)}
              aria-pressed={lock}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors duration-base ease-out",
                lock
                  ? "border-accent bg-hover-bg text-foreground"
                  : "border-border text-foreground-subtle hover:bg-hover-bg"
              )}
            >
              {lock ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
              {t.lock}
            </button>

            <OptionField label={t.preset}>
              <Select
                value={matchedPreset}
                onValueChange={(value) => {
                  const preset = PRESETS.find((p) => p.label === value);
                  if (!preset) return;
                  if (mode === "crop") setLock(false);
                  applySize(preset.width, preset.height);
                }}
              >
                <SelectTrigger size="xs" aria-label={t.preset} className="w-36">
                  <SelectValue placeholder={t.custom} />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>
          </OptionBar>

          {mode === "crop" && (
            <OptionBar>
              <span className="text-xs font-medium text-foreground-muted">{t.anchor}</span>
              <div
                className={cn(
                  "grid grid-cols-3 gap-1",
                  cropNoop && "pointer-events-none opacity-40"
                )}
              >
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
              <span className="text-[11px] text-foreground-subtle">
                {image.width}×{image.height} → {width}×{height}
              </span>
              {cropNoop && <span className="text-[11px] text-orange-fg">{t.cropNoop}</span>}
            </OptionBar>
          )}

          <OptionBar>
            <OptionField label={t.format}>
              <Select value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
                <SelectTrigger size="xs" aria-label={t.format} className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMATS.map((f) => (
                    <SelectItem key={f.type} value={f.type}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            {isLossy(format) && (
              <OptionField label={t.quality}>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  aria-label={t.quality}
                  className="w-28 accent-[var(--accent)]"
                />
                <span className="w-8 font-mono text-[11px] text-foreground-subtle">{quality}</span>
              </OptionField>
            )}

            {format === "image/jpeg" && (
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
            )}

            <Button
              type="button"
              size="xs"
              className="ml-auto gap-1.5"
              disabled={!preview}
              onClick={() =>
                preview &&
                downloadBlob(
                  preview.blob,
                  `${baseName(image.name)}-${preview.width}x${preview.height}.${extensionFor(format)}`
                )
              }
            >
              <Download className="h-3.5 w-3.5" />
              {t.download}
            </Button>
          </OptionBar>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-10 items-center gap-2 border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.result}
              </span>
              <span className="text-[11px] text-foreground-subtle">
                {preview ? `${preview.width}×${preview.height} · ${formatBytes(preview.blob.size)}` : ""}
              </span>
              {working && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-foreground-subtle" />}
            </header>
            <div className="p-3">
              {preview ? (
                <ImagePreview src={preview.url} alt={t.result} />
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
