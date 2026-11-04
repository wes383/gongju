"use client";

import * as React from "react";
import { Grid3x3, Loader2 } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDrop, useImageFiles } from "@/components/tools/image-drop";
import { OutputList, useOutputs } from "@/components/tools/image-output";
import { OptionBar, OptionField } from "@/components/tools/tool-ui";
import { ZoomStage, ZoomToggle } from "@/components/tools/zoom-stage";
import { baseName, canvasToBlob, decodeFile, renderImage } from "@/lib/image";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    rows: "行",
    cols: "列",
    run: "开始切图",
    running: "切图中…",
    tile: (r: number, c: number) => `第 ${r} 行第 ${c} 列`,
    note: "按行列均分，适合九宫格朋友圈配图；切出的每块尺寸相同，余数像素会被忽略。",
    preset: "快速",
    expand: "放大预览",
    collapse: "退出放大",
  },
  en: {
    rows: "Rows",
    cols: "Columns",
    run: "Split",
    running: "Splitting…",
    tile: (r: number, c: number) => `Row ${r}, column ${c}`,
    note: "Splits evenly by rows and columns — handy for nine-grid posts. Every tile is the same size; leftover pixels are ignored.",
    preset: "Quick",
    expand: "Expand preview",
    collapse: "Exit expand",
  },
};

const PRESETS = [
  { label: "3 × 3", rows: 3, cols: 3 },
  { label: "2 × 2", rows: 2, cols: 2 },
  { label: "3 × 1", rows: 3, cols: 1 },
  { label: "1 × 3", rows: 1, cols: 3 },
];

export function ImageSplitTool() {
  const t = useCopy(COPY);
  const { images, add, remove, clear, error, loading } = useImageFiles();
  const image = images[0];
  const { outputs, replace } = useOutputs();

  const [rows, setRows] = React.useState(3);
  const [cols, setCols] = React.useState(3);
  const [busy, setBusy] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const run = async () => {
    if (!image) return;
    setBusy(true);
    try {
      const img = await decodeFile(image.file);
      const tileWidth = Math.floor(img.naturalWidth / cols);
      const tileHeight = Math.floor(img.naturalHeight / rows);
      const drafts = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const canvas = renderImage(img, {
            width: tileWidth,
            height: tileHeight,
            source: { sx: c * tileWidth, sy: r * tileHeight, sw: tileWidth, sh: tileHeight },
          });
          const blob = await canvasToBlob(canvas, "image/png");
          drafts.push({
            name: `${baseName(image.name)}-${r + 1}-${c + 1}.png`,
            blob,
            width: tileWidth,
            height: tileHeight,
            note: t.tile(r + 1, c + 1),
          });
        }
      }
      replace(drafts);
      // Jump to the tiles so the result is visible without scrolling by hand
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } finally {
      setBusy(false);
    }
  };

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
            <OptionField label={t.preset}>
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant={preset.rows === rows && preset.cols === cols ? "default" : "outline"}
                  size="xs"
                  onClick={() => {
                    setRows(preset.rows);
                    setCols(preset.cols);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </OptionField>

            <OptionField label={t.rows}>
              <Input
                type="number"
                min={1}
                max={10}
                value={rows}
                onChange={(e) => setRows(Math.min(Math.max(Number(e.target.value) || 1, 1), 10))}
                aria-label={t.rows}
                size="xs"
                className="w-16 text-center font-mono"
              />
            </OptionField>
            <OptionField label={t.cols}>
              <Input
                type="number"
                min={1}
                max={10}
                value={cols}
                onChange={(e) => setCols(Math.min(Math.max(Number(e.target.value) || 1, 1), 10))}
                aria-label={t.cols}
                size="xs"
                className="w-16 text-center font-mono"
              />
            </OptionField>

            <span className="font-mono text-[11px] text-foreground-subtle">
              {Math.floor(image.width / cols)}×{Math.floor(image.height / rows)} × {rows * cols}
            </span>

            <ZoomToggle
              expanded={expanded}
              onToggle={() => setExpanded((prev) => !prev)}
              expandLabel={t.expand}
              collapseLabel={t.collapse}
            />

            <Button type="button" size="xs" onClick={run} disabled={busy} className="ml-auto gap-1.5">
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Grid3x3 className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          <ZoomStage
            expanded={expanded}
            onCollapse={() => setExpanded(false)}
            collapseLabel={t.collapse}
            className="overflow-hidden"
          >
            {(full) => (
              <div className="relative inline-block max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.name}
                  className={cn(
                    "max-w-full",
                    full ? "max-h-[calc(100dvh-8rem)]" : "max-h-[420px]"
                  )}
                />
                <div className="pointer-events-none absolute inset-0">
                  {Array.from({ length: cols - 1 }, (_, i) => (
                    <span
                      key={`v${i}`}
                      className="absolute top-0 h-full w-px bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                      style={{ left: `${((i + 1) / cols) * 100}%` }}
                    />
                  ))}
                  {Array.from({ length: rows - 1 }, (_, i) => (
                    <span
                      key={`h${i}`}
                      className="absolute left-0 h-px w-full bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                      style={{ top: `${((i + 1) / rows) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </ZoomStage>

          <div ref={resultsRef} className="scroll-mt-4">
            <OutputList outputs={outputs} zipName={`${baseName(image.name)}-tiles.zip`} />
          </div>
          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}
