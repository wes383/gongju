"use client";

import * as React from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePicker } from "@/components/tools/file-picker";
import { ErrorNote, OptionBar, OptionField, Segmented, Toggle, WarningNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { baseName, downloadBlob, formatBytes } from "@/lib/files";
import { isPdfFile } from "@/lib/pdf";
import { COMPRESS_PRESETS, compressPdf } from "@/lib/pdf-compress";

const COPY = {
  zh: {
    preset: "预设",
    dpi: "渲染精度",
    quality: "JPEG 质量",
    grayscale: "转灰度",
    grayscaleHint: "文字扫描件转灰度通常能再省 30%",
    run: "开始压缩",
    running: "压缩中…",
    progress: (done: number, total: number) => `${done} / ${total} 页`,
    original: "原文件",
    compressed: "压缩后",
    ratio: "体积变化",
    download: "下载",
    notPdf: "只支持 PDF 文件",
    result: "压缩完成",
    failed: "压缩失败，可能是加密 PDF 或文件损坏",
    warning: "压缩会把每页重新渲染成图片，文字层、链接和表单字段会丢失；扫描件收益最大，纯文字 PDF 反而可能变大。",
    note: "文件在浏览器内处理，不会上传。页数较多时请保持页面打开。",
  },
  en: {
    preset: "Preset",
    dpi: "Render DPI",
    quality: "JPEG quality",
    grayscale: "Grayscale",
    grayscaleHint: "Grey scans often shrink another 30%",
    run: "Compress",
    running: "Compressing…",
    progress: (done: number, total: number) => `${done} / ${total} pages`,
    original: "Original",
    compressed: "Compressed",
    ratio: "Size change",
    download: "Download",
    notPdf: "Only PDF files are supported",
    result: "Done",
    failed: "Compression failed — the PDF may be encrypted or corrupted",
    warning: "Compression re-renders each page as an image, so the text layer, links and form fields are lost. Scans shrink the most; text-only PDFs can even grow.",
    note: "Files are processed in the browser and never uploaded. Keep the page open for large documents.",
  },
};

export function PdfCompressTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [files, setFiles] = React.useState<File[]>([]);
  const [preset, setPreset] = React.useState("balanced");
  // Manual tweaks live on top of the preset, so switching presets is a pure
  // derivation instead of an effect that rewrites state
  const [tuning, setTuning] = React.useState<{ dpi?: number; quality?: number }>({});
  const [grayscale, setGrayscale] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [error, setError] = React.useState<unknown>(null);
  const [result, setResult] = React.useState<{ blob: Blob; name: string; original: number } | null>(null);

  const file = files[0] ?? null;

  const presetConfig =
    COMPRESS_PRESETS.find((item) => item.id === preset) ?? COMPRESS_PRESETS[1];
  const dpi = tuning.dpi ?? presetConfig.dpi;
  const quality = tuning.quality ?? presetConfig.quality;

  const add = (input: FileList | null) => {
    const next = input ? Array.from(input) : [];
    if (next.length === 0) return;
    setResult(null);
    setError(null);
    if (!isPdfFile(next[0])) {
      setError(new Error(t.notPdf));
      return;
    }
    setFiles(next.slice(0, 1));
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: 0 });
    try {
      const blob = await compressPdf(
        file,
        { dpi, quality, grayscale },
        (done, total) => setProgress({ done, total })
      );
      setResult({
        blob,
        name: `${baseName(file.name, "document")}-compressed.pdf`,
        original: file.size,
      });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const change = result ? ((result.blob.size - result.original) / Math.max(1, result.original)) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        files={files}
        accept=".pdf,application/pdf"
        onAdd={add}
        onRemove={() => {
          setFiles([]);
          setResult(null);
        }}
        onClear={() => {
          setFiles([]);
          setResult(null);
        }}
        hint={t.note}
      />

      <OptionBar>
        <Segmented
          ariaLabel={t.preset}
          value={preset}
          onChange={(value) => {
            setPreset(value);
            setTuning({});
          }}
          options={COMPRESS_PRESETS.map((item) => ({
            value: item.id,
            label: locale === "zh" ? item.zh : item.en,
          }))}
        />
        <OptionField label={t.dpi}>
          <Select
            value={String(dpi)}
            onValueChange={(value) => setTuning((prev) => ({ ...prev, dpi: Number(value) }))}
          >
            <SelectTrigger size="xs" className="w-24 font-mono" aria-label={t.dpi}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[72, 96, 120, 150, 200].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value} DPI
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>
        <OptionField label={`${t.quality} ${Math.round(quality * 100)}%`}>
          <input
            type="range"
            min={30}
            max={95}
            value={Math.round(quality * 100)}
            onChange={(event) => setTuning((prev) => ({ ...prev, quality: Number(event.target.value) / 100 }))}
            className="h-1.5 w-32 cursor-pointer"
            aria-label={t.quality}
          />
        </OptionField>
        <Toggle checked={grayscale} onChange={setGrayscale} label={t.grayscale} hint={t.grayscaleHint} />
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" onClick={run} disabled={!file || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />}
            {busy ? t.running : t.run}
          </Button>
        </div>
      </OptionBar>

      {busy && progress.total > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hover-bg-strong">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-foreground-muted">
            {t.progress(progress.done, progress.total)}
          </span>
        </div>
      )}

      {error ? <ErrorNote>{errorText(error, locale)}</ErrorNote> : null}

      {result && (
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" size="sm" dot>
              {t.result}
            </Badge>
            <span className="ml-auto">
              <Button type="button" size="sm" onClick={() => downloadBlob(result.blob, result.name)}>
                <Download className="h-4 w-4" />
                {t.download}
              </Button>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-[11px] text-foreground-subtle">{t.original}</p>
              <p className="font-mono text-foreground">{formatBytes(result.original)}</p>
            </div>
            <div>
              <p className="text-[11px] text-foreground-subtle">{t.compressed}</p>
              <p className="font-mono text-foreground">{formatBytes(result.blob.size)}</p>
            </div>
            <div>
              <p className="text-[11px] text-foreground-subtle">{t.ratio}</p>
              <p className={change <= 0 ? "font-mono text-green-fg" : "font-mono text-orange-fg"}>
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}%
              </p>
            </div>
          </div>
        </section>
      )}

      <WarningNote>{t.warning}</WarningNote>
    </div>
  );
}
