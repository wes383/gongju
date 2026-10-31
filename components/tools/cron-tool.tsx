"use client";

import * as React from "react";
import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue/i18n";
import { useCopy, useLocale } from "@/components/locale-provider";
import { CopyButton, ErrorNote, Segmented } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COPY = {
  zh: {
    mode: "模式",
    parse: "解析",
    build: "生成",
    expression: "Cron 表达式",
    placeholder: "例如 0 9 * * 1-5",
    presets: "常用：",
    description: "含义",
    nextRuns: "接下来 5 次运行",
    invalid: "表达式无效",
    empty: "输入或生成 Cron 表达式后显示结果",
    hint: "支持 5 段（分 时 日 月 周）和 6 段（秒 分 时 日 月 周）写法，按本地时区计算",
    relative: "距现在",
    minute: "分钟",
    hour: "小时",
    day: "日",
    month: "月",
    weekday: "星期",
    any: "任意",
    custom: "指定",
    generated: "生成的表达式",
    workdays: "工作日",
    weekends: "周末",
    everyMinutes: (n: number) => `每 ${n} 分钟`,
    everyHours: (n: number) => `每 ${n} 小时`,
    weekdayNames: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  },
  en: {
    mode: "Mode",
    parse: "Parse",
    build: "Build",
    expression: "Cron expression",
    placeholder: "e.g. 0 9 * * 1-5",
    presets: "Common:",
    description: "Meaning",
    nextRuns: "Next 5 runs",
    invalid: "Invalid expression",
    empty: "Enter or build a cron expression to see the result",
    hint: "Accepts 5 fields (min hour day month weekday) and 6 fields (with seconds), evaluated in your local time zone",
    relative: "from now",
    minute: "Minute",
    hour: "Hour",
    day: "Day",
    month: "Month",
    weekday: "Weekday",
    any: "Any",
    custom: "Custom",
    generated: "Generated expression",
    workdays: "Weekdays",
    weekends: "Weekends",
    everyMinutes: (n: number) => `Every ${n} min`,
    everyHours: (n: number) => `Every ${n} h`,
    weekdayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
};

const PRESETS = ["*/5 * * * *", "0 9 * * 1-5", "0 0 * * *", "0 0 1 * *", "30 2 * * 0"];

function relativeLabel(date: Date, now: number, locale: string): string {
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 3600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

/** One cron field: preset dropdown plus an optional "custom number" input. */
function CronField({
  label,
  value,
  onChange,
  options,
  customMax,
  customLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  customMax?: number;
  customLabel?: string;
}) {
  // Tracked explicitly: inferring from the value breaks when the custom number
  // happens to be one of the presets (picking 0 for minutes, for example)
  const [custom, setCustom] = React.useState(false);
  const isCustom = customMax !== undefined && custom;

  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-foreground-muted">{label}</span>
      <Select
        value={isCustom ? "custom" : value}
        onValueChange={(next) => {
          if (next === "custom") {
            setCustom(true);
            onChange("0");
          } else {
            setCustom(false);
            onChange(next);
          }
        }}
      >
        <SelectTrigger size="xs" aria-label={label} className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
          {customMax !== undefined && (
            <SelectItem value="custom">{customLabel ?? "…"}</SelectItem>
          )}
        </SelectContent>
      </Select>
      {isCustom && customMax !== undefined && (
        <Input
          type="number"
          min={0}
          max={customMax}
          value={Number(value)}
          onChange={(e) =>
            onChange(String(Math.min(Math.max(Number(e.target.value) || 0, 0), customMax)))
          }
          aria-label={`${label} value`}
          size="xs"
          className="w-16 text-center font-mono"
        />
      )}
    </div>
  );
}

export function CronTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<"parse" | "build">("parse");
  const [expression, setExpression] = React.useState("");
  const [now, setNow] = React.useState<number | null>(null);

  // Builder state — each field holds a raw cron token
  const [minute, setMinute] = React.useState("*");
  const [hour, setHour] = React.useState("*");
  const [day, setDay] = React.useState("*");
  const [month, setMonth] = React.useState("*");
  const [weekday, setWeekday] = React.useState("*");

  React.useEffect(() => {
    const id = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const built = [minute, hour, day, month, weekday].join(" ");
  const active = mode === "build" ? built : expression;

  const result = React.useMemo(() => {
    const expr = active.trim();
    if (!expr) return { description: "", runs: [] as Date[], error: null as string | null };

    try {
      const description = cronstrue.toString(expr, {
        locale: locale === "zh" ? "zh_CN" : "en",
        use24HourTimeFormat: true,
      });
      const parser = CronExpressionParser.parse(expr, {
        currentDate: new Date(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const runs: Date[] = [];
      for (let i = 0; i < 5; i++) runs.push(parser.next().toDate());
      return { description, runs, error: null };
    } catch {
      return { description: "", runs: [], error: t.invalid };
    }
  }, [active, locale, t]);

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        ariaLabel={t.mode}
        value={mode}
        onChange={setMode}
        options={[
          { value: "parse", label: t.parse },
          { value: "build", label: t.build },
        ]}
      />

      {mode === "parse" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          <Input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder={t.placeholder}
            aria-label={t.expression}
            spellCheck={false}
            className="font-mono text-sm"
            size="xs"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-foreground-subtle">{t.presets}</span>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setExpression(preset)}
                className="rounded-full border border-border px-2.5 py-1 font-mono text-[11px] text-foreground-muted transition-colors hover:border-border-strong hover:bg-hover-bg hover:text-foreground"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <CronField
              label={t.minute}
              value={minute}
              onChange={setMinute}
              customMax={59}
              customLabel={t.custom}
              options={[
                { value: "*", label: t.any },
                { value: "*/5", label: t.everyMinutes(5) },
                { value: "*/10", label: t.everyMinutes(10) },
                { value: "*/15", label: t.everyMinutes(15) },
                { value: "*/30", label: t.everyMinutes(30) },
                { value: "0", label: "0" },
                { value: "30", label: "30" },
              ]}
            />
            <CronField
              label={t.hour}
              value={hour}
              onChange={setHour}
              customMax={23}
              customLabel={t.custom}
              options={[
                { value: "*", label: t.any },
                { value: "*/2", label: t.everyHours(2) },
                { value: "*/3", label: t.everyHours(3) },
                { value: "*/4", label: t.everyHours(4) },
                { value: "*/6", label: t.everyHours(6) },
                { value: "*/12", label: t.everyHours(12) },
                { value: "9", label: "09:00" },
                { value: "0", label: "00:00" },
              ]}
            />
            <CronField
              label={t.day}
              value={day}
              onChange={setDay}
              customMax={31}
              customLabel={t.custom}
              options={[
                { value: "*", label: t.any },
                { value: "1", label: "1" },
                { value: "15", label: "15" },
              ]}
            />
            <CronField
              label={t.month}
              value={month}
              onChange={setMonth}
              customMax={12}
              customLabel={t.custom}
              options={[
                { value: "*", label: t.any },
                { value: "1", label: "1" },
                { value: "6", label: "6" },
                { value: "12", label: "12" },
              ]}
            />
            <CronField
              label={t.weekday}
              value={weekday}
              onChange={setWeekday}
              options={[
                { value: "*", label: t.any },
                { value: "1-5", label: t.workdays },
                { value: "0,6", label: t.weekends },
                ...t.weekdayNames.map((name, index) => ({ value: String(index), label: name })),
              ]}
            />
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <span className="text-xs text-foreground-muted">{t.generated}</span>
            <code className="font-mono text-sm text-foreground">{built}</code>
            <CopyButton value={built} size="xs" className="ml-auto" />
          </div>
        </div>
      )}

      {result.error && <ErrorNote>{result.error}</ErrorNote>}

      {!active.trim() ? (
        <p className="py-12 text-center text-sm text-foreground-subtle">{t.empty}</p>
      ) : (
        !result.error && (
          <>
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.description}
              </div>
              <p className="text-sm text-foreground">{result.description}</p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <header className="flex h-10 items-center border-b border-border px-3">
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                  {t.nextRuns}
                </span>
              </header>
              <ul className="divide-y divide-border">
                {result.runs.map((run, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-3 px-4 py-2.5">
                    <span className="w-5 shrink-0 font-mono text-[11px] text-foreground-faint">
                      {i + 1}
                    </span>
                    <span className="font-mono text-[12.5px] tabular-nums text-foreground">
                      {run.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </span>
                    {now !== null && (
                      <span className="ml-auto text-[11px] text-foreground-faint">
                        {relativeLabel(run, now, locale)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.hint}</p>
    </div>
  );
}
