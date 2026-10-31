"use client";

import * as React from "react";
import { Droplet, Loader2 } from "lucide-react";
import { degrees, type PDFPage } from "pdf-lib";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfDrop, usePdfFiles } from "@/components/tools/pdf-drop";
import { PdfOutputList, usePdfOutputs } from "@/components/tools/pdf-output";
import { OptionBar, OptionField, Toggle } from "@/components/tools/tool-ui";
import { baseName } from "@/lib/files";
import { openPdfBytes, savePdf, textStampImage } from "@/lib/pdf";
import { parsePageRanges } from "@/lib/pdf-pages";

const COPY = {
  zh: {
    text: "水印文字",
    placeholder: "机密 · 仅供参考",
    size: "字号",
    color: "颜色",
    opacity: "透明度",
    rotate: "角度",
    tile: "平铺",
    gap: "间距",
    ranges: "页码",
    rangesHint: "留空 = 全部",
    run: "添加水印",
    running: "处理中…",
    invalid: "页码范围不合法，请检查是否超出总页数",
    empty: "请先输入水印文字",
    note: "水印以矢量页面上叠加图片的方式绘制，支持中文等任意字符；原文件不会被修改。",
  },
  en: {
    text: "Watermark text",
    placeholder: "Confidential",
    size: "Size",
    color: "Color",
    opacity: "Opacity",
    rotate: "Angle",
    tile: "Tile",
    gap: "Gap",
    ranges: "Pages",
    rangesHint: "Empty = all",
    run: "Apply watermark",
    running: "Working…",
    invalid: "Invalid page range — check for pages beyond the last one",
    empty: "Enter the watermark text first",
    note: "The watermark is stamped as an image, so any script works — Chinese included. The original file stays untouched.",
  },
};

export function PdfWatermarkTool() {
  const t = useCopy(COPY);
  const { files, add, remove, clear, error, loading, setError } = usePdfFiles();
  const { outputs, replace } = usePdfOutputs();
  const [text, setText] = React.useState("");
  const [size, setSize] = React.useState(48);
  const [color, setColor] = React.useState("#9ca3af");
  const [opacity, setOpacity] = React.useState(25);
  const [rotate, setRotate] = React.useState(45);
  const [tile, setTile] = React.useState(true);
  const [gap, setGap] = React.useState(6);
  const [ranges, setRanges] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const entry = files[0];
  const total = entry?.pages ?? 0;
  const selection = React.useMemo(
    () => (entry ? parsePageRanges(ranges, total) : null),
    [entry, ranges, total]
  );
  const rangeError = entry != null && selection === null;

  const run = async () => {
    if (!entry || !selection) return;
    if (!text.trim()) {
      setNotice(t.empty);
      return;
    }
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const doc = await openPdfBytes(new Uint8Array(await entry.file.arrayBuffer()));
      const stamp = await textStampImage(text.trim(), { fontSize: size, color });
      const image = await doc.embedPng(stamp.bytes);
      const rad = (rotate * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const draw = (page: PDFPage, cx: number, cy: number) => {
        const w = stamp.width;
        const h = stamp.height;
        // pdf-lib rotates around the draw origin, so back off the centre vector
        page.drawImage(image, {
          x: cx - ((w / 2) * cos - (h / 2) * sin),
          y: cy - ((w / 2) * sin + (h / 2) * cos),
          width: w,
          height: h,
          rotate: degrees(rotate),
          opacity: opacity / 100,
        });
      };

      for (const index of selection) {
        const page = doc.getPage(index);
        const { width, height } = page.getSize();
        if (!tile) {
          draw(page, width / 2, height / 2);
          continue;
        }
        const stepX = stamp.width * (1 + gap / 40);
        const stepY = stamp.height * (2 + gap / 10);
        for (let y = stepY / 2; y < height + stepY; y += stepY) {
          for (let x = stepX / 2; x < width + stepX; x += stepX) {
            draw(page, x, y);
          }
        }
      }

      replace([
        {
          name: `${baseName(entry.name, "document")}-watermark.pdf`,
          blob: await savePdf(doc),
          note: `${selection.length} / ${total}`,
        },
      ]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PdfDrop
        files={files}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        error={error}
        loading={loading}
      />

      {entry && (
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
                min={12}
                max={120}
                step={4}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                aria-label={t.size}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-10 font-mono text-[11px] text-foreground-subtle">{size}pt</span>
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
            <OptionField label={t.rotate}>
              <input
                type="range"
                min={-90}
                max={90}
                step={5}
                value={rotate}
                onChange={(e) => setRotate(Number(e.target.value))}
                aria-label={t.rotate}
                className="w-24 accent-[var(--accent)]"
              />
              <span className="w-8 font-mono text-[11px] text-foreground-subtle">{rotate}°</span>
            </OptionField>

            <Toggle checked={tile} onChange={setTile} label={t.tile} />

            {tile && (
              <OptionField label={t.gap}>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  aria-label={t.gap}
                  className="w-20 accent-[var(--accent)]"
                />
              </OptionField>
            )}

            <OptionField label={t.ranges}>
              <Input
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder={t.rangesHint}
                aria-label={t.ranges}
                size="xs"
                className="w-40 font-mono"
              />
            </OptionField>

            <Button
              type="button"
              size="xs"
              onClick={run}
              disabled={busy || rangeError}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Droplet className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          {rangeError && <p className="text-xs text-red-fg">{t.invalid}</p>}
          {notice && <p className="text-xs text-orange-fg">{notice}</p>}

          <PdfOutputList outputs={outputs} zipName="watermarked.zip" />

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}
