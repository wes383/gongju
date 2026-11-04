"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton, ErrorNote, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe, codedError } from "@/lib/errors";
import { formatShutter, ndShutter, ndStops, ND_FILTERS, parseShutter } from "@/lib/photo";
import { formatNumber } from "@/lib/units";

const ND_NAMES: Record<string, { zh: string; en: string }> = {
  "2": { zh: "ND2（1 档）", en: "ND2 (1 stop)" },
  "4": { zh: "ND4（2 档）", en: "ND4 (2 stops)" },
  "8": { zh: "ND8（3 档）", en: "ND8 (3 stops)" },
  "16": { zh: "ND16（4 档）", en: "ND16 (4 stops)" },
  "32": { zh: "ND32（5 档）", en: "ND32 (5 stops)" },
  "64": { zh: "ND64（6 档）", en: "ND64 (6 stops)" },
  "100": { zh: "ND100（6.6 档）", en: "ND100 (6.6 stops)" },
  "400": { zh: "ND400（8.6 档）", en: "ND400 (8.6 stops)" },
  "1000": { zh: "ND1000（10 档）", en: "ND1000 (10 stops)" },
  "100000": { zh: "ND100000（16.6 档）", en: "ND100000 (16.6 stops)" },
};

const COPY = {
  zh: {
    base: "未加滤镜时的快门",
    baseHint: "可以写 1/125、0.008 或 2",
    filter: "减光镜",
    result: "加滤镜后的快门",
    stops: "减光量",
    table: "常见减光镜对照",
    empty: "填入快门速度与减光镜倍率",
    note: "每减一档，进光量减半，快门时间乘以 2。ND1000 透光 1/1000，即 10 档；长曝光时记得关掉防抖、用三脚架，并按 2 秒倒计时或快门线避免抖动。",
  },
  en: {
    base: "Shutter without the filter",
    baseHint: "1/125, 0.008 and 2 all work",
    filter: "ND filter",
    result: "Shutter with the filter",
    stops: "Light loss",
    table: "Common filters",
    empty: "Enter a shutter speed and an ND factor",
    note: "Each stop halves the light, so the shutter doubles. ND1000 passes 1/1000 of the light, i.e. 10 stops; for long exposures switch stabilisation off, use a tripod and fire with a timer or cable release.",
  },
};

export function NdFilterTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [base, setBase] = React.useState("1/125");
  const [nd, setNd] = React.useState("1000");
  const [mode, setMode] = React.useState<"factor" | "stops">("factor");
  const [customStops, setCustomStops] = React.useState("10");

  const solved = React.useMemo(
    () =>
      safe(() => {
        const seconds = parseShutter(base);
        const value = mode === "stops" ? Number(customStops) : ndStops(Number(nd));
        if (!Number.isFinite(value) || value < 0) throw codedError("photo.ndStops");
        return { seconds: ndShutter(seconds, value), stops: value };
      }),
    [base, mode, nd, customStops]
  );

  const result = solved.value;
  const baseSeconds = safe(() => parseShutter(base));

  const table = React.useMemo(() => {
    const baseValue = baseSeconds.value;
    if (!baseValue) return [];
    return ND_FILTERS.map((factor) => ({
      factor,
      stops: ndStops(factor),
      seconds: ndShutter(baseValue, ndStops(factor)),
    }));
  }, [baseSeconds.value]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.base}</span>
              <Input
                value={base}
                onChange={(event) => setBase(event.target.value)}
                className="w-32 font-mono text-sm"
                size="xs"
              />
            </label>
            <Segmented
              ariaLabel={t.filter}
              value={mode}
              onChange={setMode}
              options={[
                { value: "factor", label: "ND" },
                { value: "stops", label: t.stops },
              ]}
            />
            {mode === "factor" ? (
              <Select value={nd} onValueChange={setNd}>
                <SelectTrigger size="xs" aria-label={t.filter} className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ND_FILTERS.map((factor) => (
                    <SelectItem key={factor} value={String(factor)}>
                      {ND_NAMES[String(factor)][locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <label className="flex items-center gap-1.5">
                <Input
                  value={customStops}
                  onChange={(event) => setCustomStops(event.target.value)}
                  inputMode="decimal"
                  className="w-20 font-mono text-sm"
                  size="xs"
                />
                <span className="text-[11px] text-foreground-faint">stops</span>
              </label>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.baseHint}</p>
          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>{result ? `${formatNumber(result.stops, 2)} stops` : "—"}</span>
            }
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {formatShutter(result.seconds)}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {formatShutter(baseSeconds.value ?? 0)} → {formatShutter(result.seconds)}
                    </div>
                  </div>
                  <CopyButton value={formatNumber(result.seconds, 4)} size="icon-xs" />
                </div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  {[
                    { label: t.stops, value: `${formatNumber(result.stops, 2)} stops` },
                    { label: t.base, value: formatShutter(baseSeconds.value ?? 0) },
                    { label: t.result, value: formatShutter(result.seconds) },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3 px-3 py-2">
                      <dt className="text-foreground-subtle">{row.label}</dt>
                      <dd className="ml-auto font-mono text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Pane>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-10 items-center border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.table}
          </span>
        </header>
        <ul className="divide-y divide-border">
          {table.map((row) => {
            const active = Math.abs(row.stops - (result?.stops ?? -1)) < 0.001;
            return (
              <li
                key={row.factor}
                className={active ? "flex items-center gap-3 bg-hover-bg px-4 py-2" : "flex items-center gap-3 px-4 py-2"}
              >
                <span className="w-44 text-[12px] text-foreground-muted">
                  {ND_NAMES[String(row.factor)][locale]}
                </span>
                <span className="font-mono text-[13px] text-foreground">
                  {formatShutter(row.seconds)}
                </span>
                <span className="ml-auto font-mono text-[11px] text-foreground-faint">
                  {formatNumber(row.stops, 2)} stops
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
