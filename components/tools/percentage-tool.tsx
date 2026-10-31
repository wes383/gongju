"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  applyPercent,
  percentChange,
  percentOf,
  percentValue,
} from "@/lib/calc";
import { formatReadable } from "@/lib/units";

type Mode = "ratio" | "share" | "change" | "adjust";

const COPY = {
  zh: {
    mode: "计算方式",
    modes: {
      ratio: "占比",
      share: "百分比值",
      change: "变化率",
      adjust: "增减",
    } as Record<Mode, string>,
    part: "部分值",
    whole: "总量",
    rate: "百分比 (%)",
    base: "基数",
    from: "原值",
    to: "新值",
    increase: "增加",
    decrease: "减少",
    result: "结果",
    formula: "公式",
    difference: "差值",
    of: "的",
    invalid: "请填写有效数字",
    divideByZero: "总量为 0，无法计算占比",
    zeroBase: "原值为 0，无法计算变化率",
    formulas: {
      ratio: "部分值 ÷ 总量 × 100%",
      share: "基数 × 百分比 ÷ 100",
      change: "(新值 − 原值) ÷ |原值| × 100%",
      adjust: "原值 × (1 ± 百分比 ÷ 100)",
    } as Record<Mode, string>,
    note: "变化率以原值的绝对值作分母，因此从负数增长时方向仍然正确。",
  },
  en: {
    mode: "Mode",
    modes: {
      ratio: "Share",
      share: "Percent of",
      change: "Change",
      adjust: "Increase / decrease",
    } as Record<Mode, string>,
    part: "Part",
    whole: "Whole",
    rate: "Percent (%)",
    base: "Base",
    from: "From",
    to: "To",
    increase: "Increase",
    decrease: "Decrease",
    result: "Result",
    formula: "Formula",
    difference: "Difference",
    of: "of",
    invalid: "Enter valid numbers",
    divideByZero: "The whole is 0, so the share is undefined",
    zeroBase: "The original value is 0, so the change rate is undefined",
    formulas: {
      ratio: "part ÷ whole × 100%",
      share: "base × percent ÷ 100",
      change: "(new − old) ÷ |old| × 100%",
      adjust: "old × (1 ± percent ÷ 100)",
    } as Record<Mode, string>,
    note: "The change rate divides by the absolute value of the old figure, so the sign stays correct when starting from a negative number.",
  },
};

export function PercentageTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<Mode>("ratio");
  const [a, setA] = React.useState("25");
  const [b, setB] = React.useState("200");
  const [direction, setDirection] = React.useState<"increase" | "decrease">("increase");

  const x = Number(a.replace(/,/g, ""));
  const y = Number(b.replace(/,/g, ""));
  const filled = a.trim() !== "" && b.trim() !== "" && Number.isFinite(x) && Number.isFinite(y);

  const result = (() => {
    if (!filled) return NaN;
    if (mode === "ratio") return percentOf(x, y);
    if (mode === "share") return percentValue(y, x);
    if (mode === "change") return percentChange(x, y);
    return applyPercent(x, y, direction);
  })();

  // A ratio needs a non-zero whole, and the change rate a non-zero start
  const undefinedFor = mode === "ratio" ? y === 0 : mode === "change" ? x === 0 : false;
  const showResult = filled && !undefinedFor && Number.isFinite(result);

  const suffix = mode === "ratio" || mode === "change" ? "%" : "";
  const valueText = showResult
    ? `${mode === "change" && result > 0 ? "+" : ""}${formatReadable(result, 8, locale)}${suffix}`
    : "—";

  const difference = filled && mode === "change" ? y - x : NaN;

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        ariaLabel={t.mode}
        value={mode}
        onChange={setMode}
        options={[
          { value: "ratio", label: t.modes.ratio },
          { value: "share", label: t.modes.share },
          { value: "change", label: t.modes.change },
          { value: "adjust", label: t.modes.adjust },
        ]}
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
        {mode === "ratio" && (
          <>
            <Field label={t.part} value={a} onChange={setA} />
            <span className="pb-2 text-sm text-foreground-subtle">÷</span>
            <Field label={t.whole} value={b} onChange={setB} />
          </>
        )}

        {mode === "share" && (
          <>
            <Field label={t.rate} value={a} onChange={setA} suffix="%" />
            <span className="pb-2 text-sm text-foreground-subtle">×</span>
            <Field label={t.base} value={b} onChange={setB} />
          </>
        )}

        {mode === "change" && (
          <>
            <Field label={t.from} value={a} onChange={setA} />
            <span className="pb-2 text-sm text-foreground-subtle">→</span>
            <Field label={t.to} value={b} onChange={setB} />
          </>
        )}

        {mode === "adjust" && (
          <>
            <Field label={t.from} value={a} onChange={setA} />
            <div className="pb-1">
              <Segmented
                ariaLabel={t.mode}
                value={direction}
                onChange={setDirection}
                options={[
                  { value: "increase", label: t.increase },
                  { value: "decrease", label: t.decrease },
                ]}
              />
            </div>
            <Field label={t.rate} value={b} onChange={setB} suffix="%" />
          </>
        )}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.result}
          </span>
          {showResult && (
            <div className="ml-auto">
              <CopyButton value={valueText} size="icon-xs" />
            </div>
          )}
        </header>
        <p className="flex flex-wrap items-baseline gap-3 px-4 py-4">
          <span className="break-all font-mono text-2xl font-medium text-foreground">
            {valueText}
          </span>
          {mode === "ratio" && showResult && (
            <span className="text-xs text-foreground-muted">
              {a} {t.of} {b}
            </span>
          )}
          {mode === "change" && Number.isFinite(difference) && (
            <span className="text-xs text-foreground-muted">
              {t.difference} {difference > 0 ? "+" : ""}
              {formatReadable(difference, 8, locale)}
            </span>
          )}
          {mode === "share" && showResult && (
            <span className="text-xs text-foreground-muted">
              {a}% {t.of} {b}
            </span>
          )}
          {undefinedFor && (
            <span className="text-xs text-orange-fg">
              {mode === "ratio" ? t.divideByZero : t.zeroBase}
            </span>
          )}
          {!filled && <span className="text-xs text-foreground-subtle">{t.invalid}</span>}
        </p>
        <footer className="border-t border-border px-4 py-2 text-[11px] text-foreground-subtle">
          {t.formula} · <code className="font-mono">{t.formulas[mode]}</code>
        </footer>
      </section>

      <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-foreground-subtle">{label}</span>
      <span className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          spellCheck={false}
          className="w-28 font-mono text-sm"
        />
        {suffix && <span className="text-xs text-foreground-subtle">{suffix}</span>}
      </span>
    </label>
  );
}
