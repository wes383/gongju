"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { useAppTheme } from "@/components/theme-provider";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OptionField,
  Pane,
  SampleButton,
  Segmented,
  Toggle,
  WarningNote,
} from "@/components/tools/tool-ui";
import {
  CHART_FONT,
  CHART_PALETTES,
  CHART_SAMPLES,
  DARK_THEME,
  LIGHT_THEME,
  parseChartData,
  type ChartKind,
  type ChartPalette,
} from "@/lib/chart";
import dynamic from "next/dynamic";

// Recharts is a large payload and only needed once the page is interactive.
const ChartPreview = dynamic(
  () => import("@/components/tools/chart-preview").then((module) => module.ChartPreview),
  { ssr: false }
);
import { downloadBlob } from "@/lib/files";
import { codedError, errorText, safe } from "@/lib/errors";
import { rasterizeSvg } from "@/lib/svg";

const COPY = {
  zh: {
    data: "数据（CSV / JSON）",
    preview: "图表",
    kind: "类型",
    bar: "柱状图",
    line: "折线图",
    area: "面积图",
    pie: "饼图",
    scatter: "散点图",
    size: "画布",
    wide: "16:9",
    classic: "4:3",
    square: "1:1",
    title: "标题",
    titlePlaceholder: "图表标题（可留空）",
    legend: "图例",
    values: "数值标签",
    copySvg: "复制 SVG",
    downloadSvg: "SVG",
    downloadPng: "PNG",
    pieOneSeries: "饼图只使用第一个数值列，其余列不会显示",
    hint: "CSV 第一列是分类，其余数值列各成一个系列；JSON 支持对象数组、二维数组、数字数组与 {标签: 数值}。",
    rows: "行",
    series: "个系列",
    valueLabel: "数值",
    style: "样式",
    palette: "配色",
    paletteDefault: "默认",
    paletteSoft: "柔和",
    paletteContrast: "高对比",
    paletteMono: "单色",
    lineWidth: "线宽",
    thin: "细",
    standard: "标准",
    thick: "粗",
    curve: "曲线",
    smooth: "平滑",
    straight: "直线",
    dots: "数据点",
    dotsNone: "无",
    dotsSmall: "小",
    dotsMedium: "大",
    round: "圆角",
    grid: "网格",
    background: "背景",
    bgTheme: "跟随主题",
    bgWhite: "白底",
    bgTransparent: "透明",
  },
  en: {
    data: "Data (CSV / JSON)",
    preview: "Chart",
    kind: "Type",
    bar: "Bar",
    line: "Line",
    area: "Area",
    pie: "Pie",
    scatter: "Scatter",
    size: "Canvas",
    wide: "16:9",
    classic: "4:3",
    square: "1:1",
    title: "Title",
    titlePlaceholder: "Chart title (optional)",
    legend: "Legend",
    values: "Value labels",
    copySvg: "Copy SVG",
    downloadSvg: "SVG",
    downloadPng: "PNG",
    pieOneSeries: "A pie chart uses the first numeric column only; the rest are ignored",
    hint: "The first CSV column is the category and every numeric column becomes a series. JSON accepts object arrays, nested arrays, number arrays and {label: value}.",
    rows: "rows",
    series: "series",
    valueLabel: "Value",
    style: "Style",
    palette: "Palette",
    paletteDefault: "Default",
    paletteSoft: "Soft",
    paletteContrast: "Contrast",
    paletteMono: "Mono",
    lineWidth: "Stroke",
    thin: "Thin",
    standard: "Medium",
    thick: "Thick",
    curve: "Curve",
    smooth: "Smooth",
    straight: "Straight",
    dots: "Points",
    dotsNone: "None",
    dotsSmall: "Small",
    dotsMedium: "Large",
    round: "Rounded",
    grid: "Grid",
    background: "Background",
    bgTheme: "Theme",
    bgWhite: "White",
    bgTransparent: "Transparent",
  },
};

const KINDS: { value: ChartKind; labelKey: keyof (typeof COPY)["zh"] }[] = [
  { value: "bar", labelKey: "bar" },
  { value: "line", labelKey: "line" },
  { value: "area", labelKey: "area" },
  { value: "pie", labelKey: "pie" },
  { value: "scatter", labelKey: "scatter" },
];

const SIZES = {
  wide: { width: 960, height: 540 },
  classic: { width: 800, height: 600 },
  square: { width: 600, height: 600 },
} as const;

type ChartSize = keyof typeof SIZES;

const LINE_WIDTHS = { thin: 1.6, standard: 2.4, thick: 3.2 } as const;
type LineWidth = keyof typeof LINE_WIDTHS;

const DOT_SIZES = { none: 0, small: 3.2, medium: 4.8 } as const;
type DotSize = keyof typeof DOT_SIZES;

type Curve = "monotone" | "linear";
type CanvasBackground = "theme" | "white" | "transparent";

const subscribeNoop = () => () => {};

export function ChartMakerTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { resolvedTheme } = useAppTheme();
  const mounted = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const dark = mounted && resolvedTheme === "dark";
  const theme = dark ? DARK_THEME : LIGHT_THEME;

  // `null` means "show the sample for the active locale", so switching the UI
  // language localises the sample until the user edits the text themselves.
  const [customInput, setCustomInput] = React.useState<string | null>(null);
  const input = customInput ?? CHART_SAMPLES[locale].sales;
  const [kind, setKind] = React.useState<ChartKind>("bar");
  const [size, setSize] = React.useState<ChartSize>("wide");
  const [title, setTitle] = React.useState("");
  const [showLegend, setShowLegend] = React.useState(true);
  const [showValues, setShowValues] = React.useState(false);
  const [palette, setPalette] = React.useState<ChartPalette>("default");
  const [lineWidth, setLineWidth] = React.useState<LineWidth>("standard");
  const [curve, setCurve] = React.useState<Curve>("monotone");
  const [dotSize, setDotSize] = React.useState<DotSize>("small");
  const [rounded, setRounded] = React.useState(true);
  const [showGrid, setShowGrid] = React.useState(true);
  const [canvas, setCanvas] = React.useState<CanvasBackground>("theme");
  const [exportError, setExportError] = React.useState<unknown>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);

  // A white canvas forces the light chart palette so text stays readable in dark mode.
  const chartTheme = canvas === "white" ? LIGHT_THEME : theme;
  const canvasColor = canvas === "white" ? "#ffffff" : theme.background;

  const parsed = safe(() => parseChartData(input, { valueLabel: t.valueLabel }));
  const dimensions = SIZES[size];
  const pieEmpty =
    kind === "pie" &&
    parsed.value !== null &&
    parsed.value.series[0].values.every((value) => value === null || value <= 0);
  const dataError = parsed.error ?? (pieEmpty ? codedError("chart.empty") : null);

  /** Recharts only exists in the DOM, so downloads serialise the live <svg> */
  const serializeSvg = (): string => {
    const source = previewRef.current?.querySelector("svg");
    if (!source) return "";
    const clone = source.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("font-family", CHART_FONT);
    // Drop the responsive sizing from the live preview and use the chosen canvas
    clone.removeAttribute("style");
    clone.setAttribute("width", String(dimensions.width));
    clone.setAttribute("height", String(dimensions.height));
    if (canvas !== "transparent") {
      // Paint the canvas inside the SVG too, in the local user-unit space.
      const viewBox = clone.getAttribute("viewBox")?.split(/[\s,]+/).map(Number) ?? [];
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(viewBox[0] ?? 0));
      rect.setAttribute("y", String(viewBox[1] ?? 0));
      rect.setAttribute("width", String(viewBox[2] ?? dimensions.width));
      rect.setAttribute("height", String(viewBox[3] ?? dimensions.height));
      rect.setAttribute("fill", canvasColor);
      clone.insertBefore(rect, clone.firstChild);
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
  };

  const downloadSvg = () => {
    const svg = serializeSvg();
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "chart.svg");
  };

  const downloadPng = async () => {
    const svg = serializeSvg();
    if (!svg) return;
    try {
      const blob = await rasterizeSvg(svg, {
        width: dimensions.width * 2,
        height: dimensions.height * 2,
        background: canvas === "transparent" ? undefined : canvasColor,
      });
      downloadBlob(blob, "chart.png");
      setExportError(null);
    } catch {
      setExportError(codedError("chart.exportFailed"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.kind}>
          <Segmented
            ariaLabel={t.kind}
            value={kind}
            onChange={setKind}
            options={KINDS.map((item) => ({ value: item.value, label: t[item.labelKey] }))}
          />
        </OptionField>
        <OptionField label={t.size}>
          <Segmented
            ariaLabel={t.size}
            value={size}
            onChange={setSize}
            options={[
              { value: "wide", label: t.wide },
              { value: "classic", label: t.classic },
              { value: "square", label: t.square },
            ]}
          />
        </OptionField>
        <OptionField label={t.title}>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.titlePlaceholder}
            aria-label={t.title}
            size="xs"
            className="w-56"
          />
        </OptionField>
        <Toggle checked={showLegend} onChange={setShowLegend} label={t.legend} />
        {kind === "bar" && <Toggle checked={showValues} onChange={setShowValues} label={t.values} />}
      </OptionBar>

      <OptionBar>
        <OptionField label={t.palette}>
          <Segmented
            ariaLabel={t.palette}
            value={palette}
            onChange={setPalette}
            options={[
              { value: "default", label: t.paletteDefault },
              { value: "soft", label: t.paletteSoft },
              { value: "contrast", label: t.paletteContrast },
              { value: "mono", label: t.paletteMono },
            ]}
          />
        </OptionField>
        {(kind === "line" || kind === "area") && (
          <>
            <OptionField label={t.lineWidth}>
              <Segmented
                ariaLabel={t.lineWidth}
                value={lineWidth}
                onChange={setLineWidth}
                options={[
                  { value: "thin", label: t.thin },
                  { value: "standard", label: t.standard },
                  { value: "thick", label: t.thick },
                ]}
              />
            </OptionField>
            <OptionField label={t.curve}>
              <Segmented
                ariaLabel={t.curve}
                value={curve}
                onChange={setCurve}
                options={[
                  { value: "monotone", label: t.smooth },
                  { value: "linear", label: t.straight },
                ]}
              />
            </OptionField>
            <OptionField label={t.dots}>
              <Segmented
                ariaLabel={t.dots}
                value={dotSize}
                onChange={setDotSize}
                options={[
                  { value: "none", label: t.dotsNone },
                  { value: "small", label: t.dotsSmall },
                  { value: "medium", label: t.dotsMedium },
                ]}
              />
            </OptionField>
          </>
        )}
        {kind === "bar" && <Toggle checked={rounded} onChange={setRounded} label={t.round} />}
        <Toggle checked={showGrid} onChange={setShowGrid} label={t.grid} />
        <OptionField label={t.background}>
          <Segmented
            ariaLabel={t.background}
            value={canvas}
            onChange={setCanvas}
            options={[
              { value: "theme", label: t.bgTheme },
              { value: "white", label: t.bgWhite },
              { value: "transparent", label: t.bgTransparent },
            ]}
          />
        </OptionField>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.data}
            actions={
              <>
                <SampleButton onClick={() => setCustomInput(null)} />
                <ClearButton onClick={() => setCustomInput("")} />
              </>
            }
            footer={
              parsed.value ? (
                <>
                  {parsed.value.labels.length} {t.rows}
                  <span>·</span>
                  {parsed.value.series.length} {t.series}
                </>
              ) : null
            }
          >
            <InputArea
              value={input}
              onChange={(event) => setCustomInput(event.target.value)}
              spellCheck={false}
              className="min-h-[360px] font-mono"
              placeholder={t.hint}
              aria-label={t.data}
            />
          </Pane>
        </div>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.preview}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <CopyButton getValue={serializeSvg} label={t.copySvg} disabled={!parsed.value} />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="gap-1.5 text-foreground-muted"
                onClick={downloadSvg}
                disabled={!parsed.value}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.downloadSvg}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="gap-1.5 text-foreground-muted"
                onClick={downloadPng}
                disabled={!parsed.value}
              >
                <Download className="h-3.5 w-3.5" />
                <span>{t.downloadPng}</span>
              </Button>
            </div>
          </header>
          <div className="min-h-[360px] flex-1 space-y-3 overflow-auto p-4">
            {kind === "pie" && parsed.value && parsed.value.series.length > 1 && (
              <WarningNote>{t.pieOneSeries}</WarningNote>
            )}
            {dataError ? <ErrorNote>{errorText(dataError, locale)}</ErrorNote> : null}
            {parsed.value && !dataError ? (
              <div
                ref={previewRef}
                className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
                style={{
                  background: canvas === "transparent" ? "transparent" : canvasColor,
                  fontFamily: CHART_FONT,
                }}
              >
                <ChartPreview
                  data={parsed.value}
                  kind={kind}
                  title={title}
                  showLegend={showLegend}
                  showValues={showValues}
                  theme={chartTheme}
                  width={dimensions.width}
                  height={dimensions.height}
                  colors={CHART_PALETTES[palette]}
                  lineWidth={LINE_WIDTHS[lineWidth]}
                  curve={curve}
                  dotSize={DOT_SIZES[dotSize]}
                  barRadius={rounded ? 4 : 0}
                  showGrid={showGrid}
                />
              </div>
            ) : null}
            {exportError ? <ErrorNote>{errorText(exportError, locale)}</ErrorNote> : null}
          </div>
          <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
            {dimensions.width} × {dimensions.height}
          </footer>
        </section>
      </div>
    </div>
  );
}
