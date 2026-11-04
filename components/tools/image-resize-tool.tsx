"use client";

import * as React from "react";
import { Download, Link2, Link2Off, Loader2 } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
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
import {
  ImageCropper,
  clampRect,
  fitRectToAspect,
  type CropRect,
} from "@/components/tools/image-cropper";
import { OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import { ZoomStage, ZoomToggle } from "@/components/tools/zoom-stage";
import {
  baseName,
  canvasToBlob,
  decodeFile,
  downloadBlob,
  extensionFor,
  formatBytes,
  isLossy,
  OUTPUT_FORMATS,
  renderImage,
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
    preset: "常见尺寸",
    custom: "自定义",
    ratio: "比例",
    free: "自由",
    dragHint: "拖动裁剪框移动，拉四角改大小",
    format: "输出格式",
    quality: "质量",
    background: "背景",
    download: "下载",
    result: "结果",
    cropArea: "裁剪区域",
    empty: "调整尺寸后显示预览",
    note: "裁剪：拖动裁剪框选区域；缩放：整张图拉伸到目标尺寸。",
    expand: "放大预览",
    collapse: "退出放大",
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
    ratio: "Ratio",
    free: "Free",
    dragHint: "Drag the box to move it, pull a corner to resize",
    format: "Format",
    quality: "Quality",
    background: "Background",
    download: "Download",
    result: "Result",
    cropArea: "Crop area",
    empty: "Adjust the size to see the preview",
    note: "Crop: drag a box over the image. Resize: the whole image is stretched to the target size.",
    expand: "Expand preview",
    collapse: "Exit expand",
  },
};

const PRESETS: { id: string; zh: string; en: string; width: number; height: number }[] = [
  { id: "fhd", zh: "1920 × 1080", en: "1920 × 1080", width: 1920, height: 1080 },
  { id: "hd", zh: "1280 × 720", en: "1280 × 720", width: 1280, height: 720 },
  { id: "square", zh: "1080 × 1080", en: "1080 × 1080", width: 1080, height: 1080 },
  { id: "svga", zh: "800 × 600", en: "800 × 600", width: 800, height: 600 },
  { id: "avatar", zh: "头像 512 × 512", en: "Avatar 512 × 512", width: 512, height: 512 },
  { id: "id-1", zh: "一寸 295 × 413", en: "1-inch ID 295 × 413", width: 295, height: 413 },
  { id: "id-2", zh: "二寸 413 × 579", en: "2-inch ID 413 × 579", width: 413, height: 579 },
];

const ASPECTS: { key: string; label: string; value: number | null }[] = [
  { key: "free", label: "", value: null },
  { key: "1:1", label: "1:1", value: 1 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
];

/** Number input that lets you type freely and only commits valid values. */
function SizeInput({
  value,
  max,
  onCommit,
  label,
}: {
  value: number;
  max: number;
  onCommit: (value: number) => void;
  label: string;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  return (
    <Input
      type="number"
      min={8}
      max={max}
      value={draft ?? String(Math.round(value))}
      onFocus={() => setDraft(String(Math.round(value)))}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = Number(event.target.value);
        if (Number.isFinite(next) && next >= 8) onCommit(next);
      }}
      onBlur={() => setDraft(null)}
      aria-label={label}
      size="xs"
      className="w-20 text-center font-mono"
    />
  );
}

export function ImageResizeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];

  const [mode, setMode] = React.useState<"resize" | "crop">("resize");
  const [dims, setDims] = React.useState<{ id: string; width: number; height: number } | null>(null);
  const [lock, setLock] = React.useState(true);
  const [crop, setCrop] = React.useState<{ id: string; rect: CropRect } | null>(null);
  const [aspect, setAspect] = React.useState<{ key: string; value: number | null }>({
    key: "free",
    value: null,
  });
  const [format, setFormat] = React.useState<ImageFormat>("image/png");
  const [quality, setQuality] = React.useState(90);
  const [background, setBackground] = React.useState("#ffffff");
  const [preview, setPreview] = React.useState<{ url: string; blob: Blob; width: number; height: number } | null>(null);
  const [working, setWorking] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  // Size follows the loaded image until the user edits it, so no effect is needed
  const width = dims && image && dims.id === image.id ? dims.width : (image?.width ?? 0);
  const height = dims && image && dims.id === image.id ? dims.height : (image?.height ?? 0);
  const ratio = image ? image.width / image.height : 1;

  const bounds = { width: image?.width ?? 1, height: image?.height ?? 1 };
  const rect: CropRect =
    crop && image && crop.id === image.id
      ? crop.rect
      : { x: 0, y: 0, width: bounds.width, height: bounds.height };

  // Reflect the current size in the preset dropdown; unmatched sizes read as custom
  const presetValue =
    mode === "crop"
      ? (PRESETS.find(
          (p) => p.width === Math.round(rect.width) && p.height === Math.round(rect.height)
        )?.id ?? "")
      : (PRESETS.find((p) => p.width === width && p.height === height)?.id ?? "");

  const outWidth = mode === "crop" ? Math.round(rect.width) : width;
  const outHeight = mode === "crop" ? Math.round(rect.height) : height;

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

  const applyAspect = (next: { key: string; value: number | null }) => {
    setAspect(next);
    if (image && next.value) {
      setCrop({ id: image.id, rect: fitRectToAspect(rect, next.value, bounds) });
    }
  };

  /** Resize the crop box from a typed value, honouring the locked ratio. */
  const setCropSize = (dimension: "width" | "height", value: number) => {
    if (!image) return;
    const locked = aspect.value;
    let nextWidth = dimension === "width" ? value : rect.width;
    let nextHeight = dimension === "height" ? value : rect.height;
    if (locked) {
      if (dimension === "width") nextHeight = nextWidth / locked;
      else nextWidth = nextHeight * locked;
    }
    nextWidth = clamp(nextWidth, 8, bounds.width);
    nextHeight = clamp(nextHeight, 8, bounds.height);
    setCrop({
      id: image.id,
      rect: clampRect({ x: rect.x, y: rect.y, width: nextWidth, height: nextHeight }, bounds),
    });
  };

  const applyPreset = (preset: { width: number; height: number }) => {
    if (!image) return;
    if (mode === "resize") {
      setLock(false);
      applySize(preset.width, preset.height);
      return;
    }
    // Crop: fit the preset inside the image without upscaling
    const presetRatio = preset.width / preset.height;
    const scale = Math.min(1, bounds.width / preset.width, bounds.height / preset.height);
    const nextWidth = Math.max(8, Math.round(preset.width * scale));
    const nextHeight = Math.max(8, Math.round(preset.height * scale));
    const matched = ASPECTS.find(
      (a) => a.value !== null && Math.abs(a.value - presetRatio) < 0.004
    );
    setAspect(matched ?? { key: "custom", value: presetRatio });
    setCrop({
      id: image.id,
      rect: clampRect({ x: rect.x, y: rect.y, width: nextWidth, height: nextHeight }, bounds),
    });
  };

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
        const canvas =
          mode === "crop"
            ? renderImage(img, {
                width: outWidth,
                height: outHeight,
                source: { sx: rect.x, sy: rect.y, sw: rect.width, sh: rect.height },
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
    }, mode === "crop" ? 220 : 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (created) URL.revokeObjectURL(created);
    };
  }, [
    image,
    mode,
    width,
    height,
    outWidth,
    outHeight,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    format,
    quality,
    background,
  ]);

  const onCropChange = React.useCallback(
    (next: CropRect) => {
      if (image) setCrop({ id: image.id, rect: next });
    },
    [image]
  );

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
              onChange={setMode}
              options={[
                { value: "resize", label: t.resize },
                { value: "crop", label: t.crop },
              ]}
            />

            {mode === "resize" ? (
              <>
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
              </>
            ) : (
              <>
                <OptionField label={t.width}>
                  <SizeInput
                    value={rect.width}
                    max={bounds.width}
                    onCommit={(value) => setCropSize("width", value)}
                    label={t.width}
                  />
                </OptionField>
                <OptionField label={t.height}>
                  <SizeInput
                    value={rect.height}
                    max={bounds.height}
                    onCommit={(value) => setCropSize("height", value)}
                    label={t.height}
                  />
                </OptionField>
                <OptionField label={t.ratio}>
                  <Segmented
                    ariaLabel={t.ratio}
                    value={aspect.key}
                    onChange={(key) => {
                      const next = ASPECTS.find((a) => a.key === key);
                      if (next) applyAspect({ key: next.key, value: next.value });
                    }}
                    options={ASPECTS.map((a) => ({
                      value: a.key,
                      label: a.key === "free" ? t.free : a.label,
                    }))}
                  />
                </OptionField>
              </>
            )}

            <OptionField label={t.preset}>
              <Select
                value={presetValue}
                onValueChange={(value) => {
                  const preset = PRESETS.find((p) => p.id === value);
                  if (preset) applyPreset(preset);
                }}
              >
                <SelectTrigger size="xs" aria-label={t.preset} className="w-36">
                  <SelectValue placeholder={t.custom} />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            {mode === "crop" && (
              <span className="text-[11px] text-foreground-subtle">{t.dragHint}</span>
            )}
          </OptionBar>

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

            <ZoomToggle
              expanded={expanded}
              onToggle={() => setExpanded((prev) => !prev)}
              expandLabel={t.expand}
              collapseLabel={t.collapse}
            />

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

          <ZoomStage
            expanded={expanded}
            onCollapse={() => setExpanded(false)}
            collapseLabel={t.collapse}
            className="overflow-hidden p-0"
          >
            {(full) => (
              <>
                <header className="flex h-10 w-full items-center gap-2 border-b border-border px-3">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                    {mode === "crop" ? t.cropArea : t.result}
                  </span>
                  <span className="text-[11px] text-foreground-subtle">
                    {preview
                      ? `${preview.width}×${preview.height} · ${formatBytes(preview.blob.size)}`
                      : ""}
                  </span>
                  {working && (
                    <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-foreground-subtle" />
                  )}
                </header>
                <div className="w-full p-3">
                  {mode === "crop" ? (
                    <div className="flex justify-center">
                      <ImageCropper
                        src={image.url}
                        width={image.width}
                        height={image.height}
                        rect={rect}
                        onChange={onCropChange}
                        aspect={aspect.value}
                        maxHeight={full ? "calc(100dvh - 12rem)" : 420}
                      />
                    </div>
                  ) : preview ? (
                    <ImagePreview
                      src={preview.url}
                      alt={t.result}
                      height={full ? "h-[calc(100dvh-12rem)]" : undefined}
                    />
                  ) : (
                    <p className="py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
                  )}
                </div>
              </>
            )}
          </ZoomStage>

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}
