"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import {
  COMMON_TIMEZONES,
  formatInZone,
  offsetLabel,
  toDatetimeLocalValue,
  weekdayInZone,
  zoneOffsetMinutes,
  zoneParts,
  zonedTimeToDate,
} from "@/lib/datetime";
import { useCopy, useLocale } from "@/components/locale-provider";
import { CopyButton } from "@/components/tools/tool-ui";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    moment: "时刻",
    sourceZone: "源时区",
    targetZone: "目标时区",
    now: "现在",
    common: "常用时区对比",
    sameDay: "同日",
    nextDay: "次日",
    prevDay: "前一日",
    local: "本地时区",
    invalid: "时间格式不正确",
    searchZone: "搜索时区…",
    noZone: "没有匹配的时区",
  },
  en: {
    moment: "Moment",
    sourceZone: "Source zone",
    targetZone: "Target zone",
    now: "Now",
    common: "Common zones",
    sameDay: "same day",
    nextDay: "next day",
    prevDay: "previous day",
    local: "Local zone",
    invalid: "Invalid date/time",
    searchZone: "Search time zones…",
    noZone: "No matching zone",
  },
};

// Resolved on the client: the server may run in a different zone, which would
// make the first render disagree with the browser.
const FALLBACK_ZONE = "UTC";

function dayDelta(from: Date, fromZone: string, to: Date, toZone: string): number {
  const a = zoneParts(from, fromZone);
  const b = zoneParts(to, toZone);
  const aUtc = Date.UTC(a.year, a.month - 1, a.day);
  const bUtc = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((bUtc - aUtc) / 86_400_000);
}

export function TimezoneTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [localZone, setLocalZone] = React.useState(FALLBACK_ZONE);
  const [sourceZone, setSourceZone] = React.useState(FALLBACK_ZONE);
  const [targetZone, setTargetZone] = React.useState("America/New_York");
  const [value, setValue] = React.useState("");
  // The full IANA list differs between Node and the browser, so start from the
  // shared subset and upgrade after mount to keep hydration quiet.
  const [allZones, setAllZones] = React.useState<string[]>(COMMON_TIMEZONES);

  // Default to "now" on the client only, otherwise SSR and client disagree
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setLocalZone(zone);
      setSourceZone(zone);
      setValue(toDatetimeLocalValue(new Date(), zone));
      try {
        setAllZones(Intl.supportedValuesOf("timeZone"));
      } catch {
        /* keep the common list */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const instant = React.useMemo(() => {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
    if (!match) return null;
    const [, y, mo, d, h, mi] = match;
    const date = zonedTimeToDate(Number(y), Number(mo), Number(d), Number(h), Number(mi), sourceZone);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [value, sourceZone]);

  const zones = React.useMemo(() => {
    const list = new Set<string>([targetZone, localZone, ...COMMON_TIMEZONES]);
    return [...list];
  }, [targetZone, localZone]);

  const zoneOptions = React.useMemo(
    () =>
      allZones.map((zone) => ({
        value: zone,
        label: zone,
        description: instant ? offsetLabel(zoneOffsetMinutes(instant, zone)) : undefined,
        keywords: zone.split("/").concat(zone.replace(/_/g, " ")),
      })),
    [allZones, instant]
  );

  const fillNow = () => setValue(toDatetimeLocalValue(new Date(), sourceZone));

  const deltaLabel = (delta: number) =>
    delta > 0 ? t.nextDay : delta < 0 ? t.prevDay : t.sameDay;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center">
        <Input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={t.moment}
          className="font-mono text-sm sm:w-60"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-subtle">{t.sourceZone}</span>
          <Combobox
            options={zoneOptions}
            value={sourceZone}
            onValueChange={setSourceZone}
            placeholder={t.sourceZone}
            searchPlaceholder={t.searchZone}
            emptyText={t.noZone}
            aria-label={t.sourceZone}
            size="sm"
            className="w-52"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={fillNow} className="gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {t.now}
        </Button>
      </div>

      {!instant ? (
        <p className="py-12 text-center text-sm text-foreground-subtle">{t.invalid}</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-foreground-subtle">{t.targetZone}</span>
              <Combobox
                options={zoneOptions}
                value={targetZone}
                onValueChange={setTargetZone}
                placeholder={t.targetZone}
                searchPlaceholder={t.searchZone}
                emptyText={t.noZone}
                aria-label={t.targetZone}
                size="sm"
                className="w-52"
              />
              <span className="ml-auto font-mono text-[11px] text-foreground-faint">
                {offsetLabel(zoneOffsetMinutes(instant, targetZone))}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
                {formatInZone(instant, targetZone)}
              </span>
              <span className="text-sm text-foreground-muted">
                {weekdayInZone(instant, targetZone, locale)}
              </span>
              <CopyButton value={formatInZone(instant, targetZone)} size="icon-xs" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-10 items-center border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.common}
              </span>
            </header>
            <ul className="divide-y divide-border">
              {zones.map((zone) => {
                const delta = dayDelta(instant, sourceZone, instant, zone);
                return (
                  <li key={zone} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
                    <span className="w-44 shrink-0 truncate text-xs text-foreground-muted">
                      {zone}
                      {zone === localZone && (
                        <span className="ml-1 text-[10px] text-foreground-faint">({t.local})</span>
                      )}
                    </span>
                    <span className="font-mono text-[12.5px] tabular-nums text-foreground">
                      {formatInZone(instant, zone)}
                    </span>
                    <span className="font-mono text-[11px] text-foreground-faint">
                      {offsetLabel(zoneOffsetMinutes(instant, zone))}
                    </span>
                    {delta !== 0 && (
                      <span className="rounded-full bg-hover-bg px-2 py-0.5 text-[10px] text-foreground-muted">
                        {deltaLabel(delta)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
