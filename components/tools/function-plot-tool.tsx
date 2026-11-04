"use client";

import * as React from "react";
import { Download, Plus, X } from "lucide-react";
import { useAppTheme } from "@/components/theme-provider";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNote, OptionBar, OptionField, Pane, Toggle } from "@/components/tools/tool-ui";
import { autoRange, clampRange, formatTick, niceTicks, sampleFunction, type PlotPoint } from "@/lib/plot";
import { downloadBlob } from "@/lib/files";
import { rasterizeSvg } from "@/lib/svg";

const COPY = {
  zh: {
    functions: "函数",
    add: "添加函数",
    remove: "删除",
    expression: "表达式",
    range: "取值范围",
    yRange: "纵轴",
    auto: "自动",
    manual: "手动",
    grid: "网格",
    plot: "图像",
    downloadSvg: "SVG",
    downloadPng: "PNG",
    loading: "正在加载表达式引擎…",
    empty: "输入表达式后这里画图",
    invalid: (expr: string) => `无法解析「${expr}」，检查括号与函数名`,
    hint: "用 x 作为自变量，支持 sin、cos、tan、sqrt、abs、log、ln、exp 等函数与 pi、e 常量。纵轴默认按数据自动拟合，尖峰会按 2%–98% 分位裁剪。",
    note: "图像在浏览器里直接绘制成 SVG，可导出 SVG 或 2 倍分辨率 PNG。表达式不会上传到任何服务器。",
    exportFailed: "导出失败，请重试",
  },
  en: {
    functions: "Functions",
    add: "Add function",
    remove: "Remove",
    expression: "Expression",
    range: "Domain",
    yRange: "Range",
    auto: "Auto",
    manual: "Manual",
    grid: "Grid",
    plot: "Plot",
    downloadSvg: "SVG",
    downloadPng: "PNG",
    loading: "Loading the expression engine…",
    empty: "Type an expression and the plot appears here",
    invalid: (expr: string) => `Cannot parse “${expr}” — check the brackets and function names`,
    hint: "Use x as the variable; sin, cos, tan, sqrt, abs, log, ln, exp and the constants pi / e all work. The y axis fits the data automatically and clips the top and bottom 2% so one spike cannot flatten the curve.",
    note: "The plot is drawn as SVG in your browser and exports as SVG or a 2× PNG. The expressions never reach a server.",
    exportFailed: "Export failed, please try again",
  },
};

const WIDTH = 820;
const HEIGHT = 460;
const PAD = { left: 54, right: 18, top: 18, bottom: 36 };

const COLORS = ["#2563eb", "#dc2626", "#059669"];

const PALETTE = {
  light: { bg: "#ffffff", text: "#14161a", subtle: "#6b7280", grid: "#e5e7eb", axis: "#9ca3af" },
  dark: { bg: "#14161a", text: "#f7f7f8", subtle: "#a1a7b3", grid: "#2a2f38", axis: "#4b5563" },
};

interface Fn {
  id: number;
  expr: string;
}

/** Breaks the path at gaps and at poles, where consecutive samples jump across the whole frame */
function pathFor(points: PlotPoint[], sx: (x: number) => number, sy: (y: number) => number, ySpan: number) {
  let d = "";
  let drawing = false;
  let previous: number | null = null;

  for (const point of points) {
    if (point.y === null) {
      drawing = false;
      previous = null;
      continue;
    }
    const jump = previous !== null && Math.abs(point.y - previous) > ySpan * 0.6;
    if (!drawing || jump) {
      d += `M${sx(point.x).toFixed(2)},${sy(point.y).toFixed(2)} `;
      drawing = true;
    } else {
      d += `L${sx(point.x).toFixed(2)},${sy(point.y).toFixed(2)} `;
    }
    previous = point.y;
  }

  return d.trim();
}

export function FunctionPlotTool() {
  const t = useCopy(COPY);
  const { resolvedTheme } = useAppTheme();
  const palette = resolvedTheme === "dark" ? PALETTE.dark : PALETTE.light;

  const svgRef = React.useRef<SVGSVGElement>(null);
  const [engine, setEngine] = React.useState<typeof import("mathjs/number") | null>(null);
  const [functions, setFunctions] = React.useState<Fn[]>([{ id: 1, expr: "sin(x)" }, { id: 2, expr: "x^2/4" }]);
  const [nextId, setNextId] = React.useState(3);
  const [xMin, setXMin] = React.useState("-10");
  const [xMax, setXMax] = React.useState("10");
  const [yMin, setYMin] = React.useState("");
  const [yMax, setYMax] = React.useState("");
  const [grid, setGrid] = React.useState(true);
  const [exportFailed, setExportFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const math = await import("mathjs/number");
      if (!cancelled) setEngine(() => math);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const compileError = React.useMemo(() => {
    if (!engine) return null;
    for (const fn of functions) {
      if (!fn.expr.trim()) continue;
      try {
        engine.compile(fn.expr);
      } catch {
        return fn.expr;
      }
    }
    return null;
  }, [engine, functions]);

  const xFrom = Number(xMin);
  const xTo = Number(xMax);
  const domainOk = Number.isFinite(xFrom) && Number.isFinite(xTo) && xTo > xFrom;

  const series = React.useMemo(() => {
    if (!engine || !domainOk || compileError) return [];
    return functions
      .map((fn, index) => ({ fn, index }))
      .filter(({ fn }) => fn.expr.trim() !== "")
      .map(({ fn, index }) => {
        const node = engine.compile(fn.expr);
        const points = sampleFunction((x) => Number(node.evaluate({ x })), xFrom, xTo, 900);
        return { id: fn.id, expr: fn.expr, index, points };
      });
  }, [engine, functions, xFrom, xTo, domainOk, compileError]);

  const computed = React.useMemo(() => {
    const auto = autoRange(series.map((item) => item.points));
    const manualMin = Number(yMin);
    const manualMax = Number(yMax);
    const manual =
      yMin.trim() !== "" && yMax.trim() !== "" && Number.isFinite(manualMin) && Number.isFinite(manualMax) && manualMax > manualMin
        ? { min: manualMin, max: manualMax }
        : null;
    return clampRange(manual ?? auto);
  }, [series, yMin, yMax]);

  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + ((x - xFrom) / (xTo - xFrom)) * plotWidth;
  const sy = (y: number) => PAD.top + plotHeight - ((y - computed.min) / (computed.max - computed.min)) * plotHeight;

  const xTicks = domainOk ? niceTicks(xFrom, xTo, 8) : [];
  const yTicks = niceTicks(computed.min, computed.max, 6);

  const serialize = () => {
    const svg = svgRef.current;
    if (!svg) return "";
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(WIDTH));
    clone.setAttribute("height", String(HEIGHT));
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", "100%");
    background.setAttribute("height", "100%");
    background.setAttribute("fill", palette.bg);
    clone.insertBefore(background, clone.firstChild);
    return new XMLSerializer().serializeToString(clone);
  };

  const downloadSvg = () => {
    const markup = serialize();
    if (markup) downloadBlob(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), "plot.svg");
  };

  const downloadPng = async () => {
    const markup = serialize();
    if (!markup) return;
    setExportFailed(false);
    try {
      const blob = await rasterizeSvg(markup, { width: WIDTH * 2, height: HEIGHT * 2, background: palette.bg });
      downloadBlob(blob, "plot.png");
    } catch {
      setExportFailed(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.range}>
          <Input
            value={xMin}
            onChange={(event) => setXMin(event.target.value)}
            size="xs"
            inputMode="decimal"
            className="w-[68px] font-mono"
            aria-label={`${t.range} min`}
          />
          <span className="text-foreground-subtle">–</span>
          <Input
            value={xMax}
            onChange={(event) => setXMax(event.target.value)}
            size="xs"
            inputMode="decimal"
            className="w-[68px] font-mono"
            aria-label={`${t.range} max`}
          />
        </OptionField>
        <OptionField label={t.yRange}>
          <Input
            value={yMin}
            onChange={(event) => setYMin(event.target.value)}
            size="xs"
            inputMode="decimal"
            placeholder={t.auto}
            className="w-[68px] font-mono"
            aria-label={`${t.yRange} min`}
          />
          <span className="text-foreground-subtle">–</span>
          <Input
            value={yMax}
            onChange={(event) => setYMax(event.target.value)}
            size="xs"
            inputMode="decimal"
            placeholder={t.auto}
            className="w-[68px] font-mono"
            aria-label={`${t.yRange} max`}
          />
        </OptionField>
        <Toggle checked={grid} onChange={setGrid} label={t.grid} />
        <span className="ml-auto font-mono text-[11px] text-foreground-faint">
          {engine ? "" : t.loading}
        </span>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane label={t.functions}>
              <div className="flex flex-col gap-2 p-3">
                {functions.map((fn, index) => (
                  <div key={fn.id} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      aria-hidden="true"
                    />
                    <Input
                      value={fn.expr}
                      onChange={(event) =>
                        setFunctions((prev) =>
                          prev.map((item) => (item.id === fn.id ? { ...item, expr: event.target.value } : item))
                        )
                      }
                      size="xs"
                      spellCheck={false}
                      className="font-mono"
                      aria-label={t.expression}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={functions.length <= 1}
                      onClick={() => setFunctions((prev) => prev.filter((item) => item.id !== fn.id))}
                      aria-label={t.remove}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {functions.length < COLORS.length && (
                  <Button
                    type="button"
                    variant="subtle"
                    size="xs"
                    className="mt-1 w-fit gap-1"
                    onClick={() => {
                      setFunctions((prev) => [...prev, { id: nextId, expr: "" }]);
                      setNextId((prev) => prev + 1);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t.add}
                  </Button>
                )}
              </div>
            </Pane>
          </div>

          {compileError && <ErrorNote>{t.invalid(compileError)}</ErrorNote>}
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.plot}
              actions={
                <>
                  <Button type="button" variant="ghost" size="xs" className="gap-1" onClick={downloadSvg}>
                    <Download className="h-3.5 w-3.5" />
                    {t.downloadSvg}
                  </Button>
                  <Button type="button" variant="ghost" size="xs" className="gap-1" onClick={downloadPng}>
                    <Download className="h-3.5 w-3.5" />
                    {t.downloadPng}
                  </Button>
                </>
              }
            >
              {domainOk && !compileError && series.length > 0 ? (
                <div className="p-2">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    className="h-auto w-full"
                    role="img"
                    aria-label={t.plot}
                  >
                    <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={palette.bg} />

                    {grid &&
                      xTicks.map((tick) => (
                        <line
                          key={`vx-${tick}`}
                          x1={sx(tick)}
                          x2={sx(tick)}
                          y1={PAD.top}
                          y2={PAD.top + plotHeight}
                          stroke={palette.grid}
                          strokeWidth={1}
                        />
                      ))}
                    {grid &&
                      yTicks.map((tick) => (
                        <line
                          key={`hy-${tick}`}
                          x1={PAD.left}
                          x2={PAD.left + plotWidth}
                          y1={sy(tick)}
                          y2={sy(tick)}
                          stroke={palette.grid}
                          strokeWidth={1}
                        />
                      ))}

                    {/* Axes sit on top of the grid, and only when zero is in view */}
                    {computed.min <= 0 && computed.max >= 0 && (
                      <line
                        x1={PAD.left}
                        x2={PAD.left + plotWidth}
                        y1={sy(0)}
                        y2={sy(0)}
                        stroke={palette.axis}
                        strokeWidth={1.2}
                      />
                    )}
                    {xFrom <= 0 && xTo >= 0 && (
                      <line
                        x1={sx(0)}
                        x2={sx(0)}
                        y1={PAD.top}
                        y2={PAD.top + plotHeight}
                        stroke={palette.axis}
                        strokeWidth={1.2}
                      />
                    )}

                    {xTicks.map((tick) => (
                      <text
                        key={`tx-${tick}`}
                        x={sx(tick)}
                        y={HEIGHT - 12}
                        textAnchor="middle"
                        fontSize={11}
                        fill={palette.subtle}
                      >
                        {formatTick(tick)}
                      </text>
                    ))}
                    {yTicks.map((tick) => (
                      <text
                        key={`ty-${tick}`}
                        x={PAD.left - 8}
                        y={sy(tick) + 4}
                        textAnchor="end"
                        fontSize={11}
                        fill={palette.subtle}
                      >
                        {formatTick(tick)}
                      </text>
                    ))}

                    {series.map((item) => (
                      <path
                        key={item.id}
                        d={pathFor(item.points, sx, sy, computed.max - computed.min)}
                        fill="none"
                        stroke={COLORS[item.index % COLORS.length]}
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    ))}
                  </svg>
                </div>
              ) : (
                <div className="flex min-h-[280px] items-center justify-center p-4 text-[12.5px] text-foreground-faint">
                  {compileError ? t.invalid(compileError) : t.empty}
                </div>
              )}
            </Pane>
          </div>

          {series.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 px-1 text-[11px] text-foreground-muted">
              {series.map((item) => (
                <span key={item.id} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-3 rounded-full"
                    style={{ backgroundColor: COLORS[item.index % COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="font-mono">{item.expr}</span>
                </span>
              ))}
              {exportFailed && <span className="text-red-fg">{t.exportFailed}</span>}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
