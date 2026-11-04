"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { batteryLife, splitDuration } from "@/lib/circuit";
import { formatNumber } from "@/lib/units";

const COPY = {
  zh: {
    capacity: "电池容量",
    voltage: "标称电压",
    mode: "负载方式",
    byCurrent: "按电流",
    byPower: "按功率",
    loadCurrent: "平均电流",
    loadPower: "平均功率",
    usable: "可用比例",
    usableHint: "厂商标注的容量通常测到 2.5–3.0 V，实际可用约为 80%",
    result: "续航",
    empty: "填入容量与负载，这里给出续航时间",
    hours: "小时",
    days: "天",
    energy: "标称能量",
    usableCapacity: "可用容量",
    avgPower: "平均功率",
    perHour: "每小时耗能",
    note: "续航 = 可用容量 ÷ 平均电流，按恒流估算。温度、放电倍率、电压转换损耗都会让实际时间变短：升压或降压模块按效率再打个折（常见 85%–92%）。",
  },
  en: {
    capacity: "Capacity",
    voltage: "Nominal voltage",
    mode: "Load",
    byCurrent: "By current",
    byPower: "By power",
    loadCurrent: "Average current",
    loadPower: "Average power",
    usable: "Usable share",
    usableHint: "Rated capacity is measured down to 2.5–3.0 V, so roughly 80% is usable in practice",
    result: "Runtime",
    empty: "Enter a capacity and a load to see the runtime",
    hours: "hours",
    days: "days",
    energy: "Nominal energy",
    usableCapacity: "Usable capacity",
    avgPower: "Average power",
    perHour: "Energy per hour",
    note: "Runtime = usable capacity ÷ average current, assuming a constant draw. Temperature, discharge rate and converter losses all shorten it: a boost or buck stage typically costs another 8%–15%.",
  },
};

function durationText(hours: number, zh: boolean): string {
  const { days, hours: h, minutes } = splitDuration(hours);
  if (days > 0) {
    return zh ? `${days} 天 ${h} 小时` : `${days} d ${h} h`;
  }
  if (h > 0) {
    return zh ? `${h} 小时 ${minutes} 分` : `${h} h ${minutes} min`;
  }
  return zh ? `${minutes} 分钟` : `${minutes} min`;
}

export function BatteryLifeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const zh = locale === "zh";
  const [capacity, setCapacity] = React.useState("2000");
  const [voltage, setVoltage] = React.useState("3.7");
  const [mode, setMode] = React.useState<"current" | "power">("current");
  const [load, setLoad] = React.useState("500");
  const [usable, setUsable] = React.useState("80");

  const solved = React.useMemo(
    () =>
      safe(() =>
        batteryLife({
          capacityMah: Number(capacity),
          voltage: Number(voltage),
          loadMa: mode === "current" ? Number(load) : null,
          loadW: mode === "power" ? Number(load) : null,
          usable: Number(usable) / 100,
        })
      ),
    [capacity, voltage, load, mode, usable]
  );

  const result = solved.value;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.capacity}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-9 shrink-0 font-mono text-[11px] text-foreground-faint">mAh</span>
              </span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.voltage}</span>
              <span className="flex items-center gap-1.5">
                <Input
                  value={voltage}
                  onChange={(event) => setVoltage(event.target.value)}
                  inputMode="decimal"
                  className="w-full font-mono text-sm"
                  size="xs"
                />
                <span className="w-9 shrink-0 font-mono text-[11px] text-foreground-faint">V</span>
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Segmented
              ariaLabel={t.mode}
              value={mode}
              onChange={(next) => {
                setMode(next);
                setLoad(next === "current" ? "500" : "1.85");
              }}
              options={[
                { value: "current", label: t.byCurrent },
                { value: "power", label: t.byPower },
              ]}
            />
            <label className="flex flex-1 items-center gap-2">
              <span className="shrink-0 text-[11px] font-medium text-foreground-subtle">
                {mode === "current" ? t.loadCurrent : t.loadPower}
              </span>
              <Input
                value={load}
                onChange={(event) => setLoad(event.target.value)}
                inputMode="decimal"
                className="w-28 font-mono text-sm"
                size="xs"
              />
              <span className="font-mono text-[11px] text-foreground-faint">
                {mode === "current" ? "mA" : "W"}
              </span>
            </label>
          </div>

          <label className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] font-medium text-foreground-subtle">
              {t.usable}
            </span>
            <Input
              value={usable}
              onChange={(event) => setUsable(event.target.value)}
              inputMode="numeric"
              className="w-20 font-mono text-sm"
              size="xs"
            />
            <span className="font-mono text-[11px] text-foreground-faint">%</span>
            <span className="text-[11px] text-foreground-faint">{t.usableHint}</span>
          </label>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={
              <span>{result ? `${formatNumber(result.hours, 4)} ${t.hours}` : "—"}</span>
            }
          >
            {!result ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {durationText(result.hours, zh)}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {formatNumber(result.hours, 4)} {t.hours} · {formatNumber(result.days, 3)}{" "}
                      {t.days}
                    </div>
                  </div>
                  <CopyButton value={formatNumber(result.hours, 4)} size="icon-xs" />
                </div>
                <dl className="divide-y divide-border border-t border-border text-[12px]">
                  {[
                    { label: t.energy, value: `${formatNumber(result.wh, 4)} Wh` },
                    { label: t.usableCapacity, value: `${formatNumber(result.usableMah, 5)} mAh` },
                    { label: t.avgPower, value: `${formatNumber(result.averagePower, 4)} W` },
                    {
                      label: t.perHour,
                      value: `${formatNumber(result.averagePower / 1000, 4)} kWh`,
                    },
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

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
