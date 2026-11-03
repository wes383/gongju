"use client";

import * as React from "react";
import { Download, Eraser, ScanEye, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ImageDrop,
  ImagePreview,
  useImageFiles,
  type LoadedImage,
} from "@/components/tools/image-drop";
import { OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import {
  baseName,
  canvasToBlob,
  decodeFile,
  downloadBlob,
  extensionFor,
  formatBytes,
} from "@/lib/image";
import {
  DEFAULT_REDACT,
  drawRedactions,
  isUsableRect,
  normalizeRect,
  type Rect,
  type RedactMode,
} from "@/lib/mosaic";

const COPY = {
  zh: {
    mode: "效果",
    mosaic: "马赛克",
    blur: "模糊",
    solid: "纯色",
    block: "马赛克块大小",
    blurRadius: "模糊半径",
    color: "颜色",
    undo: "撤销",
    clear: "清除全部",
    download: "下载",
    outputFormat: "输出格式",
    jpegQuality: "JPEG 质量",
    hint: "在图片上按住拖动框选要遮盖的区域，可重复添加多块；导出时按原图分辨率重新绘制。",
    empty: "拖入截图或照片，把敏感信息涂掉",
    count: (n: number) => `${n} 个遮盖区域`,
    note: "全部在本地完成：图片不上传，也不会经过服务器。马赛克与模糊是不可逆的像素运算，导出后无法还原原文。",
    sizeNote: (size: string) => `原图 ${size}`,
  },
  en: {
    mode: "Effect",
    mosaic: "Mosaic",
    blur: "Blur",
    solid: "Solid",
    block: "Mosaic block",
    blurRadius: "Blur radius",
    color: "Colour",
    undo: "Undo",
    clear: "Clear all",
    download: "Download",
    outputFormat: "Format",
    jpegQuality: "JPEG quality",
    hint: "Drag on the image to mark a region to hide; add as many as you need. Export re-draws at the original resolution.",
    empty: "Drop a screenshot or photo and cover the sensitive parts",
    count: (n: number) => `${n} region${n === 1 ? "" : "s"}`,
    note: "Everything runs locally — nothing is uploaded. Mosaic and blur are destructive pixel operations, so the original cannot be recovered from the export.",
    sizeNote: (size: string) => `Source ${size}`,
  },
};

const FORMATS = [
  { type: "image/png", label: "PNG" },
  { type: "image/jpeg", label: "JPEG" },
  { type: "image/webp", label: "WebP" },
];

export function ImageMosaicTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const active = images[0];

  return (
    <div className="flex flex-col gap-4">
      <ImageDrop
        images={images}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        error={error}
        loading={loading}
        hint={t.hint}
      />

      {active ? (
        // Remounting on a new file is what resets the masks — no effect needed
        <MosaicEditor key={active.id} image={active} />
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center text-xs text-foreground-subtle">
          {t.empty}
        </div>
      )}

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-faint">
        <ScanEye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}

function MosaicEditor({ image }: { image: LoadedImage }) {
  const t = useCopy(COPY);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const startRef = React.useRef<{ x: number; y: number } | null>(null);

  const [ready, setReady] = React.useState(false);
  const [rects, setRects] = React.useState<Rect[]>([]);
  const [draft, setDraft] = React.useState<Rect | null>(null);
  const [options, setOptions] = React.useState(DEFAULT_REDACT);
  const [format, setFormat] = React.useState("image/png");
  const [quality, setQuality] = React.useState(0.92);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    decodeFile(image.file)
      .then((img) => {
        if (cancelled) return;
        imageRef.current = img;
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
    };
  }, [image]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !ready) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Masks are stored in image pixels; the preview is CSS-scaled, so block and
    // blur sizes have to be scaled by the same factor to look identical
    const scale = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
    drawRedactions(ctx, img, rects, options, scale);

    if (draft && draft.width > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(draft.x, draft.y, draft.width, draft.height);
      ctx.strokeStyle = "rgba(59,130,246,0.9)";
      ctx.lineWidth = Math.max(1, scale * 1.5);
      ctx.setLineDash([scale * 6, scale * 4]);
      ctx.strokeRect(draft.x, draft.y, draft.width, draft.height);
      ctx.restore();
    }
  }, [ready, rects, draft, options]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startRef.current = pointFromEvent(event);
    setDraft({ x: startRef.current.x, y: startRef.current.y, width: 0, height: 0 });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!startRef.current || !canvas) return;
    setDraft(
      normalizeRect(startRef.current, pointFromEvent(event), {
        width: canvas.width,
        height: canvas.height,
      })
    );
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const start = startRef.current;
    const rect =
      event.type === "pointercancel" || !start || !canvas
        ? draft
        : normalizeRect(start, pointFromEvent(event), {
            width: canvas.width,
            height: canvas.height,
          });
    if (rect && isUsableRect(rect)) setRects((prev) => [...prev, rect]);
    setDraft(null);
    startRef.current = null;
  };

  const download = async () => {
    const img = imageRef.current;
    if (!img) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      drawRedactions(ctx, img, rects, options, 1);
      const blob = await canvasToBlob(canvas, format, quality);
      downloadBlob(blob, `${baseName(image.name)}-masked.${extensionFor(format)}`);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return <ImagePreview src={image.url} alt={image.name} />;
  }

  return (
    <>
      <OptionBar>
        <Segmented
          ariaLabel={t.mode}
          value={options.mode}
          onChange={(mode) => setOptions((prev) => ({ ...prev, mode: mode as RedactMode }))}
          options={[
            { value: "mosaic", label: t.mosaic },
            { value: "blur", label: t.blur },
            { value: "solid", label: t.solid },
          ]}
        />
        {options.mode === "mosaic" && (
          <OptionField label={t.block}>
            <Input
              type="number"
              min={3}
              max={80}
              value={String(options.blockSize)}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  blockSize: Math.min(80, Math.max(3, Number(event.target.value) || 3)),
                }))
              }
              className="w-20 font-mono text-xs"
              size="xs"
            />
          </OptionField>
        )}
        {options.mode === "blur" && (
          <OptionField label={t.blurRadius}>
            <Input
              type="number"
              min={2}
              max={60}
              value={String(options.blur)}
              onChange={(event) =>
                setOptions((prev) => ({
                  ...prev,
                  blur: Math.min(60, Math.max(2, Number(event.target.value) || 2)),
                }))
              }
              className="w-20 font-mono text-xs"
              size="xs"
            />
          </OptionField>
        )}
        {options.mode === "solid" && (
          <OptionField label={t.color}>
            <input
              type="color"
              value={options.color}
              onChange={(event) => setOptions((prev) => ({ ...prev, color: event.target.value }))}
              className="h-8 w-12 cursor-pointer rounded border border-border bg-surface"
              aria-label={t.color}
            />
          </OptionField>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-foreground-faint">{t.count(rects.length)}</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setRects((prev) => prev.slice(0, -1))}
            disabled={rects.length === 0}
          >
            <Undo2 className="h-3.5 w-3.5" />
            {t.undo}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setRects([])}
            disabled={rects.length === 0}
          >
            <Eraser className="h-3.5 w-3.5" />
            {t.clear}
          </Button>
        </div>
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface p-2">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="mx-auto h-auto max-h-[560px] w-auto max-w-full cursor-crosshair touch-none select-none rounded"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
        <OptionField label={t.outputFormat}>
          <Segmented
            ariaLabel={t.outputFormat}
            value={format}
            onChange={setFormat}
            options={FORMATS.map((item) => ({ value: item.type, label: item.label }))}
          />
        </OptionField>
        {format !== "image/png" && (
          <OptionField label={`${t.jpegQuality} ${Math.round(quality * 100)}%`}>
            <input
              type="range"
              min={40}
              max={100}
              value={Math.round(quality * 100)}
              onChange={(event) => setQuality(Number(event.target.value) / 100)}
              className="h-1.5 w-32 cursor-pointer"
              aria-label={t.jpegQuality}
            />
          </OptionField>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-foreground-faint">
            {image.width}×{image.height} · {t.sizeNote(formatBytes(image.size))}
          </span>
          <Button type="button" size="sm" onClick={download} disabled={busy}>
            <Download className="h-4 w-4" />
            {t.download}
          </Button>
        </div>
      </div>
    </>
  );
}
