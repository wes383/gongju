"use client";

import * as React from "react";
import { Combine, Loader2 } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaDrop, useMediaFiles } from "@/components/tools/media-drop";
import { MediaResult } from "@/components/tools/media-result";
import { ErrorNote, OptionBar, OptionField } from "@/components/tools/tool-ui";
import {
  audioDuration,
  concatAudio,
  decodeAudioFile,
  formatDuration,
  wavBlob,
} from "@/lib/audio";
import { baseName } from "@/lib/files";
import { errorText } from "@/lib/errors";

const COPY = {
  zh: {
    gap: "间隔",
    seconds: "秒",
    total: "总时长",
    run: "合并为 WAV",
    running: "合并中…",
    decoding: (index: number, total: number) => `正在解码第 ${index} / ${total} 个文件…`,
    resultNote: "按列表顺序拼接",
    note: "按当前顺序拼接音频，可设置片段之间的静音间隔。所有文件都会解码到同一采样率后导出为无损 WAV。",
  },
  en: {
    gap: "Gap",
    seconds: "seconds",
    total: "Total",
    run: "Merge to WAV",
    running: "Merging…",
    decoding: (index: number, total: number) => `Decoding file ${index} of ${total}…`,
    resultNote: "Joined in list order",
    note: "Clips are joined in the order shown, with optional silence between them. Every file is resampled to a common rate and exported as lossless WAV.",
  },
};

export function AudioMergeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { files, add, remove, clear, move, error: dropError, loading } = useMediaFiles({
    accept: "audio",
    multiple: true,
  });

  const [gap, setGap] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [error, setError] = React.useState<unknown>(null);
  const [output, setOutput] = React.useState<{ blob: Blob; name: string; note: string } | null>(
    null
  );

  const totalDuration = files.reduce((sum, entry) => sum + entry.duration, 0);

  const run = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    setOutput(null);
    try {
      const parts = [];
      for (let index = 0; index < files.length; index += 1) {
        setProgress(t.decoding(index + 1, files.length));
        parts.push(await decodeAudioFile(files[index].file));
      }
      const merged = concatAudio(parts, gap);
      const duration = audioDuration(merged);
      setOutput({
        blob: wavBlob(merged),
        name: `${baseName(files[0].name)}-merged.wav`,
        note: `${formatDuration(duration, true)} · ${t.resultNote}`,
      });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <MediaDrop
        files={files}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        onMove={move}
        error={dropError}
        loading={loading}
        accept="audio"
        multiple
      />

      {files.length > 0 && (
        <OptionBar>
          <OptionField label={t.total}>
            <span className="font-mono text-xs text-foreground-subtle">
              {formatDuration(totalDuration + Math.max(0, files.length - 1) * gap, true)}
            </span>
          </OptionField>

          <OptionField label={t.gap}>
            <Input
              type="number"
              min={0}
              max={60}
              step={0.1}
              value={gap}
              onChange={(event) =>
                setGap(Math.max(0, Math.min(60, Number(event.target.value) || 0)))
              }
              aria-label={t.gap}
              size="xs"
              className="w-20 text-center font-mono"
            />
            <span className="text-[11px] text-foreground-subtle">{t.seconds}</span>
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
              <Combine className="h-3.5 w-3.5" />
            )}
            {busy ? t.running : t.run}
          </Button>
        </OptionBar>
      )}

      {progress && <p className="text-xs text-foreground-subtle">{progress}</p>}
      {error != null && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

      {output && (
        <MediaResult blob={output.blob} name={output.name} kind="audio" note={output.note} />
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
