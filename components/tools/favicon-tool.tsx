"use client";

import * as React from "react";
import { Download, FileArchive, FileJson, Loader2 } from "lucide-react";
import { FilePicker } from "@/components/tools/file-picker";
import {
  CopyButton,
  ErrorNote,
  OptionBar,
  OptionField,
  Pane,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadBlob } from "@/lib/files";
import {
  buildIco,
  FAVICON_OPTIONAL_TARGETS,
  FAVICON_SIZES,
  FAVICON_TARGETS,
  faviconHtml,
  faviconManifest,
  ICO_SIZES,
  MASKABLE_INSET,
  renderFaviconPng,
  type FaviconTarget,
} from "@/lib/ico";

const COPY = {
  zh: {
    hint: "图片只在本地缩放，不会上传",
    background: "背景色",
    recommended: "推荐导出",
    optional: "可选",
    downloadAll: "打包下载",
    html: "HTML 引用",
    loading: "正在生成…",
    loadFailed: "这张图片打不开，换一张 PNG / JPG / SVG 试试",
    save: "下载",
    note: "favicon.ico 内含 16 / 32 / 48。apple-touch-icon 与 maskable 会用上面的背景色填充（iOS 与 Android 都不支持透明），maskable 的图形缩到 60% 留出裁剪安全区。上传 SVG 才会生成 favicon.svg 与 safari-pinned-tab.svg。",
  },
  en: {
    hint: "Resized on your device, never uploaded",
    background: "Background",
    recommended: "Recommended",
    optional: "Optional",
    downloadAll: "Download all",
    html: "HTML tags",
    loading: "Generating…",
    loadFailed: "This image cannot be opened — try a PNG / JPG / SVG",
    save: "Download",
    note: "favicon.ico packs 16 / 32 / 48. apple-touch-icon and the maskable icons are filled with the background above (neither iOS nor Android handle transparency); maskable artwork is scaled to 60% to stay inside the crop-safe zone. An SVG source also yields favicon.svg and safari-pinned-tab.svg.",
  },
};

interface GeneratedFile {
  target: FaviconTarget;
  bytes?: Uint8Array;
  text?: string;
  previewUrl?: string;
}

const MIME: Record<string, string> = {
  ico: "image/x-icon",
  svg: "image/svg+xml",
  png: "image/png",
  webmanifest: "application/manifest+json",
};

const RECOMMENDED = new Set(FAVICON_TARGETS.map((target) => target.id));

function mimeFor(name: string): string {
  return MIME[name.split(".").pop() ?? ""] ?? "application/octet-stream";
}

function blob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes.buffer as ArrayBuffer], { type });
}

export function FaviconTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [file, setFile] = React.useState<File | null>(null);
  const [files, setFiles] = React.useState<GeneratedFile[]>([]);
  const [background, setBackground] = React.useState("#ffffff");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const bitmap = React.useRef<ImageBitmap | null>(null);
  const vector = React.useRef<string | null>(null);
  const urls = React.useRef<string[]>([]);
  const runId = React.useRef(0);

  const releaseUrls = React.useCallback(() => {
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current = [];
  }, []);

  React.useEffect(() => releaseUrls, [releaseUrls]);

  const build = async (source: ImageBitmap, plate: string) => {
    const created: string[] = [];
    const track = (value: Blob) => {
      const url = URL.createObjectURL(value);
      created.push(url);
      return url;
    };

    const pngs = new Map<number, Uint8Array>();
    for (const size of FAVICON_SIZES) {
      pngs.set(size, await renderFaviconPng(source, size));
    }
    const ico = buildIco(ICO_SIZES.map((size) => ({ size, png: pngs.get(size)! })));

    const plated = new Map<string, Uint8Array>();
    for (const target of [...FAVICON_TARGETS, ...FAVICON_OPTIONAL_TARGETS]) {
      if (target.kind === "maskable") {
        plated.set(
          target.id,
          await renderFaviconPng(source, target.size!, {
            background: plate,
            scale: MASKABLE_INSET,
          })
        );
      } else if (target.kind === "png" && target.background) {
        plated.set(target.id, await renderFaviconPng(source, target.size!, { background: plate }));
      }
    }

    const next: GeneratedFile[] = [];
    for (const target of [...FAVICON_TARGETS, ...FAVICON_OPTIONAL_TARGETS]) {
      if (target.kind === "svg") {
        if (!vector.current) continue;
        const markup = vector.current;
        next.push({
          target,
          text: markup,
          previewUrl: track(new Blob([markup], { type: "image/svg+xml" })),
        });
      } else if (target.kind === "ico") {
        next.push({ target, bytes: ico, previewUrl: track(blob(pngs.get(32)!, "image/png")) });
      } else if (target.kind === "png" || target.kind === "maskable") {
        const bytes = plated.get(target.id) ?? pngs.get(target.size!)!;
        next.push({ target, bytes, previewUrl: track(blob(bytes, "image/png")) });
      } else {
        next.push({ target, text: faviconManifest(plate) });
      }
    }

    return { next, created };
  };

  const run = async (source: ImageBitmap, plate: string) => {
    const id = ++runId.current;
    setBusy(true);
    try {
      const { next, created } = await build(source, plate);
      if (id !== runId.current) {
        for (const url of created) URL.revokeObjectURL(url);
        return;
      }
      releaseUrls();
      urls.current = created;
      setFiles(next);
    } catch {
      if (id === runId.current) setError(t.loadFailed);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  };

  const reset = () => {
    runId.current += 1;
    releaseUrls();
    bitmap.current?.close();
    bitmap.current = null;
    vector.current = null;
    setFile(null);
    setFiles([]);
    setError(null);
  };

  const load = async (picked: File) => {
    releaseUrls();
    setFiles([]);
    setError(null);
    setBusy(true);
    try {
      const isVector = picked.type === "image/svg+xml" || /\.svg$/i.test(picked.name);
      vector.current = isVector ? await picked.text() : null;
      const source = await createImageBitmap(picked);
      bitmap.current?.close();
      bitmap.current = source;
      setFile(picked);
      await run(source, background);
    } catch {
      setError(t.loadFailed);
      setBusy(false);
    }
  };

  const saveFile = (entry: GeneratedFile) => {
    const type = mimeFor(entry.target.name);
    downloadBlob(
      entry.text !== undefined ? new Blob([entry.text], { type }) : blob(entry.bytes!, type),
      entry.target.name
    );
  };

  const downloadAll = async () => {
    if (files.length === 0) return;
    const { zipSync } = await import("fflate");
    const encoder = new TextEncoder();
    const payload: Record<string, Uint8Array> = {};
    for (const entry of files) {
      payload[entry.target.name] =
        entry.text !== undefined ? encoder.encode(entry.text) : entry.bytes!;
    }
    downloadBlob(
      new Blob([zipSync(payload, { level: 0 })], { type: "application/zip" }),
      "favicon.zip"
    );
  };

  const metaFor = (target: FaviconTarget) => {
    if (target.kind === "ico") return ICO_SIZES.join(" / ");
    if (target.size) return `${target.size}×${target.size}`;
    return target.kind === "manifest" ? "JSON" : "SVG";
  };

  const renderRow = (entry: GeneratedFile) => (
    <div key={entry.target.id} className="flex items-center gap-3 px-3 py-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded border border-border bg-hover-bg">
        {entry.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.previewUrl}
            alt=""
            className="max-h-7 max-w-7 [image-rendering:pixelated]"
          />
        ) : (
          <FileJson className="h-3.5 w-3.5 text-foreground-faint" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[12px] text-foreground">{entry.target.name}</p>
        <p className="truncate text-[11px] text-foreground-faint">
          {entry.target.purpose[locale]}
        </p>
      </div>
      <span className="shrink-0 font-mono text-[11px] text-foreground-faint">
        {metaFor(entry.target)}
      </span>
      <button
        type="button"
        onClick={() => saveFile(entry)}
        aria-label={`${t.save} ${entry.target.name}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-foreground-muted transition-colors hover:bg-hover-bg hover:text-foreground"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const recommended = files.filter((entry) => RECOMMENDED.has(entry.target.id));
  const optional = files.filter((entry) => !RECOMMENDED.has(entry.target.id));

  return (
    <div className="flex flex-col gap-3">
      <FilePicker
        files={file ? [file] : []}
        accept="image/*,.svg"
        loading={busy}
        hint={t.hint}
        onAdd={(list) => {
          const picked = list?.[0];
          if (picked) void load(picked);
        }}
        onRemove={reset}
        onClear={reset}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {files.length > 0 && (
        <>
          <OptionBar>
            <OptionField label={t.background}>
              <Input
                type="color"
                value={background}
                onChange={(event) => {
                  setBackground(event.target.value);
                  if (bitmap.current) void run(bitmap.current, event.target.value);
                }}
                aria-label={t.background}
                size="xs"
                className="h-8 w-10 cursor-pointer p-1"
              />
            </OptionField>
            <Button
              type="button"
              size="xs"
              onClick={() => void downloadAll()}
              className="ml-auto gap-1.5"
            >
              <FileArchive className="h-3.5 w-3.5" />
              {t.downloadAll}
            </Button>
          </OptionBar>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <p className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
              {t.recommended}
            </p>
            <div className="divide-y divide-border">{recommended.map(renderRow)}</div>
          </div>

          {optional.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <p className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                {t.optional}
              </p>
              <div className="divide-y divide-border">{optional.map(renderRow)}</div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane label={t.html} actions={<CopyButton value={faviconHtml()} />}>
              <pre className="overflow-auto whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[12px] leading-relaxed text-foreground-muted">
                {faviconHtml()}
              </pre>
            </Pane>
          </div>
        </>
      )}

      {busy && (
        <div className="flex items-center gap-2 text-xs text-foreground-subtle">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t.loading}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
