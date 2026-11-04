"use client";

import * as React from "react";
import { FilePlus2, FolderOpen, FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/components/locale-provider";
import { formatBytes } from "@/lib/files";
import { relativePathOf } from "@/lib/file-batch";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    dropTitle: "拖入文件或文件夹，或点击选择",
    dropHint: "文件只在本机处理，不会上传",
    pickFiles: "选择文件",
    pickFolder: "选择文件夹",
    add: "继续添加",
    addFolder: "加文件夹",
    remove: "移除",
    clearAll: "全部清除",
    total: (n: number, size: number) => `${n} 个文件 · ${formatBytes(size)}`,
    reading: "正在读取文件夹…",
  },
  en: {
    dropTitle: "Drop files or a folder here, or click to pick",
    dropHint: "Processed on your device, never uploaded",
    pickFiles: "Pick files",
    pickFolder: "Pick folder",
    add: "Add more",
    addFolder: "Add folder",
    remove: "Remove",
    clearAll: "Clear all",
    total: (n: number, size: number) =>
      `${n} file${n > 1 ? "s" : ""} · ${formatBytes(size)}`,
    reading: "Reading folder…",
  },
};

export interface PickedFile {
  file: File;
  /** Path relative to the picked folder (or just the name for a loose file) */
  path: string;
}

export function pickedKey(entry: PickedFile): string {
  return entry.path;
}

function mergePicked(current: PickedFile[], incoming: PickedFile[]): PickedFile[] {
  const map = new Map<string, PickedFile>();
  for (const entry of current) map.set(entry.path, entry);
  for (const entry of incoming) map.set(entry.path, entry);
  return [...map.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/** Holds a multi-file / folder selection shared by the batch tools. */
export function useFileSet() {
  const [entries, setEntries] = React.useState<PickedFile[]>([]);

  const add = React.useCallback((incoming: PickedFile[]) => {
    if (incoming.length > 0) setEntries((prev) => mergePicked(prev, incoming));
  }, []);
  const remove = React.useCallback((path: string) => {
    setEntries((prev) => prev.filter((entry) => entry.path !== path));
  }, []);
  const clear = React.useCallback(() => setEntries([]), []);

  return { entries, add, remove, clear };
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readDirectory(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function walkEntry(entry: FileSystemEntry, prefix: string, out: PickedFile[]) {
  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntry);
    out.push({ file, path: prefix + file.name });
    return;
  }
  if (!entry.isDirectory) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // Chrome hands directory entries over in batches of 100
  for (;;) {
    const batch = await readDirectory(reader);
    if (batch.length === 0) break;
    for (const child of batch) {
      await walkEntry(child, `${prefix}${child.name}/`, out);
    }
  }
}

/** Collect dropped files, walking into folders when the browser exposes them. */
export async function collectDropped(dt: DataTransfer): Promise<PickedFile[]> {
  const items = [...(dt.items ?? [])];
  const roots = items
    .map((item) => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => entry != null);

  if (roots.length > 0) {
    const out: PickedFile[] = [];
    for (const root of roots) await walkEntry(root, "", out);
    if (out.length > 0) return out;
  }

  return [...dt.files].map((file) => ({ file, path: relativePathOf(file) }));
}

export function FileSetPicker({
  entries,
  onAdd,
  onRemove,
  onClear,
  accept,
  hint,
  multiple = true,
  allowFolder = true,
  className,
}: {
  entries: PickedFile[];
  onAdd: (files: PickedFile[]) => void;
  onRemove: (path: string) => void;
  onClear: () => void;
  accept?: string;
  hint?: string;
  multiple?: boolean;
  allowFolder?: boolean;
  className?: string;
}) {
  const t = useCopy(COPY);
  const fileInput = React.useRef<HTMLInputElement>(null);
  const folderInput = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dragDepth = React.useRef(0);

  // `webkitdirectory` is missing from React's input typings, so set it by hand
  React.useEffect(() => {
    folderInput.current?.setAttribute("webkitdirectory", "");
    folderInput.current?.setAttribute("directory", "");
  }, []);

  const totalSize = entries.reduce((sum, entry) => sum + entry.file.size, 0);

  const takeFiles = (list: FileList | null) => {
    if (!list) return;
    onAdd([...list].map((file) => ({ file, path: relativePathOf(file) })));
  };

  const drop = async (dt: DataTransfer) => {
    setLoading(true);
    try {
      onAdd(await collectDropped(dt));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input
        ref={fileInput}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={folderInput}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          void drop(event.dataTransfer);
        }}
        className={cn(
          "rounded-lg border border-dashed border-border-strong bg-surface transition-colors duration-base ease-out",
          dragging && "border-accent bg-hover-bg"
        )}
      >
        {entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-9 text-center">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-foreground-subtle" />
            ) : (
              <Upload className="h-6 w-6 text-foreground-subtle" />
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {loading ? t.reading : t.dropTitle}
              </span>
              <span className="text-xs text-foreground-subtle">{hint ?? t.dropHint}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="gap-1.5"
                onClick={() => fileInput.current?.click()}
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                {t.pickFiles}
              </Button>
              {allowFolder && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="gap-1.5"
                  onClick={() => folderInput.current?.click()}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  {t.pickFolder}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3">
            <ul className="flex max-h-56 flex-col gap-1.5 overflow-auto pr-1">
              {entries.map((entry) => (
                <li
                  key={pickedKey(entry)}
                  className="flex items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-1.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-foreground-subtle" />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-xs font-medium text-foreground"
                      title={entry.path}
                    >
                      {entry.path}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">
                    {formatBytes(entry.file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(entry.path)}
                    aria-label={`${t.remove} ${entry.path}`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-foreground-faint transition-colors hover:bg-hover-bg hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-2 text-[11px] text-foreground-subtle">
              <span>{t.total(entries.length, totalSize)}</span>
              <div className="flex items-center gap-1">
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                {multiple && (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-hover-bg hover:text-foreground"
                  >
                    <FilePlus2 className="h-3 w-3" />
                    {t.add}
                  </button>
                )}
                {allowFolder && (
                  <button
                    type="button"
                    onClick={() => folderInput.current?.click()}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-hover-bg hover:text-foreground"
                  >
                    <FolderOpen className="h-3 w-3" />
                    {t.addFolder}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClear}
                  className="rounded px-1.5 py-0.5 transition-colors hover:bg-hover-bg hover:text-foreground"
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
