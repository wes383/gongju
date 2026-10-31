"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, FilePlus2, FileText, Loader2, Upload, X } from "lucide-react";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { formatBytes } from "@/lib/files";
import { openPdfFile } from "@/lib/pdf";
import type { PDFDocument } from "pdf-lib";
import { cn, uid } from "@/lib/utils";

export interface PdfEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  pages: number;
  doc: PDFDocument;
}

const COPY = {
  zh: {
    dropTitle: "拖入 PDF，或点击选择",
    dropHint: "文件只在本机处理，不会上传",
    add: "继续添加",
    remove: "移除",
    clearAll: "全部清除",
    moveUp: "上移",
    moveDown: "下移",
    total: (n: number, pages: number) => `${n} 个文件 · 共 ${pages} 页`,
    pages: (n: number) => `${n} 页`,
  },
  en: {
    dropTitle: "Drop PDFs here, or click to pick",
    dropHint: "Processed on your device, never uploaded",
    add: "Add more",
    remove: "Remove",
    clearAll: "Clear all",
    moveUp: "Move up",
    moveDown: "Move down",
    total: (n: number, pages: number) =>
      `${n} file${n > 1 ? "s" : ""} · ${pages} page${pages > 1 ? "s" : ""}`,
    pages: (n: number) => `${n} page${n > 1 ? "s" : ""}`,
  },
};

/** Keeps a list of opened PDFs (already parsed, so tools never re-read them). */
export function usePdfFiles({ multiple = false, limit = 20 } = {}) {
  const [files, setFiles] = React.useState<PdfEntry[]>([]);
  const [error, setError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);

  const add = React.useCallback(
    async (input: FileList | File[] | null) => {
      const list = input ? Array.from(input) : [];
      if (list.length === 0) return;
      setLoading(true);
      setError(null);
      const opened: PdfEntry[] = [];
      for (const file of list) {
        try {
          const parsed = await openPdfFile(file);
          opened.push({
            id: uid("pdf"),
            file,
            name: parsed.name,
            size: parsed.size,
            pages: parsed.pageCount,
            doc: parsed.doc,
          });
        } catch (err) {
          setError(err);
        }
      }
      if (opened.length > 0) {
        setFiles((prev) => {
          if (!multiple) return opened.slice(-1);
          const merged = [...prev, ...opened];
          return merged.slice(Math.max(0, merged.length - limit));
        });
      }
      setLoading(false);
    },
    [limit, multiple]
  );

  const remove = React.useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = React.useCallback(() => {
    setFiles([]);
    setError(null);
  }, []);

  /** Swap an entry with its neighbour; used by the reorder buttons */
  const move = React.useCallback((id: string, delta: number) => {
    setFiles((prev) => {
      const index = prev.findIndex((f) => f.id === id);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }, []);

  return { files, add, remove, clear, move, error, loading, setError };
}

export function PdfDrop({
  files,
  onAdd,
  onRemove,
  onClear,
  onMove,
  error,
  loading,
  multiple = false,
  hint,
  className,
}: {
  files: PdfEntry[];
  onAdd: (files: FileList | File[] | null) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onMove?: (id: string, delta: number) => void;
  error?: unknown;
  loading?: boolean;
  multiple?: boolean;
  hint?: string;
  className?: string;
}) {
  const t = useCopy(COPY);
  const locale = useLocale();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const open = () => inputRef.current?.click();
  const totalPages = files.reduce((sum, f) => sum + f.pages, 0);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onAdd(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-lg border border-dashed border-border-strong bg-surface transition-colors duration-base ease-out",
          dragging && "border-accent bg-hover-bg"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
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
            <span className="text-sm font-medium text-foreground">{t.dropTitle}</span>
            <span className="text-xs text-foreground-subtle">{hint ?? t.dropHint}</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            <ul className="flex flex-col gap-1.5">
              {files.map((entry, index) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-2"
                >
                  <FileText className="h-4 w-4 shrink-0 text-foreground-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground" title={entry.name}>
                      {entry.name}
                    </p>
                    <p className="text-[11px] text-foreground-subtle">
                      {t.pages(entry.pages)} · {formatBytes(entry.size)}
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
              ))}
            </ul>

            <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
              <span>{t.total(files.length, totalPages)}</span>
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

      {error != null && <p className="text-xs text-red-fg">{errorText(error, locale)}</p>}
    </div>
  );
}
