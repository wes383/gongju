"use client";

import * as React from "react";
import { Loader2, Repeat } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { OutputList, useOutputs } from "@/components/tools/image-output";
import { OptionBar, OptionField, Segmented } from "@/components/tools/tool-ui";
import {
  baseName,
  canvasToBlob,
  decodeFile,
  extensionFor,
  isLossy,
  OUTPUT_FORMATS,
  renderImage,
  supportsFormat,
  type ImageFormat,
} from "@/lib/image";

const COPY = {
  zh: {
    format: "转换为",
    quality: "质量",
    background: "透明底填充",
    run: "开始转换",
    running: "转换中…",
    note: "全部在浏览器内完成，图片不会上传。JPEG 不支持透明，透明区域会填充上面的颜色。",
    unsupported: (name: string) => `当前浏览器不支持 ${name} 编码，已从列表移除`,
  },
  en: {
    format: "Convert to",
    quality: "Quality",
    background: "Flatten with",
    run: "Convert",
    running: "Converting…",
    note: "Everything runs in your browser, nothing is uploaded. JPEG has no alpha channel, so transparency is filled with the colour above.",
    unsupported: (name: string) => `This browser cannot encode ${name}, removed from the list`,
  },
};

export function ImageConvertTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles({ multiple: true });
  const { outputs, replace } = useOutputs();

  const [format, setFormat] = React.useState<ImageFormat>("image/webp");
  const [quality, setQuality] = React.useState(85);
  const [background, setBackground] = React.useState("#ffffff");
  const [busy, setBusy] = React.useState(false);
  const [available, setAvailable] = React.useState<ImageFormat[]>([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    Promise.all(
      OUTPUT_FORMATS.map(async (f) => ((await supportsFormat(f.type)) ? f.type : null))
    ).then((list) => {
      if (!alive) return;
      const ok = list.filter(Boolean) as ImageFormat[];
      setAvailable(ok);
      const dropped = OUTPUT_FORMATS.filter((f) => !ok.includes(f.type));
      if (dropped.length > 0) {
        setNotice(dropped.map((f) => t.unsupported(f.label)).join("；"));
      }
      setFormat((current) => (ok.includes(current) ? current : ok[0] ?? "image/png"));
    });
    return () => {
      alive = false;
    };
  }, [t]);

  const run = async () => {
    if (images.length === 0) return;
    setBusy(true);
    const drafts = [];
    try {
      for (const item of images) {
        const img = await decodeFile(item.file);
        const canvas = renderImage(img, {
          width: img.naturalWidth,
          height: img.naturalHeight,
          background: format === "image/jpeg" ? background : undefined,
        });
        const blob = await canvasToBlob(canvas, format, quality / 100);
        drafts.push({
          name: `${baseName(item.name)}.${extensionFor(format)}`,
          blob,
          width: canvas.width,
          height: canvas.height,
          note: undefined,
        });
      }
      replace(drafts);
    } finally {
      setBusy(false);
    }
  };

  const lossy = isLossy(format);

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
            <OptionField label={t.format}>
              <Segmented
                ariaLabel={t.format}
                value={format}
                onChange={(v) => setFormat(v)}
                options={OUTPUT_FORMATS.filter((f) => available.includes(f.type)).map((f) => ({
                  value: f.type,
                  label: f.label,
                }))}
              />
            </OptionField>

            {lossy && (
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

            <Button type="button" size="xs" onClick={run} disabled={busy} className="ml-auto gap-1.5">
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Repeat className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          {notice && <p className="text-xs text-foreground-subtle">{notice}</p>}

          <OutputList outputs={outputs} zipName="converted.zip" />
        </>
      )}
    </div>
  );
}
