"use client";

import * as React from "react";
import { ArrowLeftRight } from "lucide-react";
import { diffDates, toDatetimeLocalValue } from "@/lib/datetime";
import { useCopy, useLocale } from "@/components/locale-provider";
import { OptionBar } from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    from: "起始时间",
    to: "结束时间",
    swap: "交换",
    now: "结束设为现在",
    totalDays: "总天数",
    totalHours: "总小时",
    totalMinutes: "总分钟",
    workdays: "工作日",
    calendar: "按日历",
    years: "年",
    months: "月",
    days: "天",
    earlier: "结束时间早于起始时间，结果取绝对值",
    empty: "选择两个时间后开始计算",
    note: "工作日按周一到周五计算，不含法定节假日；日历拆分按实际月份长度计算。",
  },
  en: {
    from: "Start",
    to: "End",
    swap: "Swap",
    now: "Set end to now",
    totalDays: "Total days",
    totalHours: "Total hours",
    totalMinutes: "Total minutes",
    workdays: "Workdays",
    calendar: "Calendar",
    years: "y",
    months: "m",
    days: "d",
    earlier: "The end is earlier than the start, values are absolute",
    empty: "Pick two times to compare",
    note: "Workdays count Monday to Friday and ignore public holidays; the calendar breakdown uses real month lengths.",
  },
};

export function DateDiffTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setFrom(toDatetimeLocalValue(new Date()));
      setTo(toDatetimeLocalValue(new Date(Date.now() + 7 * 86_400_000)));
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const a = React.useMemo(() => {
    const date = new Date(from);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [from]);

  const b = React.useMemo(() => {
    const date = new Date(to);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [to]);

  const diff = React.useMemo(() => (a && b ? diffDates(a, b) : null), [a, b]);
  const reversed = a !== null && b !== null && b.getTime() < a.getTime();

  const cards = diff
    ? [
        { label: t.totalDays, value: diff.totalDays.toLocaleString() },
        { label: t.totalHours, value: diff.totalHours.toLocaleString() },
        { label: t.totalMinutes, value: diff.totalMinutes.toLocaleString() },
        { label: t.workdays, value: diff.workdays.toLocaleString() },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.from}</span>
        <Input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label={t.from}
          className="w-60 font-mono text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          className="gap-1.5"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          {t.swap}
        </Button>
        <span className="text-xs font-medium text-foreground-muted">{t.to}</span>
        <Input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label={t.to}
          className="w-60 font-mono text-sm"
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => setTo(toDatetimeLocalValue(new Date()))}
          className="ml-auto"
        >
          {t.now}
        </Button>
      </OptionBar>

      {diff ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card) => (
              <div
                key={card.label}
                className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <span className="text-[11px] leading-tight text-foreground-subtle">
                  {card.label}
                </span>
                <span className="font-display text-xl font-semibold tabular-nums text-foreground">
                  {card.value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-baseline gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <span className="text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.calendar}
            </span>
            <span className="font-display text-lg font-semibold tabular-nums text-foreground">
              {diff.years} {t.years} {diff.months} {t.months} {diff.days} {t.days}
            </span>
            <span className="ml-auto text-xs text-foreground-muted">
              {a?.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              →{" "}
              {b?.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>

          {reversed && <p className="text-xs text-orange-fg">{t.earlier}</p>}
        </>
      ) : (
        <p className="py-12 text-center text-sm text-foreground-subtle">{t.empty}</p>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
