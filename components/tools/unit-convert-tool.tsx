"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, Segmented, SwapButton } from "@/components/tools/tool-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopy, useLocale } from "@/components/locale-provider";
import {
  CONVERTER_CATEGORIES,
  convert,
  convertAll,
  formatNumber,
  formatReadable,
  getCategory,
  type UnitCategoryId,
} from "@/lib/units";

const COPY = {
  zh: {
    value: "数值",
    from: "从",
    to: "到",
    result: "换算结果",
    all: "全部单位",
    note: "换算按「先归一到基准单位、再换算到目标单位」进行；市制单位（里、尺、寸、斤、两、亩）按中国大陆现行标准取值。",
    invalid: "请输入数值",
  },
  en: {
    value: "Value",
    from: "From",
    to: "To",
    result: "Result",
    all: "All units",
    note: "Values are normalised to the category base unit and then converted; Chinese market units (li, chi, cun, jin, liang, mu) use the current mainland standards.",
    invalid: "Enter a number",
  },
};

const DEFAULTS: Record<UnitCategoryId, [string, string]> = {
  length: ["m", "ft"],
  mass: ["kg", "lb"],
  temperature: ["c", "f"],
  area: ["m2", "ft2"],
  volume: ["l", "gal"],
  speed: ["kmh", "mph"],
  pressure: ["bar", "psi"],
  energy: ["kcal", "kj"],
  power: ["kw", "hp"],
  data: ["mb", "mib"],
  angle: ["deg", "rad"],
};

export function UnitConvertTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [categoryId, setCategoryId] = React.useState<UnitCategoryId>("length");
  const [value, setValue] = React.useState("1");
  const category = getCategory(categoryId);
  const [pair, setPair] = React.useState<Record<string, [string, string]>>(() => ({ ...DEFAULTS }));

  const [from, to] = pair[categoryId] ?? DEFAULTS[categoryId];

  const selectCategory = (next: UnitCategoryId) => {
    setCategoryId(next);
    setPair((prev) => prev[next] ? prev : { ...prev, [next]: DEFAULTS[next] });
  };

  const swap = () => setPair((prev) => ({ ...prev, [categoryId]: [to, from] }));

  const parsed = Number(value.replace(/,/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(parsed);
  const result = valid ? convert(categoryId, parsed, from, to) : NaN;

  const rows = valid ? convertAll(categoryId, parsed, from) : [];
  const label = (unit: { zh: string; en: string }) => (locale === "zh" ? unit.zh : unit.en);

  const options = CONVERTER_CATEGORIES.map((id) => {
    const item = getCategory(id);
    return { value: id, label: locale === "zh" ? item.zh : item.en };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Segmented
          ariaLabel={locale === "zh" ? "换算类别" : "Category"}
          value={categoryId}
          onChange={selectCategory}
          options={options}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={t.value}
          inputMode="decimal"
          spellCheck={false}
          className="font-mono text-sm sm:w-40"
          size="xs"
        />

        <div className="flex flex-1 items-center gap-2">
          <Select value={from} onValueChange={(next) => setPair((prev) => ({ ...prev, [categoryId]: [next, to] }))}>
            <SelectTrigger size="xs" aria-label={t.from} className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {category.units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {label(unit)} ({unit.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SwapButton onClick={swap} />

          <Select value={to} onValueChange={(next) => setPair((prev) => ({ ...prev, [categoryId]: [from, next] }))}>
            <SelectTrigger size="xs" aria-label={t.to} className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {category.units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {label(unit)} ({unit.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.result}
          </span>
          {valid && (
            <div className="ml-auto">
              <CopyButton value={formatNumber(result)} size="icon-xs" />
            </div>
          )}
        </header>
        <p className="flex flex-wrap items-baseline gap-2 px-4 py-4">
          <span className="break-all font-mono text-2xl font-medium text-foreground">
            {valid ? formatReadable(result, 10, locale) : "—"}
          </span>
          <span className="font-mono text-sm text-foreground-muted">
            {category.units.find((unit) => unit.id === to)?.symbol}
          </span>
          {!valid && <span className="text-xs text-foreground-subtle">{t.invalid}</span>}
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.all}
          </span>
        </header>
        <ul className="divide-y divide-border">
          {rows.map(({ unit, value: converted }) => (
            <li key={unit.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-32 shrink-0 truncate text-xs text-foreground-muted">
                {label(unit)}
                <span className="ml-1 font-mono text-[11px] text-foreground-subtle">
                  {unit.symbol}
                </span>
              </span>
              <span className="min-w-0 flex-1 break-all text-right font-mono text-xs text-foreground">
                {formatNumber(converted)}
              </span>
              <CopyButton value={formatNumber(converted)} size="icon-xs" />
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
