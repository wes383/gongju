"use client";

import * as React from "react";
import { Timer } from "lucide-react";
import { formatDuration, toDatetimeLocalValue } from "@/lib/datetime";
import { useCopy } from "@/components/locale-provider";
import { OptionBar, Segmented } from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    countdown: "倒计时",
    stopwatch: "正计时",
    target: "目标时间",
    start: "起始时间",
    now: "现在",
    plusHour: "+1 小时",
    plusDay: "+1 天",
    tomorrow9: "明天 9:00",
    days: "天",
    finished: "已到达目标时间",
    hint: "每秒自动刷新，页面切到后台时也会自动校正",
    totalSeconds: "总秒数",
    totalMinutes: "总分钟",
    totalHours: "总小时",
    totalDays: "总天数",
    choose: "选择一个时间开始",
  },
  en: {
    countdown: "Countdown",
    stopwatch: "Stopwatch",
    target: "Target time",
    start: "Start time",
    now: "Now",
    plusHour: "+1 hour",
    plusDay: "+1 day",
    tomorrow9: "Tomorrow 9:00",
    days: "days",
    finished: "Target time reached",
    hint: "Refreshes every second and re-syncs when the tab wakes up",
    totalSeconds: "Total seconds",
    totalMinutes: "Total minutes",
    totalHours: "Total hours",
    totalDays: "Total days",
    choose: "Pick a time to start",
  },
};

type Mode = "countdown" | "stopwatch";

export function CountdownTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<Mode>("countdown");
  const [value, setValue] = React.useState("");
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  React.useEffect(() => {
    if (value) return;
    const id = window.setTimeout(() => {
      setValue(toDatetimeLocalValue(new Date(Date.now() + 3600_000)));
    }, 0);
    return () => window.clearTimeout(id);
  }, [value]);

  const target = React.useMemo(() => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.getTime();
  }, [value]);

  const delta = target !== null && now !== null ? target - now : null;
  const remaining = delta !== null ? Math.max(0, delta) : null;
  const elapsed = delta !== null ? Math.max(0, -delta) : null;
  const shown = mode === "countdown" ? remaining : elapsed;
  const duration = shown !== null ? formatDuration(shown) : null;
  const finished = mode === "countdown" && delta !== null && delta <= 0;

  const setRelative = (offsetMs: number) =>
    setValue(toDatetimeLocalValue(new Date(Date.now() + offsetMs)));

  const setTomorrow9 = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    setValue(toDatetimeLocalValue(date));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.countdown}
          value={mode}
          onChange={setMode}
          options={[
            { value: "countdown", label: t.countdown },
            { value: "stopwatch", label: t.stopwatch },
          ]}
        />
        <span className="text-xs text-foreground-subtle">
          {mode === "countdown" ? t.target : t.start}
        </span>
        <Input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={mode === "countdown" ? t.target : t.start}
          className="w-56 font-mono text-sm"
        />
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="ghost" size="xs" onClick={() => setRelative(0)}>
            {t.now}
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => setRelative(3600_000)}>
            {t.plusHour}
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => setRelative(86_400_000)}>
            {t.plusDay}
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={setTomorrow9}>
            {t.tomorrow9}
          </Button>
        </div>
      </OptionBar>

      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-12">
        {duration ? (
          <>
            <div className="flex items-baseline gap-2 font-display tabular-nums text-foreground">
              <span className="text-5xl font-semibold">{duration.days}</span>
              <span className="text-sm text-foreground-subtle">{t.days}</span>
              <span className="ml-2 text-5xl font-semibold">
                {duration.hh}:{duration.mm}:{duration.ss}
              </span>
            </div>
            {finished && <span className="text-sm text-orange-fg">{t.finished}</span>}
            <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 font-mono text-[11px] text-foreground-faint">
              <span>
                {t.totalSeconds} {Math.floor((shown ?? 0) / 1000).toLocaleString()}
              </span>
              <span>
                {t.totalMinutes} {Math.floor((shown ?? 0) / 60_000).toLocaleString()}
              </span>
              <span>
                {t.totalHours} {Math.floor((shown ?? 0) / 3_600_000).toLocaleString()}
              </span>
              <span>
                {t.totalDays} {Math.floor((shown ?? 0) / 86_400_000).toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-foreground-subtle">
            <Timer className="h-4 w-4" />
            {t.choose}
          </div>
        )}
      </div>

      <p className="text-xs text-foreground-subtle">{t.hint}</p>
    </div>
  );
}
