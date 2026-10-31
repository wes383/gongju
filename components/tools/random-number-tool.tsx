"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton, OptionBar, Segmented, Toggle, WarningNote } from "@/components/tools/tool-ui";
import { randomDecimal, randomIntegers } from "@/lib/chance";
import { cn } from "@/lib/utils";

type Kind = "integer" | "decimal";

const COPY = {
  zh: {
    kind: "类型",
    integer: "整数",
    decimal: "小数",
    min: "最小值",
    max: "最大值",
    count: "数量",
    decimals: "小数位",
    unique: "不重复",
    generate: "重新生成",
    copyAll: "复制全部",
    badRange: "请填写有效的最小值和最大值",
    tooMany: "范围里的整数不够，无法生成指定数量的不重复结果",
    countLabel: (n: number) => `${n} 个结果`,
    sum: "总和",
    mean: "平均",
    smallest: "最小",
    largest: "最大",
    note: "使用 crypto.getRandomValues 生成，取整按区间均匀分布；「不重复」只对整数模式有效。",
  },
  en: {
    kind: "Type",
    integer: "Integers",
    decimal: "Decimals",
    min: "Min",
    max: "Max",
    count: "Count",
    decimals: "Decimals",
    unique: "Unique",
    generate: "Regenerate",
    copyAll: "Copy all",
    badRange: "Enter a valid minimum and maximum",
    tooMany: "The range does not hold that many unique integers",
    countLabel: (n: number) => `${n} result${n === 1 ? "" : "s"}`,
    sum: "Sum",
    mean: "Mean",
    smallest: "Min",
    largest: "Max",
    note: "Drawn with crypto.getRandomValues and uniformly distributed across the range. “Unique” only applies to integers.",
  },
};

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

function formatValue(value: number, kind: Kind, decimals: number): string {
  return kind === "decimal" ? value.toFixed(decimals) : String(value);
}

export function RandomNumberTool() {
  const t = useCopy(COPY);
  const [kind, setKind] = React.useState<Kind>("integer");
  const [min, setMin] = React.useState("1");
  const [max, setMax] = React.useState("100");
  const [count, setCount] = React.useState(5);
  const [decimals, setDecimals] = React.useState(2);
  const [unique, setUnique] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  const [values, setValues] = React.useState<number[]>([]);
  const [problem, setProblem] = React.useState<string | null>(null);

  const size = clamp(count, 1, 1000);

  React.useEffect(() => {
    // Deferred so the render pass finishes before the list is replaced
    const id = window.setTimeout(() => {
      const lo = Number(min);
      const hi = Number(max);
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || min.trim() === "" || max.trim() === "") {
        setValues([]);
        setProblem(t.badRange);
        return;
      }
      try {
        setValues(
          kind === "decimal"
            ? Array.from({ length: size }, () => randomDecimal(lo, hi, decimals))
            : randomIntegers(lo, hi, size, unique)
        );
        setProblem(null);
      } catch {
        setValues([]);
        setProblem(t.tooMany);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [kind, min, max, size, decimals, unique, nonce, t.badRange, t.tooMany]);

  const text = values.map((value) => formatValue(value, kind, decimals)).join("\n");
  const stats =
    values.length > 0
      ? {
          sum: values.reduce((a, b) => a + b, 0),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
        }
      : null;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.kind}
          value={kind}
          onChange={setKind}
          options={[
            { value: "integer", label: t.integer },
            { value: "decimal", label: t.decimal },
          ]}
        />
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.min}</span>
          <Input
            value={min}
            onChange={(e) => setMin(e.target.value)}
            inputMode="decimal"
            aria-label={t.min}
            size="xs"
            className="w-24 font-mono"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.max}</span>
          <Input
            value={max}
            onChange={(e) => setMax(e.target.value)}
            inputMode="decimal"
            aria-label={t.max}
            size="xs"
            className="w-24 font-mono"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground-muted">{t.count}</span>
          <Input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(clamp(Number(e.target.value) || 1, 1, 1000))}
            aria-label={t.count}
            size="xs"
            className="w-16 text-center font-mono"
          />
        </label>
        {kind === "decimal" && (
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground-muted">{t.decimals}</span>
            <Input
              type="number"
              min={0}
              max={12}
              value={decimals}
              onChange={(e) => setDecimals(clamp(Number(e.target.value) || 0, 0, 12))}
              aria-label={t.decimals}
              size="xs"
              className="w-14 text-center font-mono"
            />
          </label>
        )}
        {kind === "integer" && <Toggle checked={unique} onChange={setUnique} label={t.unique} />}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            size="xs"
            onClick={() => setNonce((n) => n + 1)}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.generate}
          </Button>
          <CopyButton value={text} label={t.copyAll} />
        </div>
      </OptionBar>

      {problem && <WarningNote>{problem}</WarningNote>}

      {values.length > 0 && (
        <>
          {stats && values.length > 1 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-foreground-subtle">
              <span className="text-foreground-muted">{t.countLabel(values.length)}</span>
              <span>
                {t.smallest}: {formatValue(stats.min, kind, decimals)}
              </span>
              <span>
                {t.largest}: {formatValue(stats.max, kind, decimals)}
              </span>
              <span>
                {t.sum}: {formatValue(stats.sum, kind, decimals)}
              </span>
              <span>
                {t.mean}: {stats.mean.toFixed(Math.max(decimals, 2))}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {values.map((value, index) => (
              <div
                key={`${index}-${value}`}
                className={cn(
                  "group flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2"
                )}
              >
                <span className="w-5 shrink-0 font-mono text-[10px] text-foreground-faint">
                  {index + 1}
                </span>
                <code className="min-w-0 flex-1 break-all font-mono text-[13px] text-foreground">
                  {formatValue(value, kind, decimals)}
                </code>
                <CopyButton
                  value={formatValue(value, kind, decimals)}
                  size="icon-xs"
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                />
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
