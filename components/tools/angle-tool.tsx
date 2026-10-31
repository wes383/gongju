"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/tool-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopy, useLocale } from "@/components/locale-provider";
import { convert, convertAll, formatNumber, getCategory, trigOf } from "@/lib/units";

const COPY = {
  zh: {
    value: "数值",
    unit: "单位",
    all: "全部单位",
    trig: "三角函数",
    trigNote: "正弦、余弦、正切按换算后的角度计算；90° + k·180° 处正切无定义。",
    notDefined: "无定义",
    invalid: "请输入数值",
    note: "1 圈 = 360° = 2π rad；百分度（grad）把一圈分成 400 份，多用于测量与坡度。",
  },
  en: {
    value: "Value",
    unit: "Unit",
    all: "All units",
    trig: "Trigonometry",
    trigNote: "Sine, cosine and tangent use the converted angle; tangent is undefined at 90° + k·180°.",
    notDefined: "undefined",
    invalid: "Enter a number",
    note: "1 turn = 360° = 2π rad; a gradian (grad) splits a turn into 400 parts, common in surveying and slopes.",
  },
};

export function AngleTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [value, setValue] = React.useState("90");
  const [from, setFrom] = React.useState("deg");
  const category = getCategory("angle");

  const parsed = Number(value.replace(/,/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(parsed);
  const rows = valid ? convertAll("angle", parsed, from) : [];
  const degrees = valid ? convert("angle", parsed, from, "deg") : NaN;
  const trigValues = trigOf(degrees);

  // A right angle has no tangent; "—" would read as an empty cell
  const formatTrig = (value: number) =>
    !valid ? "—" : Number.isNaN(value) ? t.notDefined : formatNumber(value);

  const label = (unit: { zh: string; en: string; symbol: string }) =>
    `${unit.symbol} · ${locale === "zh" ? unit.zh : unit.en}`;

  const trig = [
    { key: "sin", label: "sin", value: trigValues.sin },
    { key: "cos", label: "cos", value: trigValues.cos },
    { key: "tan", label: "tan", value: trigValues.tan },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.value}</span>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            spellCheck={false}
            className="font-mono text-sm sm:w-40"
            size="xs"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] font-medium text-foreground-subtle">{t.unit}</span>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger size="xs" aria-label={t.unit} className="sm:max-w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {category.units.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {label(unit)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.all}
          </span>
        </header>
        <ul className="divide-y divide-border">
          {rows.map(({ unit, value: converted }) => (
            <li key={unit.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-36 shrink-0 truncate text-xs text-foreground-muted">
                {locale === "zh" ? unit.zh : unit.en}
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

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.trig}
          </span>
        </header>
        <ul className="divide-y divide-border">
          {trig.map((item) => (
            <li key={item.key} className="flex items-center gap-3 px-4 py-2">
              <span className="w-12 shrink-0 font-mono text-xs text-foreground-muted">
                {item.label}
              </span>
              <span className="min-w-0 flex-1 break-all text-right font-mono text-xs text-foreground">
                {formatTrig(item.value)}
              </span>
              {valid && Number.isFinite(item.value) && (
                <CopyButton value={formatNumber(item.value)} size="icon-xs" />
              )}
            </li>
          ))}
        </ul>
        <footer className="border-t border-border px-4 py-2 text-[11px] leading-relaxed text-foreground-subtle">
          {t.trigNote}
        </footer>
      </section>

      {!valid && <p className="text-xs text-foreground-subtle">{t.invalid}</p>}
      <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
