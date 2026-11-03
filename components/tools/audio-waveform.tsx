"use client";

import * as React from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/locale-provider";
import { formatDuration } from "@/lib/audio";
import { cn } from "@/lib/utils";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 180;
const MIN_RANGE = 0.05;

const COPY = {
  zh: { selected: "已选择", play: "试听", pause: "暂停" },
  en: { selected: "selected", play: "Play", pause: "Pause" },
};

type DragMode = "start" | "end" | "select" | null;

export function AudioWaveform({
  peaks,
  duration,
  start,
  end,
  onChange,
  playhead,
  className,
}: {
  peaks: Float32Array;
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  playhead?: number;
  className?: string;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [drag, setDrag] = React.useState<DragMode>(null);
  const [anchor, setAnchor] = React.useState(0);
  const t = useCopy(COPY);

  const clipId = `wave-${React.useId().replace(/:/g, "")}`;
  const maximum = React.useMemo(
    () => Math.max(0.0001, ...Array.from(peaks)),
    [peaks]
  );

  const secondsAt = (clientX: number) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds || duration <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width));
    return ratio * duration;
  };

  const updateSelection = (time: number, mode: DragMode) => {
    const value = Math.max(0, Math.min(duration, time));
    if (mode === "start") {
      onChange(Math.min(value, end - MIN_RANGE), end);
    } else if (mode === "end") {
      onChange(start, Math.max(value, start + MIN_RANGE));
    } else if (mode === "select") {
      const low = Math.min(anchor, value);
      const high = Math.max(anchor, value);
      if (high - low >= MIN_RANGE) onChange(low, high);
    }
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (duration <= 0) return;
    event.preventDefault();
    const target = event.target as Element;
    const handle = target.closest("[data-handle]")?.getAttribute("data-handle") as
      | "start"
      | "end"
      | null;
    const time = secondsAt(event.clientX);
    const mode: DragMode = handle ?? "select";
    if (mode === "select") setAnchor(time);
    setDrag(mode);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSelection(time, mode);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    updateSelection(secondsAt(event.clientX), drag);
  };

  const endDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrag(null);
  };

  const startX = duration > 0 ? (start / duration) * VIEW_WIDTH : 0;
  const endX = duration > 0 ? (end / duration) * VIEW_WIDTH : VIEW_WIDTH;
  const playheadX =
    duration > 0 && playhead !== undefined ? (playhead / duration) * VIEW_WIDTH : null;
  const barWidth = VIEW_WIDTH / Math.max(1, peaks.length);

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-surface", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2 font-mono text-[11px] text-foreground-subtle">
        <span>{formatDuration(start, true)}</span>
        <span className="text-foreground-faint">
          {formatDuration(end - start, true)} {t.selected}
        </span>
        <span>{formatDuration(end, true)}</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Audio waveform selection"
        className="h-36 w-full cursor-crosshair touch-none select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={startX} y={0} width={Math.max(0, endX - startX)} height={VIEW_HEIGHT} />
          </clipPath>
        </defs>

        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="var(--surface)" />
        <line
          x1={0}
          x2={VIEW_WIDTH}
          y1={VIEW_HEIGHT / 2}
          y2={VIEW_HEIGHT / 2}
          stroke="var(--border)"
          strokeWidth={1}
        />

        <g fill="var(--foreground-faint)">
          {Array.from(peaks).map((peak, index) => {
            const value = Math.max(0.012, peak / maximum);
            const height = value * (VIEW_HEIGHT * 0.78);
            return (
              <rect
                key={index}
                x={index * barWidth}
                y={(VIEW_HEIGHT - height) / 2}
                width={Math.max(0.7, barWidth - 0.7)}
                height={height}
                rx={0.6}
              />
            );
          })}
        </g>

        <g clipPath={`url(#${clipId})`} fill="var(--accent)">
          {Array.from(peaks).map((peak, index) => {
            const value = Math.max(0.012, peak / maximum);
            const height = value * (VIEW_HEIGHT * 0.78);
            return (
              <rect
                key={index}
                x={index * barWidth}
                y={(VIEW_HEIGHT - height) / 2}
                width={Math.max(0.7, barWidth - 0.7)}
                height={height}
                rx={0.6}
              />
            );
          })}
        </g>

        <rect x={0} y={0} width={startX} height={VIEW_HEIGHT} fill="var(--background)" opacity={0.56} />
        <rect
          x={endX}
          y={0}
          width={Math.max(0, VIEW_WIDTH - endX)}
          height={VIEW_HEIGHT}
          fill="var(--background)"
          opacity={0.56}
        />

        {playheadX !== null && (
          <line
            x1={playheadX}
            x2={playheadX}
            y1={0}
            y2={VIEW_HEIGHT}
            stroke="var(--foreground)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}

        <g data-handle="start" className="cursor-ew-resize">
          <rect x={startX - 12} y={0} width={24} height={VIEW_HEIGHT} fill="transparent" />
          <line
            x1={startX}
            x2={startX}
            y1={0}
            y2={VIEW_HEIGHT}
            stroke="var(--accent)"
            strokeWidth={3}
          />
          <circle cx={startX} cy={12} r={7} fill="var(--accent)" />
        </g>
        <g data-handle="end" className="cursor-ew-resize">
          <rect x={endX - 12} y={0} width={24} height={VIEW_HEIGHT} fill="transparent" />
          <line
            x1={endX}
            x2={endX}
            y1={0}
            y2={VIEW_HEIGHT}
            stroke="var(--accent)"
            strokeWidth={3}
          />
          <circle cx={endX} cy={12} r={7} fill="var(--accent)" />
        </g>
      </svg>
    </div>
  );
}

/** Play a marked range without rendering the browser's default player. */
export function AudioClipPlayer({
  src,
  start,
  end,
  onTime,
  className,
}: {
  src: string;
  start: number;
  end: number;
  onTime?: (time: number) => void;
  className?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(start);
  const t = useCopy(COPY);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
    const next = Math.max(0, Math.min(start, end));
    audio.currentTime = next;
    setTime(next);
    onTime?.(next);
    // start/end are intentionally re-applied when the selection moves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, start, end]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    if (audio.currentTime < start || audio.currentTime >= end - 0.01) {
      audio.currentTime = start;
    }
    try {
      await audio.play();
    } catch {
      setPlaying(false);
    }
  };

  const handleTime = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime >= end) {
      audio.pause();
      audio.currentTime = end;
      setTime(end);
      onTime?.(end);
      return;
    }
    setTime(audio.currentTime);
    onTime?.(audio.currentTime);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5",
        className
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTime}
        onSeeked={handleTime}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
      <Button type="button" variant="outline" size="icon-xs" onClick={toggle} aria-label={playing ? t.pause : t.play}>
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="h-1 overflow-hidden rounded-full bg-hover-bg-strong">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-150"
            style={{
              width: `${end > start ? Math.max(0, Math.min(100, ((time - start) / (end - start)) * 100)) : 0}%`,
            }}
          />
        </div>
      </div>
      <span className="font-mono text-[11px] text-foreground-subtle">
        {formatDuration(Math.max(start, Math.min(time, end)), true)} / {formatDuration(end, true)}
      </span>
    </div>
  );
}
