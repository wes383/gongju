"use client";

import * as React from "react";
import { Loader2, Minimize2 } from "lucide-react";
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
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { OutputList, useOutputs } from "@/components/tools/image-output";
import { OptionBar, OptionField, Toggle } from "@/components/tools/tool-ui";
import {
  baseName,
  canvasToBlob,
  decodeFile,
  encodeUnderSize,
  extensionFor,
  isLossy,
  OUTPUT_FORMATS,
  renderImage,
  supportsFormat,
  type ImageFormat,
} from "@/lib/image";

const COPY = {
  zh: {
    target: "压缩到指定大小",
    targetKb: "目标大小",
    maxEdge: "最大边",
    keepSize: "不限制",
    format: "输出格式",
    auto: "保持原格式",
    quality: "质量",
    run: "开始压缩",
    running: "压缩中…",
    note: "全部在浏览器内完成，图片不会上传。PNG 是无损格式，无法靠质量压缩，需要控制体积请选 WebP / JPEG / AVIF。",
    targetMissed: "未达目标",
    smaller: (p: number) => `−${p}%`,
    bigger: (p: number) => `+${p}%`,
    unsupported: "当前浏览器不支持 AVIF 编码，已回退到 WebP",
    pngTarget: "PNG 是无损格式，无法通过降低质量来压缩，只能缩小尺寸；需要控制体积请改用 WebP / JPEG / AVIF。",
    px: "px",
    kb: "KB",
  },
  en: {
    target: "Compress to size",
    targetKb: "Target",
    maxEdge: "Max edge",
    keepSize: "No limit",
    format: "Format",
    auto: "Keep original",
    quality: "Quality",
    run: "Compress",
    running: "Compressing…",
    note: "Everything runs in your browser, nothing is uploaded. PNG is lossless, so pick WebP, JPEG or AVIF if you need a smaller file.",
    targetMissed: "Missed target",
    smaller: (p: number) => `−${p}%`,
    bigger: (p: number) => `+${p}%`,
    unsupported: "This browser cannot encode AVIF, fell back to WebP",
    pngTarget: "PNG is lossless, so quality cannot be lowered — only the dimensions can shrink. Use WebP, JPEG or AVIF when you need a smaller file.",
    px: "px",
    kb: "KB",
  },
};

const KNOWN: ImageFormat[] = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function ImageCompressTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles({ multiple: true });
  const { outputs, replace } = useOutputs();

  const [targetEnabled, setTargetEnabled] = React.useState(true);
  const [targetKb, setTargetKb] = React.useState(200);
  const [maxEdge, setMaxEdge] = React.useState(0);
  const [format, setFormat] = React.useState<"auto" | ImageFormat>("auto");
  const [quality, setQuality] = React.useState(80);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (format === "image/avif") {
      supportsFormat("image/avif").then((ok) => {
        if (!ok) {
          setFormat("image/webp");
          setNotice(t.unsupported);
        }
      });
    }
  }, [format, t.unsupported]);

  const run = async () => {
    if (images.length === 0) return;
    setBusy(true);
    setNotice(null);
    const drafts = [];
    try {
      for (const item of images) {
        const img = await decodeFile(item.file);
        const fmt: ImageFormat =
          format === "auto"
            ? KNOWN.includes(item.type as ImageFormat)
              ? (item.type as ImageFormat)
              : "image/jpeg"
            : format;
        const scale =
          maxEdge > 0 ? Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight)) : 1;
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const background = fmt === "image/jpeg" ? "#ffffff" : undefined;

        let blob: Blob;
        let outWidth = width;
        let outHeight = height;
        let missed = false;

        if (targetEnabled && targetKb > 0) {
          const result = await encodeUnderSize(img, {
            width,
            height,
            format: fmt,
            targetBytes: targetKb * 1024,
            background,
          });
          blob = result.blob;
          outWidth = result.width;
          outHeight = result.height;
          missed = blob.size > targetKb * 1024;
        } else {
          const canvas = renderImage(img, { width, height, background });
          blob = await canvasToBlob(canvas, fmt, quality / 100);
        }

        const delta = Math.round(((item.size - blob.size) / item.size) * 100);
        const parts: string[] = [];
        if (isLossy(fmt) && !targetEnabled) parts.push(`q${quality}`);
        parts.push(delta >= 0 ? t.smaller(delta) : t.bigger(-delta));
        if (missed) parts.push(t.targetMissed);

        drafts.push({
          name: `${baseName(item.name)}.${extensionFor(fmt)}`,
          blob,
          width: outWidth,
          height: outHeight,
          note: parts.join(" · "),
          warn: delta < 0 || missed,
        });
      }
      replace(drafts);
    } finally {
      setBusy(false);
    }
  };

  const targetIsPng =
    targetEnabled && (format === "image/png" || (format === "auto" && images[0]?.type === "image/png"));

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
            <Toggle checked={targetEnabled} onChange={setTargetEnabled} label={t.target} />
            {targetEnabled && (
              <OptionField label={t.targetKb}>
                <Input
                  type="number"
                  min={5}
                  max={20000}
                  value={targetKb}
                  onChange={(e) =>
                    setTargetKb(Math.min(Math.max(Number(e.target.value) || 5, 5), 20000))
                  }
                  aria-label={t.targetKb}
                  size="xs"
                  className="w-20 text-center font-mono"
                />
                <span className="text-[11px] text-foreground-subtle">{t.kb}</span>
              </OptionField>
            )}
            {!targetEnabled && (
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

            <OptionField label={t.maxEdge}>
              <Input
                type="number"
                min={0}
                max={20000}
                value={maxEdge || ""}
                placeholder={t.keepSize}
                onChange={(e) =>
                  setMaxEdge(Math.min(Math.max(Number(e.target.value) || 0, 0), 20000))
                }
                aria-label={t.maxEdge}
                size="xs"
                className="w-20 text-center font-mono"
              />
              <span className="text-[11px] text-foreground-subtle">{t.px}</span>
            </OptionField>

            <OptionField label={t.format}>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger size="xs" aria-label={t.format} className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t.auto}</SelectItem>
                  {OUTPUT_FORMATS.map((f) => (
                    <SelectItem key={f.type} value={f.type}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            <Button
              type="button"
              size="xs"
              onClick={run}
              disabled={busy}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          {targetIsPng && <p className="text-xs text-orange-fg">{t.pngTarget}</p>}
          {notice && <p className="text-xs text-orange-fg">{notice}</p>}

          <OutputList outputs={outputs} zipName="compressed.zip" />

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}
