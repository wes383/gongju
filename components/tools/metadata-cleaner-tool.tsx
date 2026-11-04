"use client";

import * as React from "react";
import { Download, Eraser, FileArchive, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilePicker, fileKey } from "@/components/tools/file-picker";
import { OptionBar } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { downloadBlob, downloadZip, formatBytes } from "@/lib/files";
import { cleanFileMetadata, detectMetadataKind, type CleanResult } from "@/lib/metadata";

const ACCEPT =
  ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

type RowState =
  | { status: "working" }
  | { status: "done"; result: CleanResult }
  | { status: "error"; message: string };

const COPY = {
  zh: {
    run: "清除元数据",
    running: "处理中…",
    zip: "打包下载",
    download: "下载",
    hint: "支持 JPG / PNG / WebP 与 PDF，文件只在本机处理",
    unsupported: "不支持",
    working: "处理中",
    done: "已清理",
    failed: "失败",
    original: "原文件",
    cleaned: "清理后",
    removed: (n: number) => `移除 ${n} 项`,
    image: "图片",
    pdf: "PDF",
    note: "图片会被解码后重新编码，EXIF、GPS、缩略图、ICC 配置与文字块全部丢弃，JPEG 因此会再压缩一次；PDF 只清空信息字典与 XMP 元数据流，页面内容保持不变。其他格式（如 DOCX、MP4）浏览器无法安全重写，这里不处理。",
    local: "所有处理都在浏览器内完成，文件不会上传。",
  },
  en: {
    run: "Strip metadata",
    running: "Working…",
    zip: "Download all as ZIP",
    download: "Download",
    hint: "Supports JPG / PNG / WebP and PDF, processed on your device",
    unsupported: "Unsupported",
    working: "Working",
    done: "Cleaned",
    failed: "Failed",
    original: "Original",
    cleaned: "Cleaned",
    removed: (n: number) => `${n} entr${n === 1 ? "y" : "ies"} removed`,
    image: "Image",
    pdf: "PDF",
    note: "Images are decoded and re-encoded, which drops EXIF, GPS, thumbnails, ICC profiles and text chunks — JPEG pays one extra compression pass. PDFs only lose the info dictionary and the XMP stream; page content is untouched. Other formats (DOCX, MP4) cannot be rewritten safely in a browser and are skipped.",
    local: "Everything runs in the browser, files are never uploaded.",
  },
};

export function MetadataCleanerTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [files, setFiles] = React.useState<File[]>([]);
  const [states, setStates] = React.useState<Record<string, RowState>>({});
  const [busy, setBusy] = React.useState(false);

  const cleaned = files
    .map((file) => ({ file, state: states[fileKey(file)] }))
    .filter((row): row is { file: File; state: { status: "done"; result: CleanResult } } =>
      row.state?.status === "done"
    );

  const run = async () => {
    if (files.length === 0) return;
    setBusy(true);

    for (const file of files) {
      const key = fileKey(file);
      setStates((prev) => ({ ...prev, [key]: { status: "working" } }));
      try {
        const result = await cleanFileMetadata(file);
        setStates((prev) => ({ ...prev, [key]: { status: "done", result } }));
      } catch (err) {
        setStates((prev) => ({
          ...prev,
          [key]: { status: "error", message: errorText(err, locale) },
        }));
      }
    }

    setBusy(false);
  };

  const downloadAll = () => {
    if (cleaned.length === 0) return;
    void downloadZip(
      cleaned.map((row) => ({ name: row.state.result.name, blob: row.state.result.blob })),
      "metadata-cleaned.zip"
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        files={files}
        accept={ACCEPT}
        multiple
        hint={t.hint}
        onAdd={(list) => {
          const picked = list ? Array.from(list) : [];
          if (picked.length === 0) return;
          setFiles((prev) => {
            const seen = new Set(prev.map(fileKey));
            return [...prev, ...picked.filter((file) => !seen.has(fileKey(file)))];
          });
        }}
        onRemove={(key) => setFiles((prev) => prev.filter((file) => fileKey(file) !== key))}
        onClear={() => {
          setFiles([]);
          setStates({});
        }}
      />

      <OptionBar>
        <span className="text-xs text-foreground-subtle">
          {cleaned.length > 0 ? `${cleaned.length} / ${files.length}` : t.local}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="gap-1.5"
            disabled={cleaned.length === 0 || busy}
            onClick={downloadAll}
          >
            <FileArchive className="h-3.5 w-3.5" />
            {t.zip}
          </Button>
          <Button
            type="button"
            size="xs"
            className="gap-1.5"
            disabled={files.length === 0 || busy}
            onClick={run}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eraser className="h-3.5 w-3.5" />
            )}
            {busy ? t.running : t.run}
          </Button>
        </div>
      </OptionBar>

      {files.length > 0 && (
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <ul className="divide-y divide-border">
            {files.map((file) => {
              const key = fileKey(file);
              const state = states[key];
              const kind = detectMetadataKind(file);
              return (
                <li key={key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground" title={file.name}>
                      {file.name}
                    </p>
                    <p className="font-mono text-[11px] text-foreground-subtle">
                      {formatBytes(file.size)}
                      {state?.status === "done" && (
                        <>
                          {" → "}
                          {formatBytes(state.result.blob.size)}
                          <span className="ml-2">{t.removed(state.result.removed)}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <Badge variant="secondary" size="sm">
                    {kind === "image" ? t.image : kind === "pdf" ? t.pdf : t.unsupported}
                  </Badge>

                  {state?.status === "working" && (
                    <span className="flex items-center gap-1.5 text-[11px] text-foreground-subtle">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t.working}
                    </span>
                  )}

                  {state?.status === "done" && (
                    <>
                      <span className="text-[11px] text-green-fg">{t.done}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t.download}
                        title={t.download}
                        onClick={() => downloadBlob(state.result.blob, state.result.name)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}

                  {state?.status === "error" && (
                    <span className="max-w-64 text-[11px] text-red-fg">{state.message}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-1 text-xs leading-relaxed text-foreground-subtle">
        <p>{t.note}</p>
        <p>{t.local}</p>
      </div>
    </div>
  );
}
