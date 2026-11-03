"use client";

import * as React from "react";
import { CopyCheck, Copy, Info } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { MediaDrop, useMediaFiles } from "@/components/tools/media-drop";
import {
  amplitudeToDb,
  decodeAudioFile,
  formatDuration,
  peakAmplitude,
  rmsAmplitude,
} from "@/lib/audio";
import { formatBytes } from "@/lib/files";
import {
  parseMediaContainer,
  probePlaybackSupport,
  readMediaBytes,
  type PlaybackSupport,
} from "@/lib/media-container";
import type { MediaContainerInfo, MediaTrackInfo } from "@/lib/media-bytes";

const COPY = {
  zh: {
    property: "属性",
    groupFile: "文件信息",
    groupVideo: "视频",
    groupAudio: "音频",
    groupTracks: "轨道",
    groupTags: "标签",
    groupPlayback: "解码能力",
    fileName: "文件名",
    fileSize: "文件大小",
    mimeType: "MIME 类型",
    kind: "媒体类型",
    container: "容器格式",
    brands: "兼容品牌",
    duration: "时长",
    overallBitrate: "总码率",
    resolution: "分辨率",
    aspect: "画面比例",
    frameRate: "帧率",
    codec: "编码格式",
    bitDepth: "位深",
    rotation: "旋转",
    colorSpace: "色彩空间",
    dynamicRange: "动态范围",
    hdr: "HDR",
    videoBitrate: "视频码率",
    sampleRate: "采样率",
    channels: "声道数",
    audioBitrate: "音频码率",
    peak: "峰值电平",
    rms: "平均电平 (RMS)",
    trackCount: "轨道数量",
    track: "轨道",
    languages: "轨道语言",
    creationTime: "创建时间",
    encoder: "编码器",
    title: "标题",
    artist: "艺术家",
    album: "专辑",
    date: "日期",
    genre: "类型",
    comment: "备注",
    playback: "播放支持",
    supported: "支持",
    unsupported: "不支持",
    smooth: "平滑播放",
    powerEfficient: "省电解码",
    estimated: "估算",
    audio: "音频",
    video: "视频",
    copyAll: "复制全部",
    copied: "已复制",
    analyzing: "正在读取容器头与音频参数…",
    note: "属性优先取自容器头信息；采样率、声道、位深与码率来自编码器写入的值，缺失时回退到浏览器解码或按文件大小估算（标为「估算」）；峰值与 RMS 由本机解码计算。全程不上传文件。",
    unknown: "未知",
  },
  en: {
    property: "Property",
    groupFile: "File",
    groupVideo: "Video",
    groupAudio: "Audio",
    groupTracks: "Tracks",
    groupTags: "Tags",
    groupPlayback: "Playback",
    fileName: "File name",
    fileSize: "File size",
    mimeType: "MIME type",
    kind: "Media type",
    container: "Container",
    brands: "Brands",
    duration: "Duration",
    overallBitrate: "Overall bitrate",
    resolution: "Resolution",
    aspect: "Aspect ratio",
    frameRate: "Frame rate",
    codec: "Codec",
    bitDepth: "Bit depth",
    rotation: "Rotation",
    colorSpace: "Color space",
    dynamicRange: "Dynamic range",
    hdr: "HDR",
    videoBitrate: "Video bitrate",
    sampleRate: "Sample rate",
    channels: "Channels",
    audioBitrate: "Audio bitrate",
    peak: "Peak level",
    rms: "Average level (RMS)",
    trackCount: "Track count",
    track: "Track",
    languages: "Track languages",
    creationTime: "Creation time",
    encoder: "Encoder",
    title: "Title",
    artist: "Artist",
    album: "Album",
    date: "Date",
    genre: "Genre",
    comment: "Comment",
    playback: "Playback support",
    supported: "Supported",
    unsupported: "Not supported",
    smooth: "Smooth playback",
    powerEfficient: "Power efficient",
    estimated: "estimated",
    audio: "Audio",
    video: "Video",
    copyAll: "Copy all",
    copied: "Copied",
    analyzing: "Reading container headers and audio parameters…",
    note: "Properties come from container headers first; sample rate, channels, bit depth and bitrate are the encoder's own values, falling back to local decoding or a file-size estimate (marked as estimated). Peak and RMS are measured locally. Nothing is uploaded.",
    unknown: "Unknown",
  },
};

interface Row {
  key: string;
  label: string;
  value: string;
}

interface Group {
  key: string;
  title: string;
  rows: Row[];
}

interface DecodedAudio {
  sampleRate: number;
  channels: number;
  peakDb: number;
  rmsDb: number;
}

interface Analysis {
  id: string;
  info: MediaContainerInfo;
  decoded: DecodedAudio | null;
  support: PlaybackSupport | null;
}

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

function formatBitrate(bitsPerSecond: number): string {
  if (bitsPerSecond >= 1_000_000) {
    return `${Number((bitsPerSecond / 1_000_000).toFixed(2))} Mbps`;
  }
  return `${Math.round(bitsPerSecond / 1000).toLocaleString()} kbps`;
}

function formatFrameRate(fps: number): string {
  return `${Number(fps.toFixed(3))} fps`;
}

function formatDb(db: number): string {
  return Number.isFinite(db) ? `${db.toFixed(1)} dBFS` : "-∞ dBFS";
}

export function MediaInfoTool() {
  const t = useCopy(COPY);
  const { files, add, remove, clear, error: dropError, loading } = useMediaFiles({
    accept: "media",
  });
  const entry = files[0];

  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!entry) return;
    let cancelled = false;

    const parseTask = readMediaBytes(entry.file)
      .then((bytes) => parseMediaContainer(bytes))
      .catch(() => null);

    const decodeTask = decodeAudioFile(entry.file)
      .then((audio) => ({
        sampleRate: audio.sampleRate,
        channels: audio.channels.length,
        peakDb: amplitudeToDb(peakAmplitude(audio)),
        rmsDb: amplitudeToDb(rmsAmplitude(audio)),
      }))
      .catch(() => null);

    Promise.all([parseTask, decodeTask])
      .then(async ([info, decoded]) => {
        if (cancelled) return;
        const container: MediaContainerInfo = info ?? { tracks: [], tags: {} };
        const mime = entry.type || (entry.kind === "audio" ? "audio/mp4" : "video/mp4");
        const support = await probePlaybackSupport(mime, container);
        if (cancelled) return;
        setAnalysis({ id: entry.id, info: container, decoded, support });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [entry]);

  const analyzing = Boolean(entry) && (!analysis || analysis.id !== entry.id);

  const groups = React.useMemo<Group[]>(() => {
    if (!entry) return [];
    const current = analysis && analysis.id === entry.id ? analysis : null;
    const info = current?.info ?? null;
    const decoded = current?.decoded ?? null;
    const support = current?.support ?? null;

    const video = info?.tracks.find((track) => track.type === "video");
    const audio = info?.tracks.find((track) => track.type === "audio");
    const width = video?.width ?? entry.width;
    const height = video?.height ?? entry.height;
    const displayWidth = video?.displayWidth && video.displayHeight ? video.displayWidth : width;
    const displayHeight = video?.displayWidth && video.displayHeight ? video.displayHeight : height;
    const duration =
      info?.duration && Number.isFinite(info.duration) && info.duration > 0
        ? info.duration
        : entry.duration;

    const fileRows: Row[] = [
      { key: "name", label: t.fileName, value: entry.name },
      { key: "size", label: t.fileSize, value: formatBytes(entry.size) },
      { key: "type", label: t.mimeType, value: entry.type || t.unknown },
      { key: "kind", label: t.kind, value: entry.kind === "audio" ? t.audio : t.video },
      { key: "duration", label: t.duration, value: formatDuration(duration, true) },
    ];
    if (info?.container) {
      fileRows.push({ key: "container", label: t.container, value: info.container });
    }
    if (info?.brands && info.brands.length > 1) {
      fileRows.push({ key: "brands", label: t.brands, value: info.brands.join(", ") });
    }
    if (info?.overallBitrate) {
      fileRows.push({
        key: "overallBitrate",
        label: t.overallBitrate,
        value: `≈ ${formatBitrate(info.overallBitrate)} (${t.estimated})`,
      });
    }

    const videoRows: Row[] = [];
    if (video || entry.kind === "video") {
      if (width > 0 && height > 0) {
        videoRows.push({
          key: "resolution",
          label: t.resolution,
          value: `${width} × ${height}`,
        });
        videoRows.push({
          key: "aspect",
          label: t.aspect,
          value: aspectLabel(displayWidth, displayHeight),
        });
      }
      if (video?.frameRate) {
        videoRows.push({
          key: "frameRate",
          label: t.frameRate,
          value: formatFrameRate(video.frameRate),
        });
      }
      if (video?.codec) {
        videoRows.push({ key: "codec", label: t.codec, value: video.codec });
      }
      if (video?.bitDepth) {
        videoRows.push({
          key: "videoBitDepth",
          label: t.bitDepth,
          value: `${video.bitDepth} bit`,
        });
      }
      if (video?.rotation) {
        videoRows.push({
          key: "rotation",
          label: t.rotation,
          value: `${video.rotation}°`,
        });
      }
      if (video?.colorSpace) {
        videoRows.push({ key: "colorSpace", label: t.colorSpace, value: video.colorSpace });
      }
      if (video?.hdr !== undefined) {
        videoRows.push({
          key: "dynamicRange",
          label: t.dynamicRange,
          value: video.hdr ? "HDR" : "SDR",
        });
      }
      if (video?.bitrate) {
        videoRows.push({
          key: "videoBitrate",
          label: t.videoBitrate,
          value: `${formatBitrate(video.bitrate)}${video.bitrateEstimated ? ` (${t.estimated})` : ""}`,
        });
      }
    }

    const audioRows: Row[] = [];
    if (audio || entry.kind === "audio" || decoded) {
      const sampleRate = audio?.sampleRate ?? decoded?.sampleRate ?? 0;
      const channels = audio?.channels ?? decoded?.channels ?? 0;
      if (audio?.codec) {
        audioRows.push({ key: "audioCodec", label: t.codec, value: audio.codec });
      }
      if (sampleRate > 0) {
        audioRows.push({
          key: "sampleRate",
          label: t.sampleRate,
          value: `${sampleRate.toLocaleString()} Hz`,
        });
      }
      if (channels > 0) {
        audioRows.push({
          key: "channels",
          label: t.channels,
          value: audio?.channelLayout
            ? `${channels} (${audio.channelLayout})`
            : String(channels),
        });
      }
      if (audio?.bitDepth) {
        audioRows.push({
          key: "audioBitDepth",
          label: t.bitDepth,
          value: `${audio.bitDepth} bit`,
        });
      }
      if (audio?.bitrate) {
        audioRows.push({
          key: "audioBitrate",
          label: t.audioBitrate,
          value: `${formatBitrate(audio.bitrate)}${audio.bitrateEstimated ? ` (${t.estimated})` : ""}`,
        });
      }
      if (decoded) {
        audioRows.push({ key: "peak", label: t.peak, value: formatDb(decoded.peakDb) });
        audioRows.push({ key: "rms", label: t.rms, value: formatDb(decoded.rmsDb) });
      }
    }

    const trackRows: Row[] = [];
    if (info && info.tracks.length > 0) {
      trackRows.push({
        key: "trackCount",
        label: t.trackCount,
        value: String(info.tracks.length),
      });
      info.tracks.forEach((track, index) => {
        trackRows.push({
          key: `track-${index}`,
          label: `${t.track} ${index + 1}`,
          value: describeTrack(track, t),
        });
      });
      const languages = [...new Set(info.tracks.map((track) => track.language).filter(Boolean))];
      if (languages.length > 0) {
        trackRows.push({
          key: "languages",
          label: t.languages,
          value: languages.join(", "),
        });
      }
    }

    const tagRows: Row[] = [];
    if (info?.creationTime) {
      tagRows.push({ key: "creationTime", label: t.creationTime, value: info.creationTime });
    }
    if (info?.encoder) {
      tagRows.push({ key: "encoder", label: t.encoder, value: info.encoder });
    }
    if (info?.title) {
      tagRows.push({ key: "title", label: t.title, value: info.title });
    }
    const tagMap: Array<[string, string]> = [
      ["artist", t.artist],
      ["album", t.album],
      ["date", t.date],
      ["genre", t.genre],
      ["comment", t.comment],
    ];
    for (const [key, label] of tagMap) {
      const value = info?.tags[key];
      if (value) tagRows.push({ key: `tag-${key}`, label, value });
    }

    const playbackRows: Row[] = [];
    if (support) {
      const parts = [support.supported ? t.supported : t.unsupported];
      if (support.supported && support.smooth) parts.push(t.smooth);
      if (support.supported && support.powerEfficient) parts.push(t.powerEfficient);
      playbackRows.push({ key: "playback", label: t.playback, value: parts.join(" · ") });
    }

    return [
      { key: "file", title: t.groupFile, rows: fileRows },
      { key: "video", title: t.groupVideo, rows: videoRows },
      { key: "audio", title: t.groupAudio, rows: audioRows },
      { key: "tracks", title: t.groupTracks, rows: trackRows },
      { key: "tags", title: t.groupTags, rows: tagRows },
      { key: "playback", title: t.groupPlayback, rows: playbackRows },
    ].filter((group) => group.rows.length > 0);
  }, [entry, analysis, t]);

  const copyAll = async () => {
    const text = groups
      .map((group) =>
        [`[${group.title}]`, ...group.rows.map((row) => `${row.label}: ${row.value}`)].join("\n")
      )
      .join("\n\n");
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

      {analyzing && <p className="text-xs text-foreground-subtle">{t.analyzing}</p>}

      {entry && groups.length > 0 && (
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
          {groups.map((group) => (
            <div key={group.key} className="border-b border-border last:border-b-0">
              <p className="bg-hover-bg/40 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                {group.title}
              </p>
              <dl className="divide-y divide-border">
                {group.rows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-start gap-4 px-3 py-2 text-xs even:bg-hover-bg/40"
                  >
                    <dt className="w-28 shrink-0 text-foreground-muted">{row.label}</dt>
                    <dd className="min-w-0 flex-1 break-all font-mono text-foreground">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </section>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}

function describeTrack(track: MediaTrackInfo, t: { audio: string; video: string; unknown: string }) {
  const parts = [
    track.type === "video" ? t.video : track.type === "audio" ? t.audio : t.unknown,
  ];
  if (track.codec) parts.push(track.codec);
  if (track.language) parts.push(track.language);
  if (track.type === "video" && track.width && track.height) {
    parts.push(`${track.width}×${track.height}`);
  }
  if (track.type === "audio" && track.channels) parts.push(`${track.channels} ch`);
  return parts.join(" · ");
}
