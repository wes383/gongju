"use client";

import * as React from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  ClearButton,
  InputArea,
  Pane,
  SampleButton,
  WarningNote,
} from "@/components/tools/tool-ui";
import { errorText, safe } from "@/lib/errors";
import { histogram, parseNumbers, summarize, type Histogram, type Summary } from "@/lib/statistics";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    data: "数据",
    result: "统计结果",
    sample: "示例",
    clear: "清空",
    placeholder: "粘贴一列数字：空格、逗号、分号或换行分隔都可以",
    skipped: (n: number) => `已忽略 ${n} 个无法识别的内容`,
    empty: "在左侧粘贴一列数字",
    noMode: "没有重复值",
    groupCenter: "集中趋势",
    groupSpread: "离散程度",
    groupShape: "分布形状",
    groupQuantile: "分位数",
    groupOutliers: "异常值",
    count: "个数",
    sum: "总和",
    mean: "平均值",
    median: "中位数",
    mode: "众数",
    geometric: "几何平均值",
    harmonic: "调和平均值",
    stdSample: "标准差（样本）",
    stdPopulation: "标准差（总体）",
    varianceSample: "方差（样本）",
    variancePopulation: "方差（总体）",
    min: "最小值",
    max: "最大值",
    range: "极差",
    q1: "Q1（25%）",
    q3: "Q3（75%）",
    iqr: "四分位距 IQR",
    cv: "变异系数",
    skewness: "偏度",
    kurtosis: "峰度（超额）",
    lowOutliers: "偏小",
    highOutliers: "偏大",
    none: "无",
    histogram: "分布",
    hint: "分位数用线性插值（Excel QUARTILE.INC 口径），方差同时给出样本与总体两种口径，偏度与峰度是偏差校正后的 G1 / G2，异常值按 1.5 × IQR 判定。",
    note: "所有计算在浏览器内完成，数据不会上传。",
  },
  en: {
    data: "Data",
    result: "Summary",
    sample: "Sample",
    clear: "Clear",
    placeholder: "Paste a column of numbers: spaces, commas, semicolons or newlines",
    skipped: (n: number) => `Ignored ${n} value(s) that were not numbers`,
    empty: "Paste a column of numbers on the left",
    noMode: "No repeated values",
    groupCenter: "Central tendency",
    groupSpread: "Spread",
    groupShape: "Shape",
    groupQuantile: "Quantiles",
    groupOutliers: "Outliers",
    count: "Count",
    sum: "Sum",
    mean: "Mean",
    median: "Median",
    mode: "Mode",
    geometric: "Geometric mean",
    harmonic: "Harmonic mean",
    stdSample: "Std dev (sample)",
    stdPopulation: "Std dev (population)",
    varianceSample: "Variance (sample)",
    variancePopulation: "Variance (population)",
    min: "Minimum",
    max: "Maximum",
    range: "Range",
    q1: "Q1 (25%)",
    q3: "Q3 (75%)",
    iqr: "Interquartile range",
    cv: "Coefficient of variation",
    skewness: "Skewness",
    kurtosis: "Kurtosis (excess)",
    lowOutliers: "Low",
    highOutliers: "High",
    none: "None",
    histogram: "Distribution",
    hint: "Quartiles interpolate between order statistics (Excel QUARTILE.INC), spread is reported for both the sample and the population, skewness and kurtosis are the bias-corrected G1 / G2, and outliers use the 1.5 × IQR fence.",
    note: "Everything is computed in your browser, the data is never uploaded.",
  },
};

const SAMPLE = [
  12.4, 13.1, 11.8, 14.2, 12.9, 13.6, 15.1, 12.2, 13.9, 14.5,
  11.5, 12.7, 13.3, 14.8, 12.1, 13.8, 14.0, 12.6, 13.5, 15.4,
  12.3, 13.2, 14.6, 11.9, 12.8, 13.7, 14.1, 12.5, 13.4, 41.7,
].join(", ");

const DASH = "—";

function pct(value: number | null): string {
  if (value === null) return DASH;
  return `${(value * 100).toFixed(2)}%`;
}

function num(value: number | null): string {
  if (value === null) return DASH;
  return formatNumber(value, 8);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-b-0">
      <dt className="text-[11px] text-foreground-muted">{label}</dt>
      <dd className="font-mono text-[12.5px] tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

function HistogramChart({ data }: { data: Histogram }) {
  const width = 600;
  const height = 176;
  const pad = 10;
  const baseline = height - 22;
  const max = Math.max(...data.bins.map((bin) => bin.count), 1);
  const slot = (width - pad * 2) / data.bins.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="histogram"
    >
      {data.bins.map((bin, index) => {
        const barHeight = (bin.count / max) * (baseline - pad);
        return (
          <rect
            key={`${bin.from}-${index}`}
            x={pad + index * slot + 1}
            y={baseline - barHeight}
            width={Math.max(1, slot - 2)}
            height={barHeight}
            rx={2}
            className="fill-accent"
          />
        );
      })}
      <line
        x1={pad}
        x2={width - pad}
        y1={baseline}
        y2={baseline}
        className="stroke-border-strong"
        strokeWidth={1}
      />
      <text x={pad} y={height - 6} className="fill-foreground-subtle" fontSize={11}>
        {formatNumber(data.bins[0].from, 6)}
      </text>
      <text
        x={width - pad}
        y={height - 6}
        textAnchor="end"
        className="fill-foreground-subtle"
        fontSize={11}
      >
        {formatNumber(data.bins[data.bins.length - 1].to, 6)}
      </text>
    </svg>
  );
}

interface Analysis {
  error: Error | null;
  summary: Summary | null;
  hist: Histogram | null;
  skipped: string[];
}

export function StatisticsTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState(SAMPLE);

  const analysis = React.useMemo<Analysis>(() => {
    const parsed = safe(() => parseNumbers(input));
    if (parsed.error || !parsed.value) {
      return { error: parsed.error, summary: null, hist: null, skipped: [] };
    }
    const { values, skipped } = parsed.value;
    if (values.length === 0) {
      return { error: null, summary: null, hist: null, skipped };
    }
    const summary = safe(() => summarize(values));
    const hist = safe(() => histogram(values));
    return {
      error: summary.error ?? hist.error,
      summary: summary.value,
      hist: hist.value,
      skipped,
    };
  }, [input]);

  const s = analysis.summary;
  const modeText = !s
    ? DASH
    : s.modes[0].count < 2
      ? t.noMode
      : s.modes.map((m) => `${formatNumber(m.value, 5)} ×${m.count}`).join(", ");

  const outlierText = (list: number[] | undefined) =>
    !list || list.length === 0 ? t.none : list.map((v) => formatNumber(v, 5)).join(", ");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane label={t.data} footer={<span>{s ? `${s.count}` : ""}</span>}>
              <InputArea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label={t.data}
                placeholder={t.placeholder}
                className="min-h-[280px]"
              />
            </Pane>
          </div>
          <div className="flex items-center gap-1">
            <SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />
            <ClearButton onClick={() => setInput("")} label={t.clear} />
          </div>
          {analysis.skipped.length > 0 && (
            <WarningNote>
              {t.skipped(analysis.skipped.length)}: {analysis.skipped.slice(0, 5).join(", ")}
            </WarningNote>
          )}
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-foreground-muted">{t.result}</h2>
            {s && (
              <span className="font-mono text-[11px] text-foreground-faint">
                n = {s.count}
              </span>
            )}
          </div>

          {analysis.error ? (
            <p className="text-[12.5px] text-red-fg">{errorText(analysis.error, locale)}</p>
          ) : !s ? (
            <p className="text-[12.5px] text-foreground-faint">{t.empty}</p>
          ) : (
            <>
              {analysis.hist && <HistogramChart data={analysis.hist} />}

              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Group title={t.groupCenter}>
                  <Row label={t.count} value={String(s.count)} />
                  <Row label={t.sum} value={num(s.sum)} />
                  <Row label={t.mean} value={num(s.mean)} />
                  <Row label={t.median} value={num(s.median)} />
                  <Row label={t.mode} value={modeText} />
                  <Row label={t.geometric} value={num(s.geometricMean)} />
                  <Row label={t.harmonic} value={num(s.harmonicMean)} />
                </Group>

                <Group title={t.groupSpread}>
                  <Row label={t.stdSample} value={num(s.stdSample)} />
                  <Row label={t.stdPopulation} value={num(s.stdPopulation)} />
                  <Row label={t.varianceSample} value={num(s.varianceSample)} />
                  <Row label={t.variancePopulation} value={num(s.variancePopulation)} />
                  <Row label={t.min} value={num(s.min)} />
                  <Row label={t.max} value={num(s.max)} />
                  <Row label={t.range} value={num(s.range)} />
                </Group>

                <Group title={t.groupQuantile}>
                  <Row label={t.q1} value={num(s.q1)} />
                  <Row label={t.median} value={num(s.median)} />
                  <Row label={t.q3} value={num(s.q3)} />
                  <Row label={t.iqr} value={num(s.iqr)} />
                  <Row label={t.cv} value={pct(s.cv)} />
                </Group>

                <Group title={t.groupShape}>
                  <Row label={t.skewness} value={num(s.skewness)} />
                  <Row label={t.kurtosis} value={num(s.kurtosis)} />
                  <Row label={t.lowOutliers} value={outlierText(s.outliers.low)} />
                  <Row label={t.highOutliers} value={outlierText(s.outliers.high)} />
                </Group>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
