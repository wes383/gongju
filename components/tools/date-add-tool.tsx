"use client";

import * as React from "react";
import { addToDate, diffDates, toDatetimeLocalValue, type DateUnit } from "@/lib/datetime";
import { useCopy, useLocale } from "@/components/locale-provider";
import { CopyButton, OptionBar, Segmented } from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    base: "起始时间",
    amount: "数量",
    result: "结果",
    year: "年",
    month: "月",
    week: "周",
    day: "天",
    hour: "小时",
    minute: "分钟",
    workday: "工作日",
    quick: "快捷",
    now: "现在",
    plusDay: "+1 天",
    plusWeek: "+1 周",
    plusMonth: "+1 月",
    relative: "相对起始时间",
    empty: "选择一个起始时间",
    note: "加减月份时会自动处理月末，例如 1 月 31 日加一个月得到 2 月 28 日（或 29 日）。工作日会跳过周六周日。",
  },
  en: {
    base: "Start",
    amount: "Amount",
    result: "Result",
    year: "years",
    month: "months",
    week: "weeks",
    day: "days",
    hour: "hours",
    minute: "minutes",
    workday: "workdays",
    quick: "Quick",
    now: "Now",
    plusDay: "+1 day",
    plusWeek: "+1 week",
    plusMonth: "+1 month",
    relative: "From the start",
    empty: "Pick a start time",
    note: "Month arithmetic clamps to the end of the month (Jan 31 + 1 month = Feb 28/29). Workdays skip Saturdays and Sundays.",
  },
};

const UNITS: { value: DateUnit; key: keyof (typeof COPY)["zh"] }[] = [
  { value: "year", key: "year" },
  { value: "month", key: "month" },
  { value: "week", key: "week" },
  { value: "day", key: "day" },
  { value: "hour", key: "hour" },
  { value: "minute", key: "minute" },
  { value: "workday", key: "workday" },
];

function format(date: Date, locale: string): string {
  return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function DateAddTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [value, setValue] = React.useState("");
  const [amount, setAmount] = React.useState(1);
  const [unit, setUnit] = React.useState<DateUnit>("day");

  React.useEffect(() => {
    const id = window.setTimeout(() => setValue(toDatetimeLocalValue(new Date())), 0);
    return () => window.clearTimeout(id);
  }, []);

  const base = React.useMemo(() => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [value]);

  const result = React.useMemo(() => {
    if (!base) return null;
    return addToDate(base, amount, unit);
  }, [base, amount, unit]);

  const relative = React.useMemo(() => {
    if (!base || !result) return "";
    const diff = diffDates(base, result);
    const parts: string[] = [];
    if (diff.years) parts.push(`${diff.years} ${t.year}`);
    if (diff.months) parts.push(`${diff.months} ${t.month}`);
    if (diff.days) parts.push(`${diff.days} ${t.day}`);
    return parts.join(" ") || "0";
  }, [base, result, t]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <span className="text-xs font-medium text-foreground-muted">{t.base}</span>
        <Input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={t.base}
          className="w-56 font-mono text-sm"
        />
        <span className="text-xs font-medium text-foreground-muted">{t.amount}</span>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          aria-label={t.amount}
          className="w-20 text-center font-mono"
        />
        <Segmented
          ariaLabel={t.result}
          className="flex-wrap"
          value={unit}
          onChange={setUnit}
          options={UNITS.map((u) => ({ value: u.value, label: t[u.key] as string }))}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setValue(toDatetimeLocalValue(new Date()))}
          >
            {t.now}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setAmount(1);
              setUnit("day");
            }}
          >
            {t.plusDay}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setAmount(1);
              setUnit("week");
            }}
          >
            {t.plusWeek}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => {
              setAmount(1);
              setUnit("month");
            }}
          >
            {t.plusMonth}
          </Button>
        </div>
      </OptionBar>

      {result ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
          <span className="text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.result}
          </span>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
              {format(result, locale)}
            </span>
            <CopyButton value={result.toISOString()} size="icon-xs" />
          </div>
          <span className="text-xs text-foreground-muted">
            {t.relative}: {relative}
          </span>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-foreground-subtle">{t.empty}</p>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
