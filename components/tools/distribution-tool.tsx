"use client";

import * as React from "react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Input } from "@/components/ui/input";
import {
  ErrorNote,
  OptionBar,
  OptionField,
  Pane,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { errorText, safe } from "@/lib/errors";
import {
  DISTRIBUTIONS,
  createDistribution,
  type Distribution,
  type DistributionId,
} from "@/lib/distribution";
import { formatTick, niceTicks } from "@/lib/plot";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    distribution: "分布",
    params: "参数",
    density: "概率密度 f(x)",
    mass: "概率 P(X = x)",
    query: "查询点 x",
    cdf: "累积概率 P(X ≤ x)",
    tail: "上尾 P(X > x)",
    quantile: "分位点",
    quantileHint: "输入 0–1 之间的概率，得到对应分位数",
    probability: "概率 p",
    moments: "数字特征",
    mean: "期望 E(X)",
    variance: "方差 Var(X)",
    std: "标准差 σ",
    showCdf: "叠加累积曲线",
    invalid: "参数不合法，检查一下上下界或标准差是否为正",
    note: "连续分布用误差函数与伽马函数直接求值，离散分布按点概率累加；分位数对连续分布是逆 CDF，对离散分布是使 P(X ≤ k) ≥ p 的最小整数 k。所有计算在浏览器内完成。",
    empty: "—",
  },
  en: {
    distribution: "Distribution",
    params: "Parameters",
    density: "Density f(x)",
    mass: "P(X = x)",
    query: "Query point x",
    cdf: "P(X ≤ x)",
    tail: "P(X > x)",
    quantile: "Quantile",
    quantileHint: "Enter a probability between 0 and 1",
    probability: "Probability p",
    moments: "Moments",
    mean: "Mean E(X)",
    variance: "Variance Var(X)",
    std: "Std dev σ",
    showCdf: "Overlay the CDF",
    invalid: "Those parameters do not define a distribution — check the bounds or that sigma is positive",
    note: "Continuous densities are evaluated from the error and gamma functions, discrete ones by summing point masses; the quantile is the inverse CDF for continuous distributions and the smallest k with P(X ≤ k) ≥ p for discrete ones. Everything runs in your browser.",
    empty: "—",
  },
};

const WIDTH = 640;
const HEIGHT = 260;
const PAD = { left: 46, right: 18, top: 16, bottom: 30 };

function defaultsFor(id: DistributionId): Record<string, string> {
  const info = DISTRIBUTIONS.find((item) => item.id === id);
  if (!info) return {};
  return Object.fromEntries(info.params.map((param) => [param.key, String(param.default)]));
}

function parseParams(values: Record<string, string>): Record<string, number> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)]));
}

function DensityChart({ dist, showCdf }: { dist: Distribution; showCdf: boolean }) {
  const { min, max } = dist.range;
  const span = max - min || 1;
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const baseline = HEIGHT - PAD.bottom;

  const xs = Array.from({ length: 241 }, (_, i) => min + (span * i) / 240);
  const densities = xs.map((x) => dist.pdf(x));
  const peak = Math.max(...densities, 0) || 1;
  const top = peak * 1.12;

  const sx = (x: number) => PAD.left + ((x - min) / span) * plotWidth;
  const sy = (y: number) => baseline - (y / top) * plotHeight;
  const cy = (p: number) => baseline - p * plotHeight;

  const xTicks = niceTicks(min, max, 6);
  const yTicks = niceTicks(0, top, 4);

  let area = "";
  let line = "";
  if (!dist.discrete) {
    line = xs
      .map((x, i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(2)},${sy(densities[i]).toFixed(2)}`)
      .join(" ");
    area = `${line} L${sx(max).toFixed(2)},${baseline} L${sx(min).toFixed(2)},${baseline} Z`;
  }

  const slot = plotWidth / Math.max(1, Math.round(max - min));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="distribution">
      {yTicks.map((tick) => (
        <g key={`y-${tick}`}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={sy(tick)}
            y2={sy(tick)}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="3 4"
          />
          <text x={PAD.left - 8} y={sy(tick) + 4} textAnchor="end" fontSize={10} className="fill-foreground-faint">
            {formatTick(tick)}
          </text>
        </g>
      ))}

      {xTicks.map((tick) => (
        <text key={`x-${tick}`} x={sx(tick)} y={HEIGHT - 10} textAnchor="middle" fontSize={10} className="fill-foreground-subtle">
          {formatTick(tick)}
        </text>
      ))}

      {dist.discrete
        ? Array.from({ length: Math.max(0, Math.round(max - min)) }, (_, i) => {
            const k = Math.ceil(min) + i;
            const mass = dist.pdf(k);
            if (mass <= 0) return null;
            const barWidth = Math.max(2, slot * 0.64);
            return (
              <rect
                key={k}
                x={sx(k) - barWidth / 2}
                y={sy(mass)}
                width={barWidth}
                height={baseline - sy(mass)}
                rx={2}
                className="fill-accent"
                fillOpacity={0.75}
              />
            );
          })
        : [
            <path key="area" d={area} className="fill-accent" fillOpacity={0.16} />,
            <path key="line" d={line} className="stroke-accent" strokeWidth={2} fill="none" />,
          ]}

      {showCdf && (
        <path
          d={xs
            .map((x, i) => `${i === 0 ? "M" : "L"}${sx(x).toFixed(2)},${cy(dist.cdf(x)).toFixed(2)}`)
            .join(" ")}
          className="stroke-accent-hover"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          fill="none"
        />
      )}

      <line x1={PAD.left} x2={WIDTH - PAD.right} y1={baseline} y2={baseline} className="stroke-border-strong" strokeWidth={1} />
    </svg>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-b-0">
      <span className="text-[11px] text-foreground-muted">{label}</span>
      <span className="font-mono text-[12.5px] tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function DistributionTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [id, setId] = React.useState<DistributionId>("normal");
  const [values, setValues] = React.useState<Record<string, string>>(defaultsFor("normal"));
  const [query, setQuery] = React.useState("1");
  const [probability, setProbability] = React.useState("0.95");
  const [showCdf, setShowCdf] = React.useState(false);

  const info = DISTRIBUTIONS.find((item) => item.id === id) ?? DISTRIBUTIONS[0];

  const built = React.useMemo(
    () => safe(() => createDistribution(id, parseParams(values))),
    [id, values]
  );
  const dist = built.value;

  const x = Number(query);
  const p = Number(probability);
  const validX = Number.isFinite(x);
  const validP = Number.isFinite(p) && p >= 0 && p <= 1;

  const change = (next: DistributionId) => {
    setId(next);
    setValues(defaultsFor(next));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.distribution}>
          <div className="max-w-full overflow-x-auto">
            <Segmented
              ariaLabel={t.distribution}
              value={id}
              onChange={change}
              options={DISTRIBUTIONS.map((item) => ({ value: item.id, label: item.label[locale] }))}
            />
          </div>
        </OptionField>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-foreground-muted">{t.params}</span>
          {info.params.map((param) => (
            <label key={param.key} className="flex items-center gap-1.5">
              <span className="text-[11px] text-foreground-subtle">{param.label[locale]}</span>
              <Input
                value={values[param.key] ?? ""}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [param.key]: event.target.value }))
                }
                size="xs"
                inputMode="decimal"
                className="w-[74px] font-mono"
                aria-label={param.label[locale]}
              />
            </label>
          ))}
        </div>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={info.label[locale]}
            footer={<span className="truncate">{showCdf ? "CDF" : info.discrete ? t.mass : t.density}</span>}
            actions={
              <Toggle checked={showCdf} onChange={setShowCdf} label={t.showCdf} />
            }
          >
            {dist ? (
              <div className="p-2">
                <DensityChart dist={dist} showCdf={showCdf} />
              </div>
            ) : (
              <div className="p-4">
                <ErrorNote>{built.error ? errorText(built.error, locale) : t.invalid}</ErrorNote>
              </div>
            )}
          </Pane>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="overflow-hidden rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-2 text-xs font-medium text-foreground-muted">{t.moments}</h2>
            <Row label={t.mean} value={dist ? formatNumber(dist.mean, 8) : t.empty} />
            <Row label={t.variance} value={dist ? formatNumber(dist.variance, 8) : t.empty} />
            <Row
              label={t.std}
              value={dist ? formatNumber(Math.sqrt(Math.max(0, dist.variance)), 8) : t.empty}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface p-4">
            <label className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground-muted">{t.query}</span>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                size="xs"
                inputMode="decimal"
                className="w-[92px] font-mono"
                aria-label={t.query}
              />
            </label>
            <Row
              label={info.discrete ? t.mass : t.density}
              value={dist && validX ? formatNumber(dist.pdf(x), 6) : t.empty}
            />
            <Row label={t.cdf} value={dist && validX ? formatNumber(dist.cdf(x), 6) : t.empty} />
            <Row
              label={t.tail}
              value={dist && validX ? formatNumber(1 - dist.cdf(x), 6) : t.empty}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface p-4">
            <label className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground-muted">{t.quantile}</span>
              <Input
                value={probability}
                onChange={(event) => setProbability(event.target.value)}
                size="xs"
                inputMode="decimal"
                className="w-[92px] font-mono"
                aria-label={t.probability}
              />
            </label>
            <Row
              label={`P(X ≤ k) = ${validP ? formatNumber(p, 4) : "—"}`}
              value={dist && validP ? formatNumber(dist.quantile(p), 8) : t.empty}
            />
            <p className="mt-2 text-[11px] text-foreground-faint">{t.quantileHint}</p>
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
