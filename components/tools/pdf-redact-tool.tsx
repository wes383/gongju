"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  ScanEye,
  SquareDashed,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilePicker, fileKey } from "@/components/tools/file-picker";
import {
  ErrorNote,
  OptionBar,
  OptionField,
  WarningNote,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { codedError, errorText } from "@/lib/errors";
import { baseName, downloadBlob, formatBytes } from "@/lib/files";
import { openForRender, renderPage, type RenderablePdf } from "@/lib/pdf-render";
import { rectFromDrag, redactPdf, totalRects, type RedactRect } from "@/lib/pdf-redact";

const COPY = {
  zh: {
    prev: "上一页",
    next: "下一页",
    clearPage: "清空本页",
    removeBox: "删除这个区域",
    hint: "在预览图上拖动即可画出要涂销的区域，可画多个；点击区域右上角可以删掉重画。",
    boxes: (n: number) => `${n} 个区域`,
    dpi: "输出精度",
    run: "生成涂销版",
    running: "处理中…",
    progress: (done: number, total: number) => `${done} / ${total} 页`,
    needBoxes: "先在上面的预览里画出至少一个涂销区域",
    result: "已生成",
    download: "下载",
    size: "大小",
    notPdf: "只支持 PDF 文件",
    loading: "正在渲染预览…",
    warning: "输出会重新光栅化：文字层、批注、表单、附件和书签都会被删除，涂销区域下的内容无法再被复制或提取；代价是文件变大且无法搜索，请逐页确认涂销范围。",
    note: "文件在浏览器内处理，不会上传。涂销是彻底重建页面，而不是盖一层黑框，因此不存在「选中黑框下的文字」这种泄漏方式。",
  },
  en: {
    prev: "Previous page",
    next: "Next page",
    clearPage: "Clear this page",
    removeBox: "Remove this area",
    hint: "Drag on the preview to mark a region to burn out. Add as many as you need; click the corner to remove one.",
    boxes: (n: number) => `${n} area${n === 1 ? "" : "s"}`,
    dpi: "Output DPI",
    run: "Build redacted PDF",
    running: "Working…",
    progress: (done: number, total: number) => `${done} / ${total} pages`,
    needBoxes: "Draw at least one redaction box on the preview first",
    result: "Ready",
    download: "Download",
    size: "Size",
    notPdf: "Only PDF files are supported",
    loading: "Rendering preview…",
    warning: "The output is re-rasterised: text, annotations, forms, attachments and bookmarks are all dropped, and anything under a box can no longer be copied or extracted. The trade-off is a larger, unsearchable file — check every page.",
    note: "Files stay in the browser. Redaction rebuilds each page instead of drawing a black rectangle on top, so there is no text hiding underneath the boxes.",
  },
};

export function PdfRedactTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [files, setFiles] = React.useState<File[]>([]);
  const [pageCount, setPageCount] = React.useState(0);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [rects, setRects] = React.useState<RedactRect[][]>([]);
  const [draft, setDraft] = React.useState<RedactRect | null>(null);
  const [preview, setPreview] = React.useState<{ key: string; src: string } | null>(null);
  const [dpi, setDpi] = React.useState("150");
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState({ done: 0, total: 0 });
  const [error, setError] = React.useState<unknown>(null);
  const [result, setResult] = React.useState<{ blob: Blob; name: string } | null>(null);

  const sourceRef = React.useRef<RenderablePdf | null>(null);
  const dragRef = React.useRef<{ x: number; y: number } | null>(null);

  const file = files[0] ?? null;
  const previewKey = file ? `${fileKey(file)}-${pageIndex}` : "";
  const currentPreview = preview?.key === previewKey ? preview.src : null;
  const pageRects = rects[pageIndex] ?? [];
  const boxCount = totalRects(rects);

  // Release the pdf.js document (and its worker) when the tool unmounts
  React.useEffect(() => {
    const holder = sourceRef;
    return () => {
      void holder.current?.destroy();
      holder.current = null;
    };
  }, []);

  // The preview follows the current page; the key keeps a stale render from
  // landing on the wrong page while the tool is loading another file
  React.useEffect(() => {
    const source = sourceRef.current;
    const current = files[0];
    if (!current || !source) return;

    let cancelled = false;
    const key = `${fileKey(current)}-${pageIndex}`;
    renderPage(source.doc, pageIndex + 1, 1.4)
      .then((rendered) => {
        const src = rendered.canvas.toDataURL("image/jpeg", 0.85);
        rendered.canvas.width = 0;
        rendered.canvas.height = 0;
        if (!cancelled) setPreview({ key, src });
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });

    return () => {
      cancelled = true;
    };
  }, [files, pageIndex]);

  const load = async (picked: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      let source: RenderablePdf;
      try {
        source = await openForRender(bytes);
      } catch (err) {
        const message = err instanceof Error ? `${err.name} ${err.message}` : "";
        throw codedError(/password/i.test(message) ? "pdf.encrypted" : "pdf.invalid");
      }

      await sourceRef.current?.destroy();
      sourceRef.current = source;

      setFiles([picked]);
      setPageCount(source.doc.numPages);
      setPageIndex(0);
      setRects(Array.from({ length: source.doc.numPages }, () => []));
      setPreview(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setPageCount(0);
    setPageIndex(0);
    setRects([]);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const positionOf = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  };

  const commit = (end: { x: number; y: number }) => {
    const start = dragRef.current;
    dragRef.current = null;
    setDraft(null);
    if (!start) return;
    const box = rectFromDrag(start.x, start.y, end.x, end.y);
    if (!box) return;
    const target = pageIndex;
    setRects((prev) => prev.map((list, index) => (index === target ? [...list, box] : list)));
  };

  const run = async () => {
    if (!file) return;
    if (boxCount === 0) {
      setError(new Error(t.needBoxes));
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: pageCount });
    try {
      const blob = await redactPdf(
        file,
        rects,
        { dpi: Number(dpi), quality: 0.85 },
        (done, total) => setProgress({ done, total })
      );
      setResult({ blob, name: `${baseName(file.name, "document")}-redacted.pdf` });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        files={files}
        accept=".pdf,application/pdf"
        loading={loading}
        hint={t.note}
        onAdd={(list) => {
          const picked = list?.[0];
          if (!picked) return;
          if (!/\.pdf$/i.test(picked.name) && picked.type !== "application/pdf") {
            setError(new Error(t.notPdf));
            return;
          }
          void load(picked);
        }}
        onRemove={reset}
        onClear={reset}
      />

      {error ? <ErrorNote>{errorText(error, locale)}</ErrorNote> : null}

      {file && (
        <>
          <OptionBar>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t.prev}
                title={t.prev}
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-16 text-center font-mono text-[11px] text-foreground-muted">
                {pageIndex + 1} / {pageCount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t.next}
                title={t.next}
                disabled={pageIndex >= pageCount - 1}
                onClick={() => setPageIndex((index) => Math.min(pageCount - 1, index + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-subtle">
              <SquareDashed className="h-3.5 w-3.5" />
              {t.boxes(pageRects.length)}
            </span>

            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="gap-1.5"
              disabled={pageRects.length === 0}
              onClick={() =>
                setRects((prev) => prev.map((list, index) => (index === pageIndex ? [] : list)))
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t.clearPage}
            </Button>

            <OptionField label={t.dpi}>
              <Select value={dpi} onValueChange={setDpi}>
                <SelectTrigger size="xs" className="w-24 font-mono" aria-label={t.dpi}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[120, 150, 200, 250].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} DPI
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </OptionField>

            <div className="ml-auto">
              <Button
                type="button"
                size="xs"
                onClick={run}
                disabled={busy || pageCount === 0}
                className="gap-1.5"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ScanEye className="h-3.5 w-3.5" />
                )}
                {busy ? t.running : t.run}
              </Button>
            </div>
          </OptionBar>

          <p className="text-xs leading-relaxed text-foreground-subtle">{t.hint}</p>

          <section className="overflow-hidden rounded-lg border border-border bg-surface p-3">
            <div
              className="relative mx-auto w-fit max-w-full cursor-crosshair touch-none select-none"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = positionOf(event);
                setDraft(null);
              }}
              onPointerMove={(event) => {
                const start = dragRef.current;
                if (!start) return;
                const now = positionOf(event);
                setDraft(rectFromDrag(start.x, start.y, now.x, now.y));
              }}
              onPointerUp={(event) => commit(positionOf(event))}
              onPointerCancel={() => {
                dragRef.current = null;
                setDraft(null);
              }}
            >
              {currentPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPreview}
                  alt={`${file.name} — ${pageIndex + 1}`}
                  draggable={false}
                  className="block max-h-[70vh] w-auto max-w-full"
                />
              ) : (
                <div className="flex h-64 w-[min(80vw,520px)] flex-col items-center justify-center gap-2 text-xs text-foreground-subtle">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t.loading}
                </div>
              )}

              {pageRects.map((rect, index) => (
                <div
                  key={`${rect.x}-${rect.y}-${index}`}
                  className="absolute bg-black/85 ring-1 ring-white/40"
                  style={{
                    left: `${rect.x * 100}%`,
                    top: `${rect.y * 100}%`,
                    width: `${rect.width * 100}%`,
                    height: `${rect.height * 100}%`,
                  }}
                >
                  <button
                    type="button"
                    aria-label={t.removeBox}
                    title={t.removeBox}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() =>
                      setRects((prev) =>
                        prev.map((list, page) =>
                          page === pageIndex ? list.filter((_, i) => i !== index) : list
                        )
                      )
                    }
                    className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-background text-foreground shadow-sm ring-1 ring-border hover:bg-hover-bg"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {draft && (
                <div
                  className="pointer-events-none absolute border border-dashed border-white bg-black/50"
                  style={{
                    left: `${draft.x * 100}%`,
                    top: `${draft.y * 100}%`,
                    width: `${draft.width * 100}%`,
                    height: `${draft.height * 100}%`,
                  }}
                />
              )}
            </div>
          </section>

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

          {result && (
            <section className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <Badge variant="success" size="sm" dot>
                {t.result}
              </Badge>
              <span className="font-mono text-[11px] text-foreground-subtle">
                {t.size} {formatBytes(result.blob.size)}
              </span>
              <span className="ml-auto">
                <Button
                  type="button"
                  size="xs"
                  className="gap-1.5"
                  onClick={() => downloadBlob(result.blob, result.name)}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t.download}
                </Button>
              </span>
            </section>
          )}

          <WarningNote>{t.warning}</WarningNote>
        </>
      )}
    </div>
  );
}
