"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CopyButton, ErrorNote, Pane } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import {
  RACE_DISTANCES,
  formatDuration,
  formatPace,
  paceOf,
  riegel,
  splits,
  timeOf,
  type Pace,
} from "@/lib/running";

const COPY = {
  zh: {
    distance: "距离",
    custom: "自定义",
    meters: "米",
    time: "用时",
    hours: "时",
    minutes: "分",
    seconds: "秒",
    result: "配速",
    empty: "填入距离与用时，这里给出配速",
    kmh: "km/h",
    mph: "mph",
    perKm: "/公里",
    perMi: "/英里",
    equalTitle: "同配速跑完各距离",
    riegelTitle: "按 Riegel 模型预测",
    splits: "分段配速",
    splitIndex: "段",
    splitPace: "本段",
    cumulative: "累计",
    note: "配速 = 用时 ÷ 距离。等配速一列是「保持这个配速」的理想值；Riegel 列用 T₂ = T₁ × (D₂/D₁)^1.06 折算，长距离会更慢，也更接近真实成绩——跨度超过一倍时误差会明显变大。",
  },
  en: {
    distance: "Distance",
    custom: "Custom",
    meters: "m",
    time: "Time",
    hours: "h",
    minutes: "m",
    seconds: "s",
    result: "Pace",
    empty: "Enter a distance and a time to see the pace",
    kmh: "km/h",
    mph: "mph",
    perKm: "/km",
    perMi: "/mi",
    equalTitle: "At this pace",
    riegelTitle: "Riegel prediction",
    splits: "Splits",
    splitIndex: "Split",
    splitPace: "Split",
    cumulative: "Elapsed",
    note: "Pace is time divided by distance. The even-pace column assumes you hold it; the Riegel column scales it with T₂ = T₁ × (D₂/D₁)^1.06, which slows you down over longer races and lands closer to real results — expect bigger errors once the distances differ by more than 2×.",
  },
};

const CUSTOM = "custom";

export function PaceTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [distanceId, setDistanceId] = React.useState("10k");
  const [customMeters, setCustomMeters] = React.useState("8000");
  const [hours, setHours] = React.useState("0");
  const [minutes, setMinutes] = React.useState("50");
  const [seconds, setSeconds] = React.useState("0");

  const meters =
    distanceId === CUSTOM
      ? Number(customMeters)
      : RACE_DISTANCES.find((race) => race.id === distanceId)?.meters ?? 0;
  const total = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);

  const solved = React.useMemo(() => safe(() => paceOf(meters, total)), [meters, total]);
  const pace: Pace | null = solved.value;

  const table = React.useMemo(() => {
    if (!pace) return [];
    return RACE_DISTANCES.map((race) => {
      const even = timeOf(race.meters, pace.secondsPerKm);
      const predicted = safe(() => riegel(total, meters, race.meters)).value;
      return { id: race.id, name: race.name, meters: race.meters, even, predicted };
    });
  }, [pace, total, meters]);

  const splitRows = React.useMemo(() => {
    if (!pace) return [];
    return safe(() => splits(total, meters, 1000)).value ?? [];
  }, [pace, total, meters]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-foreground-subtle">{t.distance}</span>
              <Select value={distanceId} onValueChange={setDistanceId}>
                <SelectTrigger size="xs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RACE_DISTANCES.map((race) => (
                    <SelectItem key={race.id} value={race.id}>
                      {race.name[locale]}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>{t.custom}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            {distanceId === CUSTOM && (
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-foreground-subtle">{t.meters}</span>
                <span className="flex items-center gap-1.5">
                  <Input
                    value={customMeters}
                    onChange={(event) => setCustomMeters(event.target.value)}
                    inputMode="numeric"
                    className="w-full font-mono text-sm"
                    size="xs"
                  />
                  <span className="shrink-0 font-mono text-[11px] text-foreground-faint">
                    {t.meters}
                  </span>
                </span>
              </label>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-foreground-subtle">{t.time}</span>
            <div className="flex items-center gap-2">
              {[
                { value: hours, set: setHours, unit: t.hours, width: "w-16" },
                { value: minutes, set: setMinutes, unit: t.minutes, width: "w-16" },
                { value: seconds, set: setSeconds, unit: t.seconds, width: "w-16" },
              ].map((field) => (
                <span key={field.unit} className="flex items-center gap-1">
                  <Input
                    value={field.value}
                    onChange={(event) => field.set(event.target.value)}
                    inputMode="numeric"
                    aria-label={field.unit}
                    className={`${field.width} font-mono text-sm`}
                    size="xs"
                  />
                  <span className="font-mono text-[11px] text-foreground-faint">{field.unit}</span>
                </span>
              ))}
            </div>
          </div>

          {solved.error && <ErrorNote>{errorText(solved.error, locale)}</ErrorNote>}
        </div>

        <div className="min-w-0 self-start overflow-hidden rounded-lg border border-border bg-surface">
          <Pane
            label={t.result}
            footer={<span>{pace ? `1 km ${formatPace(pace.secondsPerKm)}` : "—"}</span>}
          >
            {!pace ? (
              <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-start gap-2 border-b border-border px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-2xl leading-tight text-foreground">
                      {formatPace(pace.secondsPerKm)}
                      <span className="ml-1 text-[13px] text-foreground-faint">{t.perKm}</span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-foreground-faint">
                      {formatPace(pace.secondsPerMile)} {t.perMi} · {pace.kmh.toFixed(2)} {t.kmh} ·{" "}
                      {pace.mph.toFixed(2)} {t.mph}
                    </div>
                  </div>
                  <CopyButton value={formatPace(pace.secondsPerKm)} size="icon-xs" />
                </div>

                <div className="px-3 py-2 text-[11px] text-foreground-subtle">{t.equalTitle}</div>
                <dl className="divide-y divide-border text-[12px]">
                  {table.map((row) => (
                    <div key={row.id} className="flex items-center gap-3 px-3 py-1.5">
                      <dt className="min-w-0 truncate text-foreground-subtle">{row.name[locale]}</dt>
                      <dd className="ml-auto shrink-0 font-mono text-foreground">
                        {formatDuration(row.even)}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="border-t border-border px-3 py-2 text-[11px] text-foreground-subtle">
                  {t.riegelTitle}
                </div>
                <dl className="divide-y divide-border text-[12px]">
                  {table.map((row) => (
                    <div key={row.id} className="flex items-center gap-3 px-3 py-1.5">
                      <dt className="min-w-0 truncate text-foreground-subtle">{row.name[locale]}</dt>
                      <dd className="ml-auto shrink-0 font-mono text-foreground">
                        {row.predicted === null ? "—" : formatDuration(row.predicted)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Pane>
        </div>
      </div>

      {splitRows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-foreground-muted">
            {t.splits}
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface text-[11px] text-foreground-subtle">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">{t.splitIndex}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{t.splitPace}</th>
                  <th className="px-3 py-1.5 text-right font-medium">{t.cumulative}</th>
                </tr>
              </thead>
              <tbody>
                {splitRows.map((split) => (
                  <tr key={split.index} className="border-t border-border">
                    <td className="px-3 py-1.5 text-foreground-subtle">
                      {split.meters === 1000 ? split.index : `${split.index} · ${split.meters} m`}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-foreground">
                      {formatDuration(split.seconds)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-foreground-muted">
                      {formatDuration(split.cumulative)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
