"use client";

import * as React from "react";
import { FilePlus2, FileText, Loader2, Upload, X } from "lucide-react";
import { useCopy } from "@/components/locale-provider";
import { formatBytes } from "@/lib/files";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    dropTitle: "拖入文件，或点击选择",
    dropHint: "文件只在本机处理，不会上传",
    add: "继续添加",
    remove: "移除",
    clearAll: "全部清除",
    total: (n: number, size: number) => `${n} 个文件 · ${formatBytes(size)}`,
  },
  en: {
    dropTitle: "Drop a file here, or click to pick",
    dropHint: "Processed on your device, never uploaded",
    add: "Add more",
    remove: "Remove",
    clearAll: "Clear all",
    total: (n: number, size: number) =>
      `${n} file${n > 1 ? "s" : ""} · ${formatBytes(size)}`,
  },
};

export function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/** Drag-and-drop file picker shared by the hash, gzip and zip tools */
export function FilePicker({
  files,
  accept,
  multiple = false,
  loading = false,
  hint,
  onAdd,
  onRemove,
  onClear,
  className,
}: {
  files: File[];
  accept?: string;
  multiple?: boolean;
  loading?: boolean;
  hint?: string;
  onAdd: (files: FileList | null) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  className?: string;
}) {
  const t = useCopy(COPY);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const open = () => inputRef.current?.click();
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

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
          accept={accept}
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
            className="flex w-full flex-col items-center gap-2 px-6 py-10 text-center transition-colors duration-base ease-out hover:bg-hover-bg"
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
              {files.map((file) => (
                <li
                  key={fileKey(file)}
                  className="flex items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-2"
                >
                  <FileText className="h-4 w-4 shrink-0 text-foreground-subtle" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[11px] text-foreground-subtle">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(fileKey(file))}
                    aria-label={`${t.remove} ${file.name}`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-foreground-faint transition-colors hover:bg-hover-bg hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between text-[11px] text-foreground-subtle">
              <span>{t.total(files.length, totalSize)}</span>
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
    </div>
  );
}
