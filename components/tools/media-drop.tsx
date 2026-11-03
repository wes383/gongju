"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  FileAudio,
  FilePlus2,
  FileVideo,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { formatDuration } from "@/lib/audio";
import { formatBytes } from "@/lib/files";
import { cn, uid } from "@/lib/utils";

export type MediaAccept = "audio" | "video" | "media";
export type MediaKind = "audio" | "video";
export type MediaError = "not-media" | "not-audio" | "not-video" | "too-large" | "read-failed";

export interface MediaEntry {
  id: string;
  file: File;
  url: string;
  name: string;
  size: number;
  type: string;
  kind: MediaKind;
  duration: number;
  width: number;
  height: number;
}

const AUDIO_EXT = /\.(mp3|wav|wave|ogg|oga|m4a|aac|flac|opus|weba|aiff?|wma)$/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov|avi|mkv)$/i;
const MAX_BYTES = 1024 * 1024 * 1024;

const COPY = {
  zh: {
    audioTitle: "拖入音频，或点击选择",
    videoTitle: "拖入视频，或点击选择",
    mediaTitle: "拖入音频或视频，或点击选择",
    dropHint: "文件只在本机处理，不会上传",
    add: "继续添加",
    remove: "移除",
    clearAll: "全部清除",
    moveUp: "上移",
    moveDown: "下移",
    total: (n: number, duration: number, size: string) =>
      `${n} 个文件 · ${formatDuration(duration)} · ${size}`,
    errors: {
      "not-media": "请选择音频或视频文件",
      "not-audio": "这个工具只接受音频文件",
      "not-video": "这个工具只接受视频文件",
      "too-large": "文件超过 1 GB，浏览器可能无法处理，请先压缩或截短",
      "read-failed": "无法读取这个文件，浏览器可能不支持它的编码格式",
    },
  },
  en: {
    audioTitle: "Drop audio here, or click to pick",
    videoTitle: "Drop a video here, or click to pick",
    mediaTitle: "Drop audio or video here, or click to pick",
    dropHint: "Processed on your device, never uploaded",
    add: "Add more",
    remove: "Remove",
    clearAll: "Clear all",
    moveUp: "Move up",
    moveDown: "Move down",
    total: (n: number, duration: number, size: string) =>
      `${n} file${n > 1 ? "s" : ""} · ${formatDuration(duration)} · ${size}`,
    errors: {
      "not-media": "Please choose an audio or video file",
      "not-audio": "This tool only accepts audio files",
      "not-video": "This tool only accepts video files",
      "too-large": "The file is over 1 GB — compress or trim it first",
      "read-failed": "Could not read this file — the browser may not support its codec",
    },
  },
};

function kindFromFile(file: File): MediaKind | null {
  if (file.type.startsWith("audio/") || AUDIO_EXT.test(file.name)) return "audio";
  if (file.type.startsWith("video/") || VIDEO_EXT.test(file.name)) return "video";
  return null;
}

function accepts(kind: MediaKind, accept: MediaAccept): boolean {
  return accept === "media" || kind === accept;
}

function mediaMetadata(
  file: File,
  kind: MediaKind
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(kind === "audio" ? "audio" : "video");
    media.preload = "metadata";

    const cleanup = () => {
      media.removeEventListener("loadedmetadata", onLoaded);
      media.removeEventListener("error", onError);
      window.clearTimeout(timer);
      media.removeAttribute("src");
      media.load();
      URL.revokeObjectURL(url);
    };
    const onLoaded = () => {
      const duration = Number.isFinite(media.duration) ? media.duration : 0;
      const width = media instanceof HTMLVideoElement ? media.videoWidth : 0;
      const height = media instanceof HTMLVideoElement ? media.videoHeight : 0;
      cleanup();
      resolve({ duration, width, height });
    };
    const onError = () => {
      cleanup();
      reject(new Error("read-failed"));
    };
    const timer = window.setTimeout(onError, 15000);

    media.addEventListener("loadedmetadata", onLoaded, { once: true });
    media.addEventListener("error", onError, { once: true });
    media.src = url;
  });
}

/** Load media files and keep their metadata plus object URLs in sync. */
export function useMediaFiles({
  accept = "audio",
  multiple = false,
  limit = 20,
  maxBytes = MAX_BYTES,
}: {
  accept?: MediaAccept;
  multiple?: boolean;
  limit?: number;
  maxBytes?: number;
} = {}) {
  const [files, setFiles] = React.useState<MediaEntry[]>([]);
  const [error, setError] = React.useState<MediaError | null>(null);
  const [loading, setLoading] = React.useState(false);
  const urls = React.useRef(new Set<string>());

  React.useEffect(() => {
    const live = new Set(files.map((entry) => entry.url));
    urls.current.forEach((url) => {
      if (!live.has(url)) {
        URL.revokeObjectURL(url);
        urls.current.delete(url);
      }
    });
  }, [files]);

  React.useEffect(() => {
    const owned = urls.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);

  const add = React.useCallback(
    async (input: FileList | File[] | null) => {
      const list = input ? Array.from(input) : [];
      if (list.length === 0) return;
      setLoading(true);
      setError(null);
      const loaded: MediaEntry[] = [];

      for (const file of list) {
        const kind = kindFromFile(file);
        if (!kind) {
          setError("not-media");
          continue;
        }
        if (!accepts(kind, accept)) {
          setError(accept === "audio" ? "not-audio" : "not-video");
          continue;
        }
        if (file.size > maxBytes) {
          setError("too-large");
          continue;
        }

        try {
          const metadata = await mediaMetadata(file, kind);
          const url = URL.createObjectURL(file);
          urls.current.add(url);
          loaded.push({
            id: uid(kind),
            file,
            url,
            name: file.name,
            size: file.size,
            type: file.type || file.name.split(".").pop()?.toUpperCase() || kind,
            kind,
            ...metadata,
          });
        } catch {
          setError("read-failed");
        }
      }

      if (loaded.length > 0) {
        setFiles((previous) => {
          if (!multiple) return loaded.slice(-1);
          const merged = [...previous, ...loaded];
          return merged.slice(Math.max(0, merged.length - limit));
        });
      }
      setLoading(false);
    },
    [accept, limit, maxBytes, multiple]
  );

  const remove = React.useCallback((id: string) => {
    setFiles((previous) => previous.filter((entry) => entry.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  const move = React.useCallback((id: string, delta: number) => {
    setFiles((previous) => {
      const index = previous.findIndex((entry) => entry.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  return { files, add, remove, clear, move, error, loading, setError };
}

export function MediaDrop({
  files,
  onAdd,
  onRemove,
  onClear,
  onMove,
  error,
  loading,
  accept = "audio",
  multiple = false,
  hint,
  className,
}: {
  files: MediaEntry[];
  onAdd: (files: FileList | File[] | null) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onMove?: (id: string, delta: number) => void;
  error?: MediaError | null;
  loading?: boolean;
  accept?: MediaAccept;
  multiple?: boolean;
  hint?: string;
  className?: string;
}) {
  const t = useCopy(COPY);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const open = () => inputRef.current?.click();
  const totalDuration = files.reduce((sum, entry) => sum + entry.duration, 0);
  const totalSize = files.reduce((sum, entry) => sum + entry.size, 0);
  const title =
    accept === "audio" ? t.audioTitle : accept === "video" ? t.videoTitle : t.mediaTitle;
  const acceptAttr =
    accept === "audio"
      ? "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus"
      : accept === "video"
        ? "video/*,.mp4,.webm,.mov,.m4v"
        : "audio/*,video/*,.mp3,.wav,.m4a,.aac,.flac,.mp4,.webm,.mov,.m4v";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onAdd(event.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border border-dashed border-border-strong bg-surface transition-colors duration-base ease-out",
          dragging && "border-accent bg-hover-bg"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptAttr}
          multiple={multiple}
          className="hidden"
          onChange={(event) => {
            onAdd(event.target.files);
            event.target.value = "";
          }}
        />

        {files.length === 0 ? (
          <button
            type="button"
            onClick={open}
            className="flex w-full flex-col items-center gap-2 px-6 py-12 text-center transition-colors duration-base ease-out hover:bg-hover-bg"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
            ) : (
              <Upload className="h-6 w-6 text-foreground-subtle" />
            )}
            <span className="text-sm font-medium text-foreground">{title}</span>
            <span className="text-xs text-foreground-subtle">{hint ?? t.dropHint}</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            <ul className="flex flex-col gap-1.5">
              {files.map((entry, index) => {
                const Icon = entry.kind === "audio" ? FileAudio : FileVideo;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-foreground-subtle" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground" title={entry.name}>
                        {entry.name}
                      </p>
                      <p className="text-[11px] text-foreground-subtle">
                        {formatDuration(entry.duration)}
                        {entry.kind === "video" && entry.width > 0
                          ? ` · ${entry.width}×${entry.height}`
                          : ""}
                        {` · ${formatBytes(entry.size)}`}
                      </p>
                    </div>
                    {onMove && files.length > 1 && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onMove(entry.id, -1)}
                          disabled={index === 0}
                          aria-label={t.moveUp}
                          className="grid h-6 w-6 place-items-center rounded text-foreground-subtle transition-colors hover:bg-hover-bg hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMove(entry.id, 1)}
                          disabled={index === files.length - 1}
                          aria-label={t.moveDown}
                          className="grid h-6 w-6 place-items-center rounded text-foreground-subtle transition-colors hover:bg-hover-bg hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemove(entry.id)}
                      aria-label={`${t.remove} ${entry.name}`}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded text-foreground-faint transition-colors hover:bg-hover-bg hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between gap-2 text-[11px] text-foreground-subtle">
              <span>{t.total(files.length, totalDuration, formatBytes(totalSize))}</span>
              <div className="flex items-center gap-2">
                {multiple && (
                  <button
                    type="button"
                    onClick={open}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors duration-base ease-out hover:bg-hover-bg hover:text-foreground"
                  >
                    <FilePlus2 className="h-3 w-3" />
                    {t.add}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded px-1.5 py-0.5 transition-colors duration-base ease-out hover:bg-hover-bg hover:text-foreground"
                >
                  {t.clearAll}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-fg">{t.errors[error]}</p>}
    </div>
  );
}
