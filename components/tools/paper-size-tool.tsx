"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton, ErrorNote, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { bleedBox, getPaper, PAPER_SIZES } from "@/lib/print";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    paper: "纸张",
    orientation: "方向",
    portrait: "纵向",
    landscape: "横向",
    bleed: "出血",
    bleedHint: "印刷品通常留 3 mm",
    safe: "安全边距",
    safeHint: "离裁切线多远的内容不会被切到",
    dpi: "输出分辨率",
    result: "成品尺寸",
    trim: "裁切尺寸",
    withBleed: "含出血尺寸",
    safeArea: "安全区域",
    pixels: "含出血像素",
    empty: "选择纸张后这里给出尺寸",
    note: "出血是超出成品尺寸、裁切时会被切掉的部分，用来避免裁偏露出白边，常规印刷留 3 mm。设计时把背景铺满含出血的画布，文字和 logo 留在安全区域内。",
  },
  en: {
    paper: "Paper",
    orientation: "Orientation",
    portrait: "Portrait",
    landscape: "Landscape",
    bleed: "Bleed",
    bleedHint: "3 mm is standard for print",
    safe: "Safe margin",
    safeHint: "Content inside this line survives trimming",
    dpi: "Output resolution",
    result: "Finished size",
    trim: "Trim",
    withBleed: "With bleed",
    safeArea: "Safe area",
    pixels: "Bleed pixels",
    empty: "Pick a paper size to see the dimensions",
    note: "Bleed is the part that extends past the trim line and gets cut away, so a slight misalignment does not leave a white edge — 3 mm is the usual figure. Fill the bleed canvas with your background and keep text and logos inside the safe area.",
  },
};

export function PaperSizeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [paperId, setPaperId] = React.useState("a4");
  const [orientation, setOrientation] = React.useState<"portrait" | "landscape">("portrait");
  const [bleed, setBleed] = React.useState("3");
  const [safeMargin, setSafeMargin] = React.useState("5");
  const [dpi, setDpi] = React.useState("300");

  const paper = safe(() => getPaper(paperId));
  const widthMm = paper.value
    ? orientation === "portrait"
      ? paper.value.width
      : paper.value.height
    : 0;
  const heightMm = paper.value
    ? orientation === "portrait"
      ? paper.value.height
      : paper.value.width
    : 0;

  const solved = React.useMemo(
    () =>
      safe(() =>
        bleedBox({
          widthMm,
          heightMm,
          bleedMm: Number(bleed),
          safeMm: Number(safeMargin),
          dpi: Number(dpi),
        })
      ),
    [widthMm, heightMm, bleed, safeMargin, dpi]
  );

  const result = solved.value;
  const error = solved.error ?? paper.error;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.paper}</span>
              <Select value={paperId} onValueChange={setPaperId}>
                <SelectTrigger size="xs" aria-label={t.paper} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_SIZES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.orientation}</span>
              <Segmented
                ariaLabel={t.orientation}
                value={orientation}
                onChange={setOrientation}
                options={[
                  { value: "portrait", label: t.portrait },
                  { value: "landscape", label: t.landscape },
                ]}
              />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.bleed}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={bleed}
                  onChange={(event) => setBleed(event.target.value)}
                  inputMode="decimal"
                  className="w-24 font-mono text-sm"
                  size="xs"
                />
                <span className="font-mono text-[11px] text-foreground-faint">mm</span>
              </span>
              <span className="text-[10px] text-foreground-faint">{t.bleedHint}</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.safe}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={safeMargin}
                  onChange={(event) => setSafeMargin(event.target.value)}
                  inputMode="decimal"
                  className="w-24 font-mono text-sm"
                  size="xs"
                />
                <span className="font-mono text-[11px] text-foreground-faint">mm</span>
              </span>
              <span className="text-[10px] text-foreground-faint">{t.safeHint}</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.dpi}</span>
              <Input
                value={dpi}
                onChange={(event) => setDpi(event.target.value)}
                inputMode="numeric"
                className="w-24 font-mono text-sm"
                size="xs"
              />
            </label>
          </div>
          {error && <ErrorNote>{errorText(error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>
                {result
                  ? `${formatNumber(result.withBleed.widthMm, 5)} × ${formatNumber(result.withBleed.heightMm, 5)} mm`
                  : "—"}
              </span>
            }
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {formatNumber(result.trim.widthMm, 5)} × {formatNumber(result.trim.heightMm, 5)} mm
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {formatNumber(result.trim.widthIn, 3)}″ × {formatNumber(result.trim.heightIn, 3)}″
                    </div>
                  </div>
                  <CopyButton
                    value={`${formatNumber(result.trim.widthMm, 2)} x ${formatNumber(result.trim.heightMm, 2)} mm`}
                    size="icon-xs"
                  />
                </div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.withBleed}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {formatNumber(result.withBleed.widthMm, 5)} ×{" "}
                      {formatNumber(result.withBleed.heightMm, 5)} mm
                    </dd>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <dt className="text-foreground-subtle">{t.safeArea}</dt>
                    <dd className="ml-auto font-mono text-foreground">
                      {formatNumber(result.safe.widthMm, 5)} × {formatNumber(result.safe.heightMm, 5)} mm
                    </dd>
                  </div>
                  {result.pixels && (
                    <div className="flex items-center gap-3 px-3 py-2">
                      <dt className="text-foreground-subtle">{t.pixels}</dt>
                      <dd className="ml-auto font-mono text-foreground">
                        {result.pixels.width} × {result.pixels.height} px
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </Pane>
        </div>
      </div>

      {result && <BleedDiagram key={paperId + orientation} result={result} labels={{ trim: t.trim, bleed: t.withBleed, safe: t.safeArea }} />}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

function BleedDiagram({
  result,
  labels,
}: {
  result: { trim: { widthMm: number; heightMm: number }; withBleed: { widthMm: number; heightMm: number }; safe: { widthMm: number; heightMm: number } };
  labels: { trim: string; bleed: string; safe: string };
}) {
  const box = 240;
  const outerW = result.withBleed.widthMm;
  const outerH = result.withBleed.heightMm;
  const k = outerW >= outerH ? box / outerW : box / outerH;
  const w = outerW * k;
  const h = outerH * k;
  const offsetX = (box + 40 - w) / 2;
  const offsetY = 10;
  const bleedPx = ((outerW - result.trim.widthMm) / 2) * k;
  const safePx = ((result.trim.widthMm - result.safe.widthMm) / 2) * k;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center">
        <svg viewBox={`0 0 ${box + 40} ${box + 20}`} className="h-auto w-full max-w-[280px]" role="img" aria-label="bleed">
          <rect
            x={offsetX}
            y={offsetY}
            width={w}
            height={h}
            className="fill-hover-bg stroke-border-strong"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <rect
            x={offsetX + bleedPx}
            y={offsetY + bleedPx}
            width={w - bleedPx * 2}
            height={h - bleedPx * 2}
            className="fill-surface stroke-foreground-muted"
            strokeWidth={1.4}
          />
          <rect
            x={offsetX + bleedPx + safePx}
            y={offsetY + bleedPx + safePx}
            width={w - (bleedPx + safePx) * 2}
            height={h - (bleedPx + safePx) * 2}
            className="fill-none stroke-accent"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
        <ul className="flex flex-col gap-1 text-[11px] text-foreground-subtle">
          <li>
            <span className="mr-1.5 inline-block h-2 w-4 border border-dashed border-border-strong align-middle" />
            {labels.bleed}
          </li>
          <li>
            <span className="mr-1.5 inline-block h-2 w-4 border border-foreground-muted align-middle" />
            {labels.trim}
          </li>
          <li>
            <span className="mr-1.5 inline-block h-2 w-4 border border-dashed border-accent align-middle" />
            {labels.safe}
          </li>
        </ul>
      </div>
    </section>
  );
}
