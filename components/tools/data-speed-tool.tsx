"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton, OptionBar, OptionField } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { SPEED_UNITS, convertSpeed, getSpeedUnit, transferSeconds } from "@/lib/data-speed";
import { formatReadable } from "@/lib/units";

const COPY = {
  zh: {
    speed: "速度",
    unit: "单位",
    results: "换算结果",
    oneGigabyte: "下载 1 GB 约需",
    note: "运营商按 bit 计费（100 Mbit/s），下载工具按 byte 显示（约 12.5 MB/s），两者相差 8 倍。这里统一用 1000 进制，与宽带标称值一致；若按 1024 进制算，100 Mbit/s 约等于 11.9 MiB/s。",
    invalid: "请输入数值",
  },
  en: {
    speed: "Speed",
    unit: "Unit",
    results: "Converted",
    oneGigabyte: "1 GB takes about",
    note: "Carriers sell bits per second (100 Mbit/s) while download managers show bytes (about 12.5 MB/s) — an 8× difference. Everything here uses decimal prefixes to match how bandwidth is advertised; with binary prefixes, 100 Mbit/s is roughly 11.9 MiB/s.",
    invalid: "Enter a number",
  },
};

const GB = 1e9;

function durationText(seconds: number, locale: string): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 1) return `${Math.round(seconds * 1000)} ${locale === "zh" ? "毫秒" : "ms"}`;
  if (seconds < 60) return `${seconds.toFixed(1)} ${locale === "zh" ? "秒" : "s"}`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes} ${locale === "zh" ? "分" : "m"} ${rest} ${locale === "zh" ? "秒" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours} ${locale === "zh" ? "小时" : "h"} ${restMinutes} ${locale === "zh" ? "分" : "m"}`;
}

export function DataSpeedTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [value, setValue] = React.useState("100");
  const [from, setFrom] = React.useState("mbps");

  const parsed = Number(value.replace(/,/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(parsed);
  const bitsPerSecond = valid ? convertSpeed(parsed, from, "bps") : NaN;
  const seconds = transferSeconds(GB, bitsPerSecond);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.speed}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            spellCheck={false}
            aria-label={t.speed}
            size="xs"
            className="font-mono text-sm sm:w-40"
          />
        </OptionField>
        <OptionField label={t.unit}>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger size="xs" aria-label={t.unit} className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_UNITS.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>
      </OptionBar>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-2.5">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.results}
          </span>
          <div className="ml-auto">
            <CopyButton
              value={
                valid
                  ? SPEED_UNITS.map(
                      (unit) =>
                        `${formatReadable(convertSpeed(parsed, from, unit.id), 8, locale)} ${unit.symbol}`
                    ).join("\n")
                  : ""
              }
            />
          </div>
        </header>

        <ul className="divide-y divide-border">
          {SPEED_UNITS.map((unit) => {
            const converted = valid ? convertSpeed(parsed, from, unit.id) : NaN;
            const highlight = unit.id === from;
            return (
              <li
                key={unit.id}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span
                  className={
                    highlight
                      ? "w-24 shrink-0 font-mono text-xs font-semibold text-accent"
                      : "w-24 shrink-0 font-mono text-xs text-foreground-subtle"
                  }
                >
                  {unit.symbol}
                </span>
                <span className="min-w-0 flex-1 break-all font-mono tabular-nums text-foreground">
                  {valid ? formatReadable(converted, 8, locale) : t.invalid}
                </span>
              </li>
            );
          })}
        </ul>

        <footer className="flex h-9 items-center gap-2 border-t border-border px-4 font-mono text-[11px] text-foreground-faint">
          <span>{t.oneGigabyte}</span>
          <span className="text-foreground-muted">
            {valid ? durationText(seconds, locale) : "—"}
          </span>
          <span className="ml-2 text-foreground-faint">· {getSpeedUnit(from).symbol}</span>
        </footer>
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
