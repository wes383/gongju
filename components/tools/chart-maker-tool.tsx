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
import { CHART_SAMPLES, DARK_THEME, LIGHT_THEME, parseChartData, renderChartSvg, type ChartKind } from "@/lib/chart";
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
  const [exportError, setExportError] = React.useState<unknown>(null);

  const parsed = safe(() => parseChartData(input, { valueLabel: t.valueLabel }));
  const dimensions = SIZES[size];
  const rendered = parsed.value
    ? safe(() =>
        renderChartSvg(parsed.value as ReturnType<typeof parseChartData>, {
          kind,
          title,
          width: dimensions.width,
          height: dimensions.height,
          theme,
          showLegend,
          showValues,
        })
      )
    : { value: null, error: null };

  const svg = rendered.value ?? "";
  const dataError = parsed.error ?? rendered.error;

  const downloadSvg = () => {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), "chart.svg");
  };

  const downloadPng = async () => {
    if (!svg) return;
    try {
      const blob = await rasterizeSvg(svg, {
        width: dimensions.width * 2,
        height: dimensions.height * 2,
        background: theme.background,
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
              <CopyButton value={svg} label={t.copySvg} />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="gap-1.5 text-foreground-muted"
                onClick={downloadSvg}
                disabled={!svg}
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
                disabled={!svg}
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
            {svg ? (
              <div
                className="[&_svg]:h-auto [&_svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
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
