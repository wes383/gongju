"use client";

import * as React from "react";
import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue/i18n";
import { useCopy, useLocale } from "@/components/locale-provider";
import { ErrorNote } from "@/components/tools/tool-ui";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    expression: "Cron 表达式",
    placeholder: "例如 0 9 * * 1-5",
    presets: "常用：",
    description: "含义",
    nextRuns: "接下来 5 次运行",
    invalid: "表达式无效",
    empty: "输入 Cron 表达式后显示解析结果",
    hint: "支持 5 段（分 时 日 月 周）和 6 段（秒 分 时 日 月 周）写法，按本地时区计算",
    relative: "距现在",
  },
  en: {
    expression: "Cron expression",
    placeholder: "e.g. 0 9 * * 1-5",
    presets: "Common:",
    description: "Meaning",
    nextRuns: "Next 5 runs",
    invalid: "Invalid expression",
    empty: "Enter a cron expression to see the result",
    hint: "Accepts 5 fields (min hour day month weekday) and 6 fields (with seconds), evaluated in your local time zone",
    relative: "from now",
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

export function CronTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [expression, setExpression] = React.useState("");
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    const id = window.setTimeout(() => setNow(Date.now()), 0);
    return () => window.clearTimeout(id);
  }, []);

  const result = React.useMemo(() => {
    const expr = expression.trim();
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
  }, [expression, locale, t]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
        <Input
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder={t.placeholder}
          aria-label={t.expression}
          spellCheck={false}
          className="font-mono text-sm"
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

      {result.error && <ErrorNote>{result.error}</ErrorNote>}

      {!expression.trim() ? (
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
