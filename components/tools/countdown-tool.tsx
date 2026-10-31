"use client";

import * as React from "react";
import { Flag, Maximize2, Minimize2, Moon, Pause, Play, RotateCcw, Sun } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { useAppTheme } from "@/components/theme-provider";
import { OptionBar, Segmented } from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    countdown: "倒计时",
    stopwatch: "秒表",
    countdownHint: "设定时长后点开始，可以随时暂停",
    stopwatchHint: "从 0 开始计时，可以暂停和分段",
    duration: "时长",
    hours: "时",
    minutes: "分",
    seconds: "秒",
    start: "开始",
    pause: "暂停",
    resume: "继续",
    reset: "重置",
    finished: "时间到",
    fullscreen: "全屏",
    exitFullscreen: "退出全屏",
    toLight: "切换到浅色主题",
    toDark: "切换到深色主题",
    lap: "计次",
    lapIndex: "第",
    lapTimes: "计次记录",
    split: "分段",
    total: "累计",
    noLap: "还没有计次记录",
    countdownNote: "倒计时结束会停在 0 并提示，切到后台再回来会按真实时间校正。",
    stopwatchNote: "计时精度 0.01 秒，切换标签或刷新页面会重置。",
  },
  en: {
    countdown: "Countdown",
    stopwatch: "Stopwatch",
    countdownHint: "Set a duration, hit start, and pause whenever you like",
    stopwatchHint: "Counts up from zero, with pause and lap",
    duration: "Duration",
    hours: "h",
    minutes: "m",
    seconds: "s",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    reset: "Reset",
    finished: "Time's up",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    toLight: "Switch to light theme",
    toDark: "Switch to dark theme",
    lap: "Lap",
    lapIndex: "Lap",
    lapTimes: "Laps",
    split: "Split",
    total: "Total",
    noLap: "No laps recorded yet",
    countdownNote:
      "When it hits zero it stops and shows a notice; switching tabs is corrected against the real clock.",
    stopwatchNote: "Precision is 0.01s. Switching tabs or reloading resets it.",
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

function splitCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  return {
    h: Math.floor(total / 3600),
    m: pad(Math.floor(total / 60) % 60),
    s: pad(total % 60),
  };
}

const PRESETS = [60_000, 300_000, 600_000, 1_500_000, 3_600_000];

/** No-op subscription; only used to detect that we are on the client */
const subscribeNoop = () => () => {};

function Colon({ style }: { style?: React.CSSProperties }) {
  return (
    <span className="text-2xl text-foreground-subtle" style={style}>
      :
    </span>
  );
}

/** Inline editable segment: looks like the big display, behaves like an input */
function TimeField({
  value,
  max,
  label,
  style,
  onChange,
}: {
  value: number;
  max: number;
  label: string;
  style?: React.CSSProperties;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      value={String(value).padStart(2, "0")}
      onChange={(e) => onChange(Number(e.target.value))}
      onFocus={(e) => e.currentTarget.select()}
      aria-label={label}
      style={style}
      className="w-[2.1ch] rounded-md bg-transparent text-center font-display text-6xl font-semibold tabular-nums text-foreground outline-none transition-colors [appearance:textfield] hover:bg-hover-bg focus:bg-hover-bg focus:text-accent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

export function CountdownTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<Mode>("countdown");

  /* ── countdown ───────────────────────────────────────────── */
  const [durationMs, setDurationMs] = React.useState(300_000);
  const [remainingMs, setRemainingMs] = React.useState(300_000);
  const [running, setRunning] = React.useState(false);
  const [finished, setFinished] = React.useState(false);
  const endAt = React.useRef(0);

  React.useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = endAt.current - performance.now();
      if (left <= 0) {
        setRemainingMs(0);
        setRunning(false);
        setFinished(true);
        return;
      }
      setRemainingMs(left);
    };
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [running]);

  const applyDuration = (ms: number) => {
    const next = Math.max(0, Math.min(ms, 99 * 3_600_000));
    setDurationMs(next);
    setRemainingMs(next);
    setFinished(false);
    setRunning(false);
  };

  const toggleCountdown = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (remainingMs <= 0) return;
    endAt.current = performance.now() + remainingMs;
    setFinished(false);
    setRunning(true);
  };

  const resetCountdown = () => {
    setRunning(false);
    setFinished(false);
    setRemainingMs(durationMs);
  };

  const countdown = splitCountdown(remainingMs);
  // Only the untouched duration is editable; once started, show the read-out
  const editing = !running && remainingMs === durationMs;
  const progress =
    durationMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / durationMs)) : 0;

  /* ── full screen ─────────────────────────────────────────── */
  const timerRef = React.useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = React.useState(false);
  const { resolvedTheme, setTheme } = useAppTheme();
  const mounted = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const dark = mounted ? resolvedTheme === "dark" : false;

  React.useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // The page keeps a stable scrollbar gutter; inside fullscreen that gutter
  // shows up as a strip of the black ::backdrop on the right edge.
  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("is-timer-fullscreen", fullscreen);
    return () => root.classList.remove("is-timer-fullscreen");
  }, [fullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await timerRef.current?.requestFullscreen();
    } catch {
      /* the browser refused, the layout stays as it is */
    }
  };

  const durationParts = {
    h: Math.floor(durationMs / 3_600_000),
    m: Math.floor(durationMs / 60_000) % 60,
    s: Math.floor(durationMs / 1000) % 60,
  };

  const setPart = (part: "h" | "m" | "s", value: number) => {
    const clamped = Math.max(0, Math.min(part === "h" ? 99 : 59, value || 0));
    const next = {
      ...durationParts,
      [part]: clamped,
    };
    applyDuration(next.h * 3_600_000 + next.m * 60_000 + next.s * 1000);
  };

  /* ── stopwatch ───────────────────────────────────────────── */
  const [watchRunning, setWatchRunning] = React.useState(false);
  const [elapsed, setElapsed] = React.useState(0);
  const [laps, setLaps] = React.useState<number[]>([]);
  const startedAt = React.useRef(0);
  const accumulated = React.useRef(0);

  React.useEffect(() => {
    if (!watchRunning) return;
    const tick = () => setElapsed(accumulated.current + (performance.now() - startedAt.current));
    const id = window.setInterval(tick, 31);
    return () => window.clearInterval(id);
  }, [watchRunning]);

  const startOrPauseWatch = () => {
    if (watchRunning) {
      accumulated.current = elapsed;
      setWatchRunning(false);
      return;
    }
    startedAt.current = performance.now();
    setWatchRunning(true);
  };

  const resetWatch = () => {
    accumulated.current = 0;
    startedAt.current = 0;
    setElapsed(0);
    setWatchRunning(false);
    setLaps([]);
  };

  const watch = splitStopwatch(elapsed);

  // Sizes are real font sizes (not a `scale` transform) so the enlarged digits
  // still take up layout space and never overlap the progress bar below.
  const digitStyle: React.CSSProperties | undefined = fullscreen
    ? { fontSize: "clamp(3rem, min(17vh, 12vw), 14rem)" }
    : undefined;
  const colonStyle: React.CSSProperties | undefined = fullscreen
    ? { fontSize: "clamp(1.2rem, min(6.5vh, 4.5vw), 5rem)" }
    : undefined;

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
            <span className="text-xs text-foreground-muted">{t.duration}</span>
            <div className="flex flex-wrap items-center gap-1">
              {PRESETS.map((ms) => (
                <Button
                  key={ms}
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => applyDuration(ms)}
                  disabled={running}
                >
                  {ms >= 3_600_000 ? `${ms / 3_600_000} ${t.hours}` : `${ms / 60_000} ${t.minutes}`}
                </Button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={toggleFullscreen}
                aria-label={t.fullscreen}
                title={t.fullscreen}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={running ? "outline" : "default"}
                size="sm"
                onClick={toggleCountdown}
                disabled={!running && remainingMs <= 0}
                className="gap-1.5"
              >
                {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {running ? t.pause : remainingMs < durationMs ? t.resume : t.start}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetCountdown}
                disabled={!running && remainingMs === durationMs}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.reset}
              </Button>
            </div>
          </>
        ) : (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant={watchRunning ? "outline" : "default"}
              size="sm"
              onClick={startOrPauseWatch}
              className="gap-1.5"
            >
              {watchRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {watchRunning ? t.pause : elapsed > 0 ? t.resume : t.start}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLaps((prev) => [elapsed, ...prev])}
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
              onClick={resetWatch}
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
        <div
          ref={timerRef}
          className={cn(
            "relative flex flex-col items-center gap-6 rounded-lg border border-border bg-surface px-6 py-14",
            fullscreen &&
              "h-screen w-full justify-center gap-10 rounded-none border-0 bg-background px-10 py-0"
          )}
        >
          {fullscreen && (
            <div className="absolute right-6 top-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTheme(dark ? "light" : "dark")}
                aria-label={dark ? t.toLight : t.toDark}
                title={dark ? t.toLight : t.toDark}
                className="grid h-10 w-10 place-items-center rounded-full text-foreground-subtle transition-colors hover:bg-hover-bg hover:text-foreground"
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={t.exitFullscreen}
                title={t.exitFullscreen}
                className="grid h-10 w-10 place-items-center rounded-full text-foreground-subtle transition-colors hover:bg-hover-bg hover:text-foreground"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            </div>
          )}
          {editing ? (
            <div className="flex items-baseline gap-1 font-display tabular-nums text-foreground">
              <TimeField
                value={durationParts.h}
                max={99}
                label={t.hours}
                style={digitStyle}
                onChange={(v) => setPart("h", v)}
              />
              <Colon style={colonStyle} />
              <TimeField
                value={durationParts.m}
                max={59}
                label={t.minutes}
                style={digitStyle}
                onChange={(v) => setPart("m", v)}
              />
              <Colon style={colonStyle} />
              <TimeField
                value={durationParts.s}
                max={59}
                label={t.seconds}
                style={digitStyle}
                onChange={(v) => setPart("s", v)}
              />
            </div>
          ) : (
            <div
              className={cn(
                "flex items-baseline gap-1 font-display tabular-nums",
                finished ? "text-accent" : "text-foreground"
              )}
            >
              {countdown.h > 0 && (
                <>
                  <span className="text-6xl font-semibold" style={digitStyle}>
                    {countdown.h}
                  </span>
                  <span className="mr-2 text-2xl text-foreground-subtle" style={colonStyle}>
                    :
                  </span>
                </>
              )}
              <span className="text-6xl font-semibold" style={digitStyle}>
                {countdown.m}
              </span>
              <span className="text-2xl text-foreground-subtle" style={colonStyle}>
                :
              </span>
              <span className="text-6xl font-semibold" style={digitStyle}>
                {countdown.s}
              </span>
            </div>
          )}

          <div
            className={cn(
              "h-1 w-full max-w-md overflow-hidden rounded-full bg-hover-bg",
              fullscreen && "max-w-2xl"
            )}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {finished && <span className="text-sm font-medium text-accent">{t.finished}</span>}

          {fullscreen && (
            <div className="absolute inset-x-0 bottom-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant={running ? "outline" : "default"}
                size="lg"
                onClick={toggleCountdown}
                disabled={!running && remainingMs <= 0}
                className="gap-2"
              >
                {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {running ? t.pause : remainingMs < durationMs ? t.resume : t.start}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={resetCountdown}
                disabled={!running && remainingMs === durationMs}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
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
