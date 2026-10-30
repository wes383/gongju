"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import {
  formatInZone,
  parseInstant,
  relativeTime,
  timestampOf,
  weekdayInZone,
  type TimestampUnit,
} from "@/lib/datetime";
import { useCopy, useLocale } from "@/components/locale-provider";
import { CopyButton } from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    inputLabel: "时间戳或日期",
    placeholder: "粘贴时间戳（秒 / 毫秒 / 微秒 / 纳秒）或日期，如 2026-10-30 18:00",
    now: "填入当前时间",
    empty: "输入时间戳或日期后显示转换结果",
    invalid: "无法识别，请检查输入内容",
    detected: "识别为",
    units: { s: "秒", ms: "毫秒", us: "微秒", ns: "纳秒" },
    seconds: "秒级时间戳",
    milliseconds: "毫秒级时间戳",
    iso: "ISO 8601",
    local: "本地时间",
    utc: "UTC",
    relative: "相对现在",
    current: "当前时间戳",
  },
  en: {
    inputLabel: "Timestamp or date",
    placeholder: "Paste a timestamp (s / ms / µs / ns) or a date like 2026-10-30 18:00",
    now: "Use current time",
    empty: "Conversions appear once you type something",
    invalid: "Unrecognized input, please check it",
    detected: "Detected",
    units: { s: "seconds", ms: "milliseconds", us: "microseconds", ns: "nanoseconds" },
    seconds: "Timestamp (s)",
    milliseconds: "Timestamp (ms)",
    iso: "ISO 8601",
    local: "Local time",
    utc: "UTC",
    relative: "Relative to now",
    current: "Current timestamp",
  },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
      <span className="w-36 shrink-0 text-xs text-foreground-subtle">{label}</span>
      <code className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-foreground">
        {value}
      </code>
      <CopyButton value={value} size="icon-xs" />
    </div>
  );
}

export function TimestampTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState("");
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(interval);
    };
  }, []);

  const parsed = React.useMemo(() => (input.trim() ? parseInstant(input) : null), [input]);
  const invalid = input.trim() !== "" && parsed === null;

  const rows = React.useMemo(() => {
    if (!parsed) return [];
    const date = parsed.date;
    const iso = date.toISOString();
    return [
      { label: t.seconds, value: String(timestampOf(date, "s")) },
      { label: t.milliseconds, value: String(timestampOf(date, "ms")) },
      { label: t.iso, value: iso },
      { label: t.local, value: `${formatInZone(date, Intl.DateTimeFormat().resolvedOptions().timeZone)} ${weekdayInZone(date, Intl.DateTimeFormat().resolvedOptions().timeZone, locale)}` },
      { label: t.utc, value: formatInZone(date, "UTC") },
      ...(now ? [{ label: t.relative, value: relativeTime(date, now, locale) }] : []),
    ];
  }, [parsed, now, locale, t]);

  const fillNow = () => {
    if (!now) return;
    setInput(String(timestampOf(now, "s")));
  };

  const unitLabel = parsed?.unit ? t.units[parsed.unit as TimestampUnit] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.inputLabel}
          spellCheck={false}
          className="font-mono text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={fillNow} className="shrink-0 gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {t.now}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-subtle">
        {now && (
          <span>
            {t.current}:{" "}
            <code className="font-mono text-foreground">{timestampOf(now, "s")}</code>
          </span>
        )}
        {unitLabel && (
          <span>
            {t.detected}: <span className="text-foreground">{unitLabel}</span>
          </span>
        )}
        {invalid && <span className="text-red-fg">{t.invalid}</span>}
      </div>

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {rows.map((row) => (
            <Row key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-foreground-subtle">{t.empty}</p>
      )}
    </div>
  );
}
