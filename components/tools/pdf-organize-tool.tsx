"use client";

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  RotateCcw,
  RotateCw,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { PdfDrop, usePdfFiles, type PdfEntry } from "@/components/tools/pdf-drop";
import { PdfOutputList, usePdfOutputs } from "@/components/tools/pdf-output";
import { baseName } from "@/lib/files";
import { savePdf } from "@/lib/pdf";
import { openForRender, renderPage, type RenderablePdf } from "@/lib/pdf-render";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    rotateAll: "全部旋转 90°",
    reset: "重置",
    rotate: "旋转 90°",
    delete: "删除此页",
    restore: "恢复此页",
    earlier: "前移一位",
    later: "后移一位",
    run: "生成 PDF",
    running: "生成中…",
    kept: (k: number, total: number) => `保留 ${k} / ${total} 页`,
    pages: (n: number) => `${n} 页`,
    rendering: "正在渲染页面预览…",
    tooMany: (n: number) => `这份 PDF 有 ${n} 页，预览只渲染前 200 页，操作仍然对全部页面生效。`,
    note: "拖动缩略图可以调整先后顺序，也可以旋转或删除单页。这些改动只作用于导出结果，原始文件不会被修改，全部在浏览器内完成。",
  },
  en: {
    rotateAll: "Rotate all 90°",
    reset: "Reset",
    rotate: "Rotate 90°",
    delete: "Delete page",
    restore: "Restore page",
    earlier: "Move earlier",
    later: "Move later",
    run: "Build PDF",
    running: "Building…",
    kept: (k: number, total: number) => `${k} of ${total} pages kept`,
    pages: (n: number) => `${n} page${n > 1 ? "s" : ""}`,
    rendering: "Rendering previews…",
    tooMany: (n: number) =>
      `This PDF has ${n} pages — previews are rendered for the first 200 only, edits still apply to all of them.`,
    note: "Drag a thumbnail to change the running order, or rotate and delete individual pages. These edits only affect the exported file, the original stays untouched, and everything runs in your browser.",
  },
};

const PREVIEW_LIMIT = 200;

/** Where a thumbnail sits in the running order, plus the handlers that change it. */
type SortProps = {
  canEarlier: boolean;
  canLater: boolean;
  onEarlier: () => void;
  onLater: () => void;
  dragging: boolean;
  dropTarget: boolean;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
};

function PageThumb({
  doc,
  pageNumber,
  rotation,
  removed,
  onRotate,
  onToggle,
  sort,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  rotation: number;
  removed: boolean;
  onRotate: () => void;
  onToggle: () => void;
  sort: SortProps;
}) {
  const t = useCopy(COPY);
  const [src, setSrc] = React.useState<string | null>(null);
  const [visible, setVisible] = React.useState(false);
  const holder = React.useRef<HTMLDivElement>(null);

  // Render only when the thumbnail scrolls into view; a 200 page document
  // would otherwise rasterise everything at once.
  React.useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let url: string | null = null;

    (async () => {
      try {
        const { canvas } = await renderPage(doc, pageNumber, 0.55);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.8)
        );
        if (!blob || cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      } catch {
        /* leave the placeholder in place */
      }
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [doc, pageNumber, visible]);

  return (
    <div
      draggable
      onDragStart={sort.onDragStart}
      onDragOver={sort.onDragOver}
      onDrop={sort.onDrop}
      onDragEnd={sort.onDragEnd}
      className={cn("group relative flex flex-col gap-1", sort.dragging && "opacity-40")}
    >
      <div
        ref={holder}
        className={cn(
          "relative flex aspect-[1/1.414] items-center justify-center overflow-hidden rounded border border-border bg-surface",
          removed && "opacity-40",
          sort.dropTarget && "ring-2 ring-foreground-subtle ring-offset-2 ring-offset-background"
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`${pageNumber}`}
            draggable={false}
            className="h-full w-full object-contain transition-transform duration-base"
            style={{
              transform: `rotate(${rotation}deg) scale(${rotation % 180 === 0 ? 1 : 0.7})`,
            }}
          />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-foreground-faint" />
        )}

        <span className="absolute left-1 top-1 rounded bg-background/80 px-1 font-mono text-[10px] text-foreground-subtle">
          {pageNumber}
        </span>

        <div className="absolute inset-x-1 bottom-1 flex justify-center gap-0.5 opacity-0 transition-opacity duration-base group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={sort.onEarlier}
            disabled={!sort.canEarlier}
            aria-label={t.earlier}
            title={t.earlier}
            className="grid h-6 w-6 place-items-center rounded bg-background/90 text-foreground-muted shadow-sm transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={sort.onLater}
            disabled={!sort.canLater}
            aria-label={t.later}
            title={t.later}
            className="grid h-6 w-6 place-items-center rounded bg-background/90 text-foreground-muted shadow-sm transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRotate}
            aria-label={t.rotate}
            title={t.rotate}
            className="grid h-6 w-6 place-items-center rounded bg-background/90 text-foreground-muted shadow-sm transition-colors hover:text-foreground"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={removed ? t.restore : t.delete}
            title={removed ? t.restore : t.delete}
            className={cn(
              "grid h-6 w-6 place-items-center rounded bg-background/90 shadow-sm transition-colors",
              removed ? "text-green-fg" : "text-foreground-muted hover:text-red-fg"
            )}
          >
            {removed ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PdfOrganizeTool() {
  const { files, add, remove, clear, error, loading, setError } = usePdfFiles();
  const entry = files[0];

  return (
    <div className="flex flex-col gap-4">
      <PdfDrop
        files={files}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        error={error}
        loading={loading}
      />

      {/* Keyed by file id so every edit resets when a different PDF is opened */}
      {entry && <OrganizePanel key={entry.id} entry={entry} onError={setError} />}
    </div>
  );
}

function OrganizePanel({ entry, onError }: { entry: PdfEntry; onError: (error: unknown) => void }) {
  const t = useCopy(COPY);
  const { outputs, replace } = usePdfOutputs();
  const total = entry.pages;
  const [order, setOrder] = React.useState<number[]>(() =>
    Array.from({ length: total }, (_, i) => i)
  );
  const [rotations, setRotations] = React.useState<Record<number, number>>({});
  const [removed, setRemoved] = React.useState<number[]>([]);
  const [proxy, setProxy] = React.useState<RenderablePdf | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);
  const [dropTarget, setDropTarget] = React.useState<number | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let opened: RenderablePdf | null = null;

    (async () => {
      try {
        const bytes = new Uint8Array(await entry.file.arrayBuffer());
        opened = await openForRender(bytes);
        if (cancelled) {
          void opened.destroy();
          return;
        }
        setProxy(opened);
      } catch (err) {
        if (!cancelled) onError(err);
      }
    })();

    return () => {
      cancelled = true;
      if (opened) void opened.destroy();
    };
  }, [entry, onError]);

  /** Move the page at `from` so it ends up at `to`, shifting the rest along. */
  const move = React.useCallback((from: number, to: number) => {
    setOrder((prev) => {
      if (from === to) return prev;
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const kept = order.filter((i) => !removed.includes(i));

  // Indexes stay valid for the visible slice because it is a prefix of `order`.
  const visible = order.slice(0, PREVIEW_LIMIT);

  const dragProps = (index: number): SortProps => ({
    canEarlier: index > 0,
    canLater: index < order.length - 1,
    onEarlier: () => move(index, index - 1),
    onLater: () => move(index, index + 1),
    dragging: dragFrom === index,
    dropTarget: dropTarget === index && dragFrom !== index,
    onDragStart: (event) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
      setDragFrom(index);
      setDropTarget(index);
    },
    onDragOver: (event) => {
      if (dragFrom === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setDropTarget(index);
    },
    onDrop: (event) => {
      event.preventDefault();
      if (dragFrom !== null) move(dragFrom, index);
      setDragFrom(null);
      setDropTarget(null);
    },
    onDragEnd: () => {
      setDragFrom(null);
      setDropTarget(null);
    },
  });

  const run = async () => {
    if (kept.length === 0) return;
    setBusy(true);
    onError(null);
    try {
      const out = await PDFDocument.create();
      const copied = await out.copyPages(entry.doc, kept);
      copied.forEach((page, i) => {
        out.addPage(page);
        const extra = rotations[kept[i]] ?? 0;
        if (extra) {
          page.setRotation(degrees((page.getRotation().angle + extra) % 360));
        }
      });
      replace([
        {
          name: `${baseName(entry.name, "document")}-edited.pdf`,
          blob: await savePdf(out),
          note: t.pages(kept.length),
        },
      ]);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-foreground-subtle">
          {t.kept(kept.length, total)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="gap-1.5"
            onClick={() =>
              setRotations((prev) => {
                const next: Record<number, number> = {};
                for (let i = 0; i < total; i += 1) next[i] = ((prev[i] ?? 0) + 90) % 360;
                return next;
              })
            }
          >
            <RotateCw className="h-3.5 w-3.5" />
            {t.rotateAll}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="gap-1.5"
            onClick={() => {
              setOrder(Array.from({ length: total }, (_, i) => i));
              setRotations({});
              setRemoved([]);
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t.reset}
          </Button>
          <Button
            type="button"
            size="xs"
            onClick={run}
            disabled={busy || kept.length === 0}
            className="gap-1.5"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {busy ? t.running : t.run}
          </Button>
        </div>
      </div>

      {total > PREVIEW_LIMIT && <p className="text-xs text-orange-fg">{t.tooMany(total)}</p>}

      {proxy ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
          {visible.map((page, index) => (
            <PageThumb
              key={page}
              doc={proxy.doc}
              pageNumber={page + 1}
              rotation={rotations[page] ?? 0}
              removed={removed.includes(page)}
              onRotate={() =>
                setRotations((prev) => ({ ...prev, [page]: ((prev[page] ?? 0) + 90) % 360 }))
              }
              onToggle={() =>
                setRemoved((prev) =>
                  prev.includes(page) ? prev.filter((x) => x !== page) : [...prev, page]
                )
              }
              sort={dragProps(index)}
            />
          ))}
        </div>
      ) : (
        <p className="flex items-center gap-2 text-xs text-foreground-subtle">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t.rendering}
        </p>
      )}

      <PdfOutputList outputs={outputs} zipName="pages.zip" />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </>
  );
}
