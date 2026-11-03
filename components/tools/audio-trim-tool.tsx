"use client";

import * as React from "react";
import { Download, Loader2, Scissors } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AudioClipPlayer, AudioWaveform } from "@/components/tools/audio-waveform";
import { MediaDrop, useMediaFiles } from "@/components/tools/media-drop";
import { MediaResult } from "@/components/tools/media-result";
import { ErrorNote, OptionBar, OptionField } from "@/components/tools/tool-ui";
import {
  audioDuration,
  decodeAudioFile,
  formatDuration,
  sliceAudio,
  wavBlob,
  waveformPeaks,
  type PcmAudio,
} from "@/lib/audio";
import { baseName } from "@/lib/files";
import { errorText } from "@/lib/errors";
import { useLocale } from "@/components/locale-provider";
import { clamp } from "@/lib/utils";

const COPY = {
  zh: {
    start: "起点",
    end: "终点",
    length: "片段长度",
    run: "生成 WAV",
    running: "生成中…",
    decoding: "正在读取波形…",
    resultNote: "无损 WAV，已应用短淡入淡出",
    note: "拖动波形上的两条边界选择片段，也可以直接输入时间。原文件不会被修改，全部处理都在本机完成。",
    output: "导出",
  },
  en: {
    start: "Start",
    end: "End",
    length: "Length",
    run: "Export WAV",
    running: "Exporting…",
    decoding: "Reading waveform…",
    resultNote: "Lossless WAV with short fades",
    note: "Drag the two handles on the waveform to mark a clip, or type the times directly. The original file is never changed and everything stays on this device.",
    output: "Output",
  },
};

export function AudioTrimTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { files, add, remove, clear, error: dropError, loading } = useMediaFiles({ accept: "audio" });
  const entry = files[0];

  const [decoded, setDecoded] = React.useState<{
    id: string;
    audio: PcmAudio;
    peaks: Float32Array;
  } | null>(null);
  const [decoding, setDecoding] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [start, setStart] = React.useState(0);
  const [end, setEnd] = React.useState(0);
  const [playhead, setPlayhead] = React.useState(0);
  const [output, setOutput] = React.useState<{ blob: Blob; name: string; note: string } | null>(
    null
  );
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!entry) {
      setDecoded(null);
      setOutput(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setDecoding(true);
    setError(null);
    setOutput(null);

    decodeAudioFile(entry.file)
      .then((audio) => {
        if (cancelled) return;
        const duration = audioDuration(audio);
        setDecoded({ id: entry.id, audio, peaks: waveformPeaks(audio, 520) });
        setStart(0);
        setEnd(duration);
        setPlayhead(0);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setDecoding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entry]);

  const audio = decoded && entry && decoded.id === entry.id ? decoded.audio : null;
  const duration = audio ? audioDuration(audio) : 0;

  const setRange = (nextStart: number, nextEnd: number) => {
    if (!audio) return;
    const low = clamp(nextStart, 0, Math.max(0, duration - 0.05));
    const high = clamp(nextEnd, low + 0.05, duration);
    setStart(low);
    setEnd(high);
    setPlayhead(low);
  };

  const run = () => {
    if (!audio || !entry || end <= start) return;
    setBusy(true);
    setError(null);
    try {
      const clip = sliceAudio(audio, start, end);
      const blob = wavBlob(clip);
      setOutput({
        blob,
        name: `${baseName(entry.name)}-clip.wav`,
        note: `${formatDuration(end - start, true)} · ${t.resultNote}`,
      });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
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
        accept="audio"
      />

      {decoding && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-8 text-sm text-foreground-subtle">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t.decoding}
        </div>
      )}

      {error != null && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

      {entry && audio && (
        <>
          <AudioWaveform
            peaks={decoded!.peaks}
            duration={duration}
            start={start}
            end={end}
            onChange={setRange}
            playhead={playhead}
          />

          <AudioClipPlayer
            src={entry.url}
            start={start}
            end={end}
            onTime={setPlayhead}
          />

          <OptionBar>
            <OptionField label={t.start}>
              <Input
                type="number"
                min={0}
                max={Math.max(0, end - 0.05)}
                step={0.01}
                value={Number(start.toFixed(2))}
                onChange={(event) => setRange(Number(event.target.value), end)}
                aria-label={t.start}
                size="xs"
                className="w-24 text-center font-mono"
              />
            </OptionField>

            <OptionField label={t.end}>
              <Input
                type="number"
                min={start + 0.05}
                max={duration}
                step={0.01}
                value={Number(end.toFixed(2))}
                onChange={(event) => setRange(start, Number(event.target.value))}
                aria-label={t.end}
                size="xs"
                className="w-24 text-center font-mono"
              />
            </OptionField>

            <OptionField label={t.length}>
              <span className="font-mono text-xs text-foreground-subtle">
                {formatDuration(end - start, true)}
              </span>
            </OptionField>

            <Button
              type="button"
              size="xs"
              onClick={run}
              disabled={busy || end <= start}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Scissors className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          {output && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                <Download className="h-3.5 w-3.5" />
                {t.output}
              </p>
              <MediaResult
                blob={output.blob}
                name={output.name}
                kind="audio"
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
