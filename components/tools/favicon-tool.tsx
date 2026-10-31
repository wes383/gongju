"use client";

import * as React from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { FilePicker } from "@/components/tools/file-picker";
import { CopyButton, ErrorNote, OptionBar, Pane } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { downloadBlob, formatBytes } from "@/lib/files";
import {
  buildIco,
  FAVICON_SIZES,
  faviconHtml,
  ICO_SIZES,
  renderFaviconPng,
} from "@/lib/ico";

const COPY = {
  zh: {
    pick: "选择一张方形图片，最好 512×512 以上",
    hint: "图片只在本地缩放，不会上传",
    sizes: "生成的尺寸",
    downloadIco: "下载 favicon.ico",
    downloadZip: "下载全部 PNG",
    html: "HTML 引用",
    loading: "正在生成…",
    loadFailed: "这张图片打不开，换一张 PNG / JPG / SVG 试试",
    note: "按 16、32、48、64、128、180、192、512 生成 PNG，其中 16 / 32 / 48 打进 favicon.ico（内含 PNG，Windows Vista 及以上与所有现代浏览器都支持）。180 用于 iOS 主屏图标，192 / 512 用于 manifest。",
  },
  en: {
    pick: "Pick a square image, ideally 512×512 or larger",
    hint: "Resized on your device, never uploaded",
    sizes: "Generated sizes",
    downloadIco: "Download favicon.ico",
    downloadZip: "Download all PNGs",
    html: "HTML tags",
    loading: "Generating…",
    loadFailed: "This image cannot be opened — try a PNG / JPG / SVG",
    note: "PNGs are produced at 16, 32, 48, 64, 128, 180, 192 and 512; the 16 / 32 / 48 variants are packed into favicon.ico (PNG-in-ICO works on Windows Vista+ and every modern browser). 180 is the iOS home screen icon and 192 / 512 feed the web manifest.",
  },
};

interface IconFile {
  size: number;
  bytes: Uint8Array;
  url: string;
}

export function FaviconTool() {
  const t = useCopy(COPY);
  const [file, setFile] = React.useState<File | null>(null);
  const [items, setItems] = React.useState<IconFile[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const urls = React.useRef<string[]>([]);

  const releaseUrls = React.useCallback(() => {
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current = [];
  }, []);

  React.useEffect(() => releaseUrls, [releaseUrls]);

  const load = async (picked: File) => {
    releaseUrls();
    setItems([]);
    setError(null);
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(picked);
      const generated: IconFile[] = [];
      for (const size of FAVICON_SIZES) {
        const bytes = await renderFaviconPng(bitmap, size);
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "image/png" });
        generated.push({ size, bytes, url: URL.createObjectURL(blob) });
      }
      bitmap.close();
      urls.current = generated.map((item) => item.url);
      setItems(generated);
    } catch {
      setError(t.loadFailed);
    } finally {
      setBusy(false);
    }
  };

  const ico = React.useMemo(() => {
    if (items.length === 0) return null;
    const selected = items.filter((item) => ICO_SIZES.includes(item.size));
    if (selected.length === 0) return null;
    return buildIco(selected.map((item) => ({ size: item.size, png: item.bytes })));
  }, [items]);

  const downloadZip = async () => {
    if (items.length === 0) return;
    const { zipSync } = await import("fflate");
    const files: Record<string, Uint8Array> = {};
    for (const item of items) {
      files[`favicon-${item.size}x${item.size}.png`] = item.bytes;
    }
    const zipped = zipSync(files, { level: 0 });
    downloadBlob(new Blob([zipped], { type: "application/zip" }), "favicon.zip");
  };

  return (
    <div className="flex flex-col gap-3">
      <FilePicker
        files={file ? [file] : []}
        accept="image/*,.svg"
        loading={busy}
        hint={t.hint}
        onAdd={(list) => {
          const picked = list?.[0];
          if (!picked) return;
          setFile(picked);
          void load(picked);
        }}
        onRemove={() => {
          releaseUrls();
          setFile(null);
          setItems([]);
        }}
        onClear={() => {
          releaseUrls();
          setFile(null);
          setItems([]);
          setError(null);
        }}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {items.length > 0 && (
        <>
          <OptionBar>
            <span className="text-xs text-foreground-muted">{t.sizes}</span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={!ico}
                onClick={() => {
                  if (!ico) return;
                  downloadBlob(
                    new Blob([ico.buffer as ArrayBuffer], { type: "image/x-icon" }),
                    "favicon.ico"
                  );
                }}
                className="gap-1.5 text-foreground-muted"
              >
                <Download className="h-3.5 w-3.5" />
                {t.downloadIco}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => void downloadZip()}
                className="gap-1.5 text-foreground-muted"
              >
                <FileArchive className="h-3.5 w-3.5" />
                {t.downloadZip}
              </Button>
            </div>
          </OptionBar>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {items.map((item) => (
              <div
                key={item.size}
                className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3"
              >
                <div className="grid h-24 w-24 place-items-center rounded-md bg-hover-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={`${item.size}×${item.size}`}
                    className="max-h-20 max-w-20 [image-rendering:pixelated]"
                  />
                </div>
                <div className="text-center">
                  <p className="font-mono text-[11px] text-foreground">
                    {item.size} × {item.size}
                  </p>
                  <p className="font-mono text-[10px] text-foreground-faint">
                    {formatBytes(item.bytes.byteLength)}
                  </p>
                </div>
                <a
                  href={item.url}
                  download={`favicon-${item.size}x${item.size}.png`}
                  className="text-[11px] text-foreground-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  PNG
                </a>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.html}
              actions={<CopyButton value={faviconHtml()} />}
            >
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
