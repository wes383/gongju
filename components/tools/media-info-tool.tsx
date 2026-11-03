"use client";

import * as React from "react";
import { CopyCheck, Copy, Info } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { MediaDrop, useMediaFiles } from "@/components/tools/media-drop";
import { ErrorNote } from "@/components/tools/tool-ui";
import { audioDuration, decodeAudioFile, formatDuration } from "@/lib/audio";
import { errorText } from "@/lib/errors";
import { formatBytes } from "@/lib/files";

const COPY = {
  zh: {
    property: "属性",
    value: "值",
    fileName: "文件名",
    fileSize: "文件大小",
    mimeType: "MIME 类型",
    kind: "媒体类型",
    duration: "时长",
    resolution: "分辨率",
    aspect: "画面比例",
    sampleRate: "采样率",
    channels: "声道数",
    bitrate: "估算码率",
    audio: "音频",
    video: "视频",
    copyAll: "复制全部",
    copied: "已复制",
    analyzing: "正在读取音频参数…",
    note: "文件属性来自浏览器可读取的元数据；采样率、声道数与码率由本机解码后估算，不同编码可能略有出入。全程不上传文件。",
    unknown: "未知",
  },
  en: {
    property: "Property",
    value: "Value",
    fileName: "File name",
    fileSize: "File size",
    mimeType: "MIME type",
    kind: "Media type",
    duration: "Duration",
    resolution: "Resolution",
    aspect: "Aspect ratio",
    sampleRate: "Sample rate",
    channels: "Channels",
    bitrate: "Est. bitrate",
    audio: "Audio",
    video: "Video",
    copyAll: "Copy all",
    copied: "Copied",
    analyzing: "Reading audio parameters…",
    note: "File properties come from browser-readable metadata; sample rate, channels and bitrate are estimated after local decoding and may vary by codec. Nothing is uploaded.",
    unknown: "Unknown",
  },
};

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function aspectLabel(width: number, height: number): string {
  if (!width || !height) return "";
  const divisor = gcd(width, height) || 1;
  const w = width / divisor;
  const h = height / divisor;
  // Reduce common large ratios to the familiar 16:9 / 4:3 style labels.
  if (w > 40 || h > 40) {
    const ratio = width / height;
    const known: Array<[number, string]> = [
      [16 / 9, "16:9"],
      [4 / 3, "4:3"],
      [21 / 9, "21:9"],
      [3 / 2, "3:2"],
      [1, "1:1"],
      [9 / 16, "9:16"],
    ];
    for (const [value, label] of known) {
      if (Math.abs(ratio - value) < 0.02) return label;
    }
    return ratio.toFixed(3);
  }
  return `${w}:${h}`;
}

export function MediaInfoTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { files, add, remove, clear, error: dropError, loading } = useMediaFiles({
    accept: "media",
  });
  const entry = files[0];

  const [audioInfo, setAudioInfo] = React.useState<{
    id: string;
    sampleRate: number;
    channels: number;
  } | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!entry) {
      setAudioInfo(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setAnalyzing(true);
    setError(null);

    decodeAudioFile(entry.file)
      .then((audio) => {
        if (cancelled) return;
        setAudioInfo({
          id: entry.id,
          sampleRate: audio.sampleRate,
          channels: audio.channels.length,
        });
      })
      .catch(() => {
        // Video without an audio track, or an undecodable codec: skip audio rows.
        if (!cancelled) setAudioInfo(null);
      })
      .finally(() => {
        if (!cancelled) setAnalyzing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [entry]);

  const rows = React.useMemo(() => {
    if (!entry) return [];
    return [
      { key: "name", label: t.fileName, value: entry.name },
      { key: "size", label: t.fileSize, value: formatBytes(entry.size) },
      { key: "type", label: t.mimeType, value: entry.type || t.unknown },
      {
        key: "kind",
        label: t.kind,
        value: entry.kind === "audio" ? t.audio : t.video,
      },
      { key: "duration", label: t.duration, value: formatDuration(entry.duration, true) },
    ];
  }, [entry, t]);

  const extraRows = React.useMemo(() => {
    if (!entry) return [];
    const list: Array<{ key: string; label: string; value: string }> = [];
    if (entry.kind === "video" && entry.width > 0) {
      list.push({
        key: "resolution",
        label: t.resolution,
        value: `${entry.width} × ${entry.height}`,
      });
      list.push({
        key: "aspect",
        label: t.aspect,
        value: aspectLabel(entry.width, entry.height),
      });
    }
    if (audioInfo && audioInfo.id === entry.id) {
      list.push({
        key: "sampleRate",
        label: t.sampleRate,
        value: `${audioInfo.sampleRate.toLocaleString()} Hz`,
      });
      list.push({
        key: "channels",
        label: t.channels,
        value: String(audioInfo.channels),
      });
    }
    if (entry.duration > 0 && entry.size > 0) {
      const bitrate = Math.round((entry.size * 8) / entry.duration / 1000);
      list.push({
        key: "bitrate",
        label: t.bitrate,
        value: `${bitrate.toLocaleString()} kbps`,
      });
    }
    return list;
  }, [entry, audioInfo, t]);

  const allRows = [...rows, ...extraRows];

  const copyAll = async () => {
    const text = allRows.map((row) => `${row.label}: ${row.value}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
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
        accept="media"
      />

      {analyzing && (
        <p className="text-xs text-foreground-subtle">{t.analyzing}</p>
      )}
      {error != null && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

      {entry && allRows.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Info className="h-4 w-4 shrink-0 text-foreground-subtle" />
            <p className="flex-1 text-xs font-medium text-foreground">{t.property}</p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="shrink-0 gap-1.5"
              onClick={copyAll}
            >
              {copied ? (
                <CopyCheck className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? t.copied : t.copyAll}
            </Button>
          </header>
          <dl className="divide-y divide-border">
            {allRows.map((row) => (
              <div
                key={row.key}
                className="flex items-start gap-4 px-3 py-2 text-xs even:bg-hover-bg/40"
              >
                <dt className="w-28 shrink-0 text-foreground-muted">{row.label}</dt>
                <dd className="min-w-0 flex-1 break-all font-mono text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
