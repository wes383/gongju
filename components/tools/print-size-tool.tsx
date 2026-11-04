"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { PAPER_SIZES, printSize, qualityOf, resolutionOf, type Quality } from "@/lib/print";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    pixels: "像素尺寸",
    width: "宽",
    height: "高",
    dpi: "打印分辨率",
    result: "打印尺寸",
    inches: "英寸",
    effective: "有效精度",
    papers: "常见纸张对照",
    paperSize: "纸张",
    quality: {
      excellent: "优秀",
      good: "良好",
      fair: "勉强",
      low: "偏低",
    } as Record<Quality, string>,
    empty: "填入像素尺寸与 DPI",
    note: "打印尺寸 = 像素 ÷ DPI × 25.4。300 DPI 是照片与画册的常规要求，150 DPI 是远看大幅面（海报、展板）的下限；低于 150 DPI 近看会有明显颗粒，放大插值不会真正增加细节。",
  },
  en: {
    pixels: "Pixel size",
    width: "Width",
    height: "Height",
    dpi: "Print resolution",
    result: "Print size",
    inches: "inches",
    effective: "Effective ppi",
    papers: "Common papers",
    paperSize: "Paper",
    quality: {
      excellent: "Excellent",
      good: "Good",
      fair: "Marginal",
      low: "Low",
    } as Record<Quality, string>,
    empty: "Enter the pixel size and the DPI",
    note: "Print size = pixels ÷ DPI × 25.4. 300 DPI is the norm for photos and albums; 150 DPI is the floor for large formats viewed from a distance. Below 150 DPI the grain shows up close, and upscaling adds no real detail.",
  },
};

const VARIANT: Record<Quality, "success" | "info" | "warning" | "danger"> = {
  excellent: "success",
  good: "info",
  fair: "warning",
  low: "danger",
};

export function PrintSizeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [width, setWidth] = React.useState("6000");
  const [height, setHeight] = React.useState("4000");
  const [dpi, setDpi] = React.useState("300");

  const solved = React.useMemo(
    () => safe(() => printSize(Number(width), Number(height), Number(dpi))),
    [width, height, dpi]
  );

  const result = solved.value;
  const ppi = result ? resolutionOf(Number(width), result.widthMm) : 0;

  const papers = React.useMemo(() => {
    const pxW = Number(width);
    const pxH = Number(height);
    if (!Number.isFinite(pxW) || !Number.isFinite(pxH) || pxW <= 0 || pxH <= 0) return [];
    return PAPER_SIZES.map((paper) => {
      const inW = paper.width / 25.4;
      const inH = paper.height / 25.4;
      // Best fit allowing the sheet to be rotated
      const fit = Math.max(
        Math.min(pxW / inW, pxH / inH),
        Math.min(pxW / inH, pxH / inW)
      );
      return { paper, ppi: fit, quality: qualityOf(fit) };
    });
  }, [width, height]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">
                {t.pixels} · {t.width}
              </span>
              <Input
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                inputMode="numeric"
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">
                {t.pixels} · {t.height}
              </span>
              <Input
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                inputMode="numeric"
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.dpi}</span>
              <Input
                value={dpi}
                onChange={(event) => setDpi(event.target.value)}
                inputMode="numeric"
                className="w-full font-mono text-sm"
                size="xs"
              />
            </label>
          </div>
          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{result ? `${formatNumber(ppi, 3)} ppi` : "—"}</span>}
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {formatNumber(result.widthMm, 4)} × {formatNumber(result.heightMm, 4)} mm
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {formatNumber(result.widthIn, 3)}″ × {formatNumber(result.heightIn, 3)}″
                    </div>
                  </div>
                  <CopyButton
                    value={`${formatNumber(result.widthMm, 2)} x ${formatNumber(result.heightMm, 2)} mm`}
                    size="icon-xs"
                  />
                </div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.dpi}</dt>
                    <dd className="ml-auto font-mono text-foreground">{formatNumber(Number(dpi), 5)}</dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.pixels}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {formatNumber(Number(width), 6)} × {formatNumber(Number(height), 6)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </Pane>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.papers}
          </span>
        </header>
        <ul className="divide-y divide-border">
          {papers.map((row) => (
            <li key={row.paper.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-40 shrink-0 truncate text-[12px] text-foreground-muted">
                {row.paper.name[locale]}
              </span>
              <span className="font-mono text-[11px] text-foreground-faint">
                {formatNumber(row.paper.width, 5)} × {formatNumber(row.paper.height, 5)} mm
              </span>
              <span className="ml-auto font-mono text-[12px] text-foreground">
                {formatNumber(row.ppi, 3)} ppi
              </span>
              <Badge variant={VARIANT[row.quality]} size="sm">
                {t.quality[row.quality]}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
