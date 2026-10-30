"use client";

import * as React from "react";
import { Flag, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { formatDuration, toDatetimeLocalValue } from "@/lib/datetime";
import { useCopy } from "@/components/locale-provider";
import { OptionBar, Segmented } from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
  zh: {
    countdown: "倒计时",
    stopwatch: "秒表",
    countdownHint: "选一个未来的时间，看看还有多久",
    stopwatchHint: "从 0 开始计时，可以暂停和分段",
    target: "目标时间",
    now: "现在",
    plus5: "5 分钟",
    plus30: "30 分钟",
    plusHour: "1 小时",
    plusDay: "1 天",
    tomorrow9: "明天 9:00",
    days: "天",
    overdue: "目标时间已经过了，已过去",
    totalSeconds: "总秒数",
    totalMinutes: "总分钟",
    totalHours: "总小时",
    totalDays: "总天数",
    choose: "选择一个目标时间",
    start: "开始",
    pause: "暂停",
    resume: "继续",
    reset: "重置",
    lap: "计次",
    lapIndex: "第",
    lapTimes: "计次记录",
    split: "分段",
    total: "累计",
    noLap: "还没有计次记录",
    stopwatchNote: "计时精度 0.01 秒，切换标签或刷新页面会重置。",
    countdownNote: "每秒刷新一次，页面切到后台再回来会自动校正。",
  },
  en: {
    countdown: "Countdown",
    stopwatch: "Stopwatch",
    countdownHint: "Pick a future moment and see how long is left",
    stopwatchHint: "Counts up from zero, with pause and lap",
    target: "Target time",
    now: "Now",
    plus5: "5 min",
    plus30: "30 min",
    plusHour: "1 hour",
    plusDay: "1 day",
    tomorrow9: "Tomorrow 9:00",
    days: "days",
    overdue: "The target has passed — elapsed",
    totalSeconds: "Total seconds",
    totalMinutes: "Total minutes",
    totalHours: "Total hours",
    totalDays: "Total days",
    choose: "Pick a target time",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    reset: "Reset",
    lap: "Lap",
    lapIndex: "Lap",
    lapTimes: "Laps",
    split: "Split",
    total: "Total",
    noLap: "No laps recorded yet",
    stopwatchNote: "Precision is 0.01s. Switching tabs or reloading resets it.",
    countdownNote: "Refreshes every second and re-syncs when the tab wakes up.",
  },
};

type Mode = "countdown" | "stopwatch";

const pad = (n: number) => String(n).padStart(2, "0");

function splitStopwatch(ms: number) {
  const totalCentis = Math.floor(ms / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  return {
    h: Math.floor(totalSeconds / 3600),
    m: pad(Math.floor(totalSeconds / 60) % 60),
    s: pad(totalSeconds % 60),
    cs: pad(centis),
  };
}

function formatLap(ms: number) {
  const t = splitStopwatch(ms);
  return t.h > 0 ? `${t.h}:${t.m}:${t.s}.${t.cs}` : `${t.m}:${t.s}.${t.cs}`;
}

export function CountdownTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<Mode>("countdown");

  /* ── countdown ───────────────────────────────────────────── */
  const [value, setValue] = React.useState("");
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (mode !== "countdown") return;
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
  }, [mode]);

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
  const overdue = delta !== null && delta <= 0;
  const countdown = remaining !== null ? formatDuration(remaining) : null;

  const setRelative = (offsetMs: number) =>
    setValue(toDatetimeLocalValue(new Date(Date.now() + offsetMs)));

  const setTomorrow9 = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    setValue(toDatetimeLocalValue(date));
  };

  /* ── stopwatch ───────────────────────────────────────────── */
  const [running, setRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [laps, setLaps] = React.useState<number[]>([]);
  const startedAt = React.useRef(0);
  const accumulated = React.useRef(0);

  React.useEffect(() => {
    if (!running) return;
    const tick = () => setElapsed(accumulated.current + (performance.now() - startedAt.current));
    const id = window.setInterval(tick, 31);
    return () => window.clearInterval(id);
  }, [running]);

  const startOrPause = () => {
    if (running) {
      accumulated.current = elapsed;
      setRunning(false);
      return;
    }
    startedAt.current = performance.now();
    setRunning(true);
  };

  const reset = () => {
    accumulated.current = 0;
    startedAt.current = 0;
    setElapsed(0);
    setRunning(false);
    setLaps([]);
  };

  const recordLap = () => setLaps((prev) => [elapsed, ...prev]);

  const watch = splitStopwatch(elapsed);

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

        {mode === "countdown" ? (
          <>
            <span className="text-xs text-foreground-muted">{t.target}</span>
            <Input
              type="datetime-local"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={t.target}
              className="w-60 font-mono text-sm"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <Button type="button" variant="ghost" size="xs" onClick={() => setRelative(0)}>
                {t.now}
              </Button>
              <Button type="button" variant="ghost" size="xs" onClick={() => setRelative(300_000)}>
                {t.plus5}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setRelative(1_800_000)}
              >
                {t.plus30}
              </Button>
              <Button type="button" variant="ghost" size="xs" onClick={() => setRelative(3600_000)}>
                {t.plusHour}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setRelative(86_400_000)}
              >
                {t.plusDay}
              </Button>
              <Button type="button" variant="ghost" size="xs" onClick={setTomorrow9}>
                {t.tomorrow9}
              </Button>
            </div>
          </>
        ) : (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant={running ? "outline" : "default"}
              size="sm"
              onClick={startOrPause}
              className="gap-1.5"
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {running ? t.pause : elapsed > 0 ? t.resume : t.start}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={recordLap}
              disabled={elapsed === 0}
              className="gap-1.5"
            >
              <Flag className="h-3.5 w-3.5" />
              {t.lap}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={elapsed === 0}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t.reset}
            </Button>
          </div>
        )}
      </OptionBar>

      <p className="text-xs text-foreground-subtle">
        {mode === "countdown" ? t.countdownHint : t.stopwatchHint}
      </p>

      {mode === "countdown" ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface px-6 py-12">
          {countdown ? (
            <>
              <div className="flex items-baseline gap-2 font-display tabular-nums text-foreground">
                <span className="text-5xl font-semibold">{countdown.days}</span>
                <span className="text-sm text-foreground-subtle">{t.days}</span>
                <span className="ml-2 text-5xl font-semibold">
                  {countdown.hh}:{countdown.mm}:{countdown.ss}
                </span>
              </div>
              {overdue && (
                <span className="text-sm text-orange-fg">
                  {t.overdue} {formatDuration(Math.abs(delta ?? 0)).days} {t.days}
                </span>
              )}
              <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1 font-mono text-[11px] text-foreground-faint">
                <span>
                  {t.totalSeconds} {Math.floor((remaining ?? 0) / 1000).toLocaleString()}
                </span>
                <span>
                  {t.totalMinutes} {Math.floor((remaining ?? 0) / 60_000).toLocaleString()}
                </span>
                <span>
                  {t.totalHours} {Math.floor((remaining ?? 0) / 3_600_000).toLocaleString()}
                </span>
                <span>
                  {t.totalDays} {Math.floor((remaining ?? 0) / 86_400_000).toLocaleString()}
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
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface px-6 py-12">
            <div className="flex items-baseline gap-1 font-display tabular-nums text-foreground">
              <span className="text-6xl font-semibold">
                {watch.h > 0 ? `${watch.h}:` : ""}
                {watch.m}:{watch.s}
              </span>
              <span className="text-2xl font-medium text-foreground-subtle">.{watch.cs}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-10 items-center gap-2 border-b border-border px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.lapTimes}
              </span>
              {laps.length > 1 && (
                <span className="ml-auto font-mono text-[11px] text-foreground-faint">
                  {t.split} / {t.total}
                </span>
              )}
            </header>
            {laps.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-foreground-subtle">{t.noLap}</p>
            ) : (
              <ul className="divide-y divide-border">
                {laps.map((lapMs, i) => {
                  const previous = laps[i + 1] ?? 0;
                  return (
                    <li
                      key={`${lapMs}-${i}`}
                      className="flex items-center gap-3 px-4 py-2 font-mono text-[12px] tabular-nums"
                    >
                      <span className="w-16 text-foreground-faint">
                        {t.lapIndex} {laps.length - i}
                      </span>
                      <span className="text-foreground-muted">+{formatLap(lapMs - previous)}</span>
                      <span className="ml-auto text-foreground">{formatLap(lapMs)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-foreground-subtle">
        {mode === "countdown" ? t.countdownNote : t.stopwatchNote}
      </p>
    </div>
  );
}
