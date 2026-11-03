"use client";

import * as React from "react";
import { Download, Gauge, Loader2 } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaDrop, useMediaFiles } from "@/components/tools/media-drop";
import { MediaResult } from "@/components/tools/media-result";
import { ErrorNote, OptionBar, OptionField } from "@/components/tools/tool-ui";
import {
  amplitudeToDb,
  audioDuration,
  decodeAudioFile,
  formatDuration,
  normalizeAudio,
  peakAmplitude,
  wavBlob,
  type PcmAudio,
} from "@/lib/audio";
import { baseName } from "@/lib/files";
import { errorText } from "@/lib/errors";
import { clamp } from "@/lib/utils";

const COPY = {
  zh: {
    peak: "当前峰值",
    target: "目标峰值",
    gain: "应用增益",
    run: "导出归一化 WAV",
    running: "处理中…",
    decoding: "正在分析音量…",
    resultNote: "峰值已对齐到目标电平",
    note: "把整段音频的最高峰值对齐到目标电平，不改变动态范围。导出为无损 WAV，处理过程完全在本机完成。",
    unit: "dBFS",
  },
  en: {
    peak: "Current peak",
    target: "Target peak",
    gain: "Applied gain",
    run: "Export normalized WAV",
    running: "Processing…",
    decoding: "Analyzing loudness…",
    resultNote: "Peak aligned to target level",
    note: "Aligns the loudest peak of the whole clip to the target level without changing dynamic range. Exported as lossless WAV, processed entirely on this device.",
    unit: "dBFS",
  },
};

function formatDb(value: number): string {
  if (!Number.isFinite(value)) return "−∞";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

export function AudioNormalizeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { files, add, remove, clear, error: dropError, loading } = useMediaFiles({ accept: "audio" });
  const entry = files[0];

  const [decoded, setDecoded] = React.useState<{ id: string; audio: PcmAudio } | null>(null);
  const [decoding, setDecoding] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [target, setTarget] = React.useState(-1);
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
        if (!cancelled) setDecoded({ id: entry.id, audio });
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
  const peakDb = audio ? amplitudeToDb(peakAmplitude(audio)) : -Infinity;
  const gainDb = audio && Number.isFinite(peakDb) ? target - peakDb : 0;

  const run = () => {
    if (!audio || !entry) return;
    setBusy(true);
    setError(null);
    try {
      const result = normalizeAudio(audio, target);
      setOutput({
        blob: wavBlob(result.audio),
        name: `${baseName(entry.name)}-normalized.wav`,
        note: `${formatDuration(duration, true)} · ${t.resultNote}`,
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
          <OptionBar>
            <OptionField label={t.peak}>
              <span className="font-mono text-xs text-foreground">
                {formatDb(peakDb)} {t.unit}
              </span>
            </OptionField>

            <OptionField label={t.target}>
              <Input
                type="number"
                min={-60}
                max={0}
                step={0.5}
                value={target}
                onChange={(event) => setTarget(clamp(Number(event.target.value) || 0, -60, 0))}
                aria-label={t.target}
                size="xs"
                className="w-20 text-center font-mono"
              />
              <span className="text-[11px] text-foreground-subtle">{t.unit}</span>
            </OptionField>

            <OptionField label={t.gain}>
              <span className="font-mono text-xs text-foreground-subtle">
                {formatDb(gainDb)} dB
              </span>
            </OptionField>

            <Button
              type="button"
              size="xs"
              onClick={run}
              disabled={busy}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Gauge className="h-3.5 w-3.5" />
              )}
              {busy ? t.running : t.run}
            </Button>
          </OptionBar>

          {output && (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                <Download className="h-3.5 w-3.5" />
                {t.run}
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
