"use client";

import * as React from "react";
import { Download, Film, Loader2, XCircle } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaDrop, useMediaFiles } from "@/components/tools/media-drop";
import { MediaResult } from "@/components/tools/media-result";
import { ErrorNote, OptionBar, OptionField } from "@/components/tools/tool-ui";
import { formatDuration } from "@/lib/audio";
import {
  createGifFromVideo,
  gifFrameTimes,
  MAX_GIF_FRAMES,
} from "@/lib/video";
import { baseName } from "@/lib/files";
import { errorText } from "@/lib/errors";
import { clamp } from "@/lib/utils";

const WIDTH_OPTIONS = [240, 320, 480, 640];
const FPS_OPTIONS = [5, 8, 10, 15];

const COPY = {
  zh: {
    start: "起点",
    end: "终点",
    width: "宽度",
    fps: "帧率",
    frames: "预计帧数",
    run: "生成 GIF",
    running: "生成中…",
    cancel: "取消",
    progress: (done: number, total: number) => `正在编码 ${done} / ${total} 帧…`,
    resultNote: "已优化调色板",
    note: "从本机解码视频帧并编码为 GIF，不会上传文件。长片段会自动限制在 240 帧以内；想要更小的文件，可以降低宽度或帧率。",
    preview: "预览",
    rangeInvalid: "终点需要晚于起点",
    framesUnit: "帧",
    unit: "秒",
  },
  en: {
    start: "Start",
    end: "End",
    width: "Width",
    fps: "Frame rate",
    frames: "Est. frames",
    run: "Create GIF",
    running: "Encoding…",
    cancel: "Cancel",
    progress: (done: number, total: number) => `Encoding frame ${done} of ${total}…`,
    resultNote: "Optimized palette",
    note: "Video frames are decoded and encoded to GIF on this device — nothing is uploaded. Long clips are capped at 240 frames; lower the width or frame rate for smaller files.",
    preview: "Preview",
    rangeInvalid: "End must be after start",
    framesUnit: "frames",
    unit: "s",
  },
};

export function VideoGifTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { files, add, remove, clear, error: dropError, loading } = useMediaFiles({
    accept: "video",
  });
  const entry = files[0];

  const [start, setStart] = React.useState(0);
  const [end, setEnd] = React.useState(0);
  const [width, setWidth] = React.useState(320);
  const [fps, setFps] = React.useState(10);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [error, setError] = React.useState<unknown>(null);
  const [output, setOutput] = React.useState<{ blob: Blob; name: string; note: string } | null>(
    null
  );
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (!entry) {
      setStart(0);
      setEnd(0);
      setOutput(null);
      setError(null);
      return;
    }
    setStart(0);
    setEnd(entry.duration);
    setOutput(null);
    setError(null);
  }, [entry]);

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const duration = entry?.duration ?? 0;
  const frameCount = gifFrameTimes(start, end, fps, MAX_GIF_FRAMES).length;
  const validRange = entry != null && end > start && end - start > 0.05;

  const setRange = (nextStart: number, nextEnd: number) => {
    const low = clamp(nextStart, 0, Math.max(0, duration - 0.05));
    const high = clamp(nextEnd, low + 0.05, duration);
    setStart(low);
    setEnd(high);
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  const run = async () => {
    if (!entry || !validRange) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setOutput(null);
    setProgress("");
    try {
      const blob = await createGifFromVideo(entry.file, {
        start,
        end,
        width,
        fps,
        maxFrames: MAX_GIF_FRAMES,
        signal: controller.signal,
        onProgress: (done, total) => setProgress(t.progress(done, total)),
      });
      setOutput({
        blob,
        name: `${baseName(entry.name)}.gif`,
        note: `${formatDuration(end - start, true)} · ${frameCount} ${t.framesUnit} · ${t.resultNote}`,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User cancelled — not an error state.
      } else {
        setError(err);
      }
    } finally {
      setBusy(false);
      setProgress("");
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <MediaDrop
        files={files}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        error={dropError}
        loading={loading}
        accept="video"
      />

      {entry && (
        <>
          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <video
              key={entry.id}
              src={entry.url}
              controls
              preload="metadata"
              className="max-h-[420px] w-full bg-black"
            />
          </section>

          <OptionBar>
            <OptionField label={t.start}>
              <Input
                type="number"
                min={0}
                max={Math.max(0, end - 0.05)}
                step={0.1}
                value={Number(start.toFixed(2))}
                onChange={(event) => setRange(Number(event.target.value), end)}
                aria-label={t.start}
                size="xs"
                className="w-20 text-center font-mono"
              />
              <span className="text-[11px] text-foreground-subtle">{t.unit}</span>
            </OptionField>

            <OptionField label={t.end}>
              <Input
                type="number"
                min={start + 0.05}
                max={duration}
                step={0.1}
                value={Number(end.toFixed(2))}
                onChange={(event) => setRange(start, Number(event.target.value))}
                aria-label={t.end}
                size="xs"
                className="w-20 text-center font-mono"
              />
              <span className="text-[11px] text-foreground-subtle">{t.unit}</span>
            </OptionField>

            <OptionField label={t.width}>
              <Select
                value={String(width)}
                onValueChange={(value) => setWidth(Number(value))}
              >
                <SelectTrigger size="xs" className="w-24" aria-label={t.width}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDTH_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} px
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            <OptionField label={t.fps}>
              <Select value={String(fps)} onValueChange={(value) => setFps(Number(value))}>
                <SelectTrigger size="xs" className="w-20" aria-label={t.fps}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FPS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            <OptionField label={t.frames}>
              <span className="font-mono text-xs text-foreground-subtle">
                {frameCount} {t.framesUnit}
              </span>
            </OptionField>

            {busy ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={cancel}
                className="ml-auto gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                {t.cancel}
              </Button>
            ) : (
              <Button
                type="button"
                size="xs"
                onClick={run}
                disabled={!validRange}
                className="ml-auto gap-1.5"
              >
                <Film className="h-3.5 w-3.5" />
                {t.run}
              </Button>
            )}
          </OptionBar>

          {!validRange && entry && (
            <p className="text-xs text-red-fg">{t.rangeInvalid}</p>
          )}

          {busy && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-xs text-foreground-subtle">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {progress || t.running}
            </div>
          )}

          {error != null && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

          {output && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                <Download className="h-3.5 w-3.5" />
                {t.run}
              </p>
              <MediaResult
                blob={output.blob}
                name={output.name}
                kind="image"
                note={output.note}
              />
            </div>
          )}

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
        </>
      )}
    </div>
  );
}
