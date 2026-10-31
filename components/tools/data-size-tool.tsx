"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/tool-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopy, useLocale } from "@/components/locale-provider";
import { convert, formatNumber, getUnit } from "@/lib/units";

const COPY = {
  zh: {
    value: "数值",
    unit: "单位",
    bytes: "字节数",
    bits: "比特数",
    decimal: "十进制（1000 进制）",
    binary: "二进制（1024 进制）",
    invalid: "请输入数值",
    note: "硬盘厂商按 1000 进制标注容量（1 GB = 10⁹ 字节），操作系统按 1024 进制计算并显示为 GB（1 GiB = 2³⁰ 字节）。因此一块标称 500 GB 的硬盘，在系统里约显示为 465 GB —— 两者其实一样大。",
  },
  en: {
    value: "Value",
    unit: "Unit",
    bytes: "Bytes",
    bits: "Bits",
    decimal: "Decimal (powers of 1000)",
    binary: "Binary (powers of 1024)",
    invalid: "Enter a number",
    note: "Drive makers quote decimal units (1 GB = 10⁹ bytes) while operating systems count in binary but still print GB (1 GiB = 2³⁰ bytes). That is why a 500 GB drive shows up as roughly 465 GB — nothing is missing.",
  },
};

const DECIMAL = ["byte", "kb", "mb", "gb", "tb", "pb"];
const BINARY = ["kib", "mib", "gib", "tib", "pib"];
const INPUT_UNITS = ["bit", "byte", "kb", "mb", "gb", "tb", "kib", "mib", "gib", "tib"];

export function DataSizeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [value, setValue] = React.useState("1");
  const [from, setFrom] = React.useState("gb");

  const parsed = Number(value.replace(/,/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(parsed);
  const bytes = valid ? convert("data", parsed, from, "byte") : NaN;

  const label = (id: string) => {
    const unit = getUnit("data", id);
    return `${unit.symbol} · ${locale === "zh" ? unit.zh : unit.en}`;
  };

  const rows = (ids: string[]) =>
    ids.map((id) => ({
      id,
      symbol: getUnit("data", id).symbol,
      value: valid ? convert("data", parsed, from, id) : NaN,
    }));

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
              {INPUT_UNITS.map((id) => (
                <SelectItem key={id} value={id}>
                  {label(id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-24 shrink-0 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              {t.bytes}
            </span>
            <span className="min-w-0 flex-1 break-all font-mono text-sm text-foreground">
              {valid ? formatNumber(bytes, 12) : "—"}
            </span>
            {valid && <CopyButton value={formatNumber(bytes, 12)} size="icon-xs" />}
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-24 shrink-0 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              {t.bits}
            </span>
            <span className="min-w-0 flex-1 break-all font-mono text-sm text-foreground-muted">
              {valid ? formatNumber(bytes * 8, 12) : "—"}
            </span>
          </div>
        </div>
      </section>

      {[t.decimal, t.binary].map((title, index) => (
        <section key={title} className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-10 items-center border-b border-border px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {title}
            </span>
          </header>
          <ul className="divide-y divide-border">
            {rows(index === 0 ? DECIMAL : BINARY).map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-4 py-2">
                <span className="w-10 shrink-0 font-mono text-[11px] text-foreground-subtle">
                  {row.symbol}
                </span>
                <span className="min-w-0 flex-1 break-all text-right font-mono text-xs text-foreground">
                  {valid ? formatNumber(row.value) : "—"}
                </span>
                <CopyButton value={formatNumber(row.value)} size="icon-xs" />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {!valid && <p className="text-xs text-foreground-subtle">{t.invalid}</p>}
      <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
