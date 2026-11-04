"use client";

import * as React from "react";
import { CopyCheck, Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSetPicker, useFileSet, type PickedFile } from "@/components/tools/file-set-picker";
import { ErrorNote, OptionBar } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { downloadBlob, formatBytes } from "@/lib/files";
import { hashFile } from "@/lib/hash";
import {
  assembleDuplicateGroups,
  duplicateCandidates,
  wastedBytes,
  type DuplicateGroup,
} from "@/lib/file-batch";

const COPY = {
  zh: {
    hint: "按内容查找重复文件：先按大小分组，再对候选文件算 SHA-256",
    scan: "开始查找",
    scanning: "扫描中",
    empty: "导入文件或文件夹后开始查找",
    noDuplicates: "没有发现重复文件",
    files: "文件",
    groups: "重复组",
    reclaim: "可释放空间",
    groupSize: (n: number) => `每组 ${n} 个副本`,
    kept: "保留",
    duplicate: "重复",
    exportReport: "导出清单",
    note: "文件只在本机读取；浏览器无法删除本地文件，清单用于手工清理。大小不同的文件不可能是重复文件，所以先按大小筛掉。",
    tooFew: "至少要选择两个文件",
  },
  en: {
    hint: "Find duplicates by content: group by size first, then SHA-256 the candidates",
    scan: "Find duplicates",
    scanning: "Scanning",
    empty: "Import files or a folder, then start the scan",
    noDuplicates: "No duplicate files found",
    files: "Files",
    groups: "Groups",
    reclaim: "Can be freed",
    groupSize: (n: number) => `${n} copies`,
    kept: "Keep",
    duplicate: "Duplicate",
    exportReport: "Export list",
    note: "Files are read locally only. Browsers cannot delete files on disk, so the list is for manual cleanup. Files of different sizes can never be identical, which is why size is the first filter.",
    tooFew: "Pick at least two files",
  },
};

function quoteCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function DuplicateFinderTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { entries, add, remove, clear } = useFileSet();
  const [groups, setGroups] = React.useState<DuplicateGroup<PickedFile>[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const runId = React.useRef(0);

  const reset = () => {
    runId.current += 1;
    setGroups(null);
    setProgress(null);
    setError(null);
    setBusy(false);
  };

  const scan = async () => {
    if (entries.length < 2) return;
    const id = ++runId.current;
    setBusy(true);
    setError(null);
    setGroups(null);

    const candidates = duplicateCandidates(
      entries.map((entry) => ({ item: entry, size: entry.file.size }))
    );
    const queue = candidates.flatMap((group) => group.items);
    setProgress({ done: 0, total: queue.length });

    try {
      const hashed: { item: PickedFile; size: number; hash: string }[] = [];
      for (let index = 0; index < queue.length; index++) {
        const entry = queue[index];
        const digest = await hashFile(entry.file, ["sha256"]);
        if (id !== runId.current) return;
        hashed.push({ item: entry, size: entry.file.size, hash: digest.sha256 ?? "" });
        setProgress({ done: index + 1, total: queue.length });
      }
      if (id !== runId.current) return;
      setGroups(assembleDuplicateGroups(hashed));
    } catch (err) {
      if (id === runId.current) setError(err);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  };

  const exportReport = () => {
    if (!groups) return;
    const lines = ["group,size_bytes,kept_path,duplicate_path,sha256"];
    groups.forEach((group, index) => {
      group.items.slice(1).forEach((item) => {
        lines.push(
          [
            String(index + 1),
            String(group.size),
            quoteCsv(group.items[0].path),
            quoteCsv(item.path),
            group.hash,
          ].join(",")
        );
      });
    });
    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "duplicates.csv");
  };

  const wasted = groups ? wastedBytes(groups) : 0;

  return (
    <div className="flex flex-col gap-4">
      <FileSetPicker
        entries={entries}
        onAdd={(files) => {
          reset();
          add(files);
        }}
        onRemove={(path) => {
          reset();
          remove(path);
        }}
        onClear={() => {
          reset();
          clear();
        }}
        hint={t.hint}
      />

      <OptionBar>
        <span className="text-[11px] text-foreground-subtle">
          {t.files}: {entries.length}
          {progress && progress.total > 0 && ` · ${progress.done}/${progress.total}`}
        </span>
        {busy && progress && progress.total > 0 && (
          <div className="h-1 w-40 overflow-hidden rounded-full bg-hover-bg">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
        )}
        {groups && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" size="xs">
              {t.groups}: {groups.length}
            </Badge>
            <Badge variant={wasted > 0 ? "warning" : "secondary"} size="xs">
              {t.reclaim}: {formatBytes(wasted)}
            </Badge>
          </div>
        )}
        <Button
          type="button"
          size="xs"
          onClick={scan}
          disabled={busy || entries.length < 2}
          className="ml-auto gap-1.5"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {busy ? t.scanning : t.scan}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={exportReport}
          disabled={!groups || groups.length === 0}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          {t.exportReport}
        </Button>
      </OptionBar>

      {entries.length === 1 && <p className="text-xs text-orange-fg">{t.tooFew}</p>}

      {error != null && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

      {!groups ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-foreground-subtle">
          {t.empty}
        </p>
      ) : groups.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-green-border bg-green-soft px-4 py-10 text-sm text-green-fg">
          <CopyCheck className="h-4 w-4" />
          {t.noDuplicates}
        </div>
      ) : (
        <div className="max-h-[460px] overflow-auto rounded-lg border border-border bg-surface">
          {groups.map((group, index) => (
            <section key={`${group.hash}-${index}`} className="border-b border-border last:border-b-0">
              <header className="flex items-center gap-2 bg-hover-bg px-3 py-2">
                <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                  #{index + 1}
                </span>
                <span className="text-xs font-medium text-foreground">
                  {formatBytes(group.size)} · {t.groupSize(group.items.length)}
                </span>
                <span className="ml-auto truncate font-mono text-[11px] text-foreground-faint">
                  sha256 {group.hash.slice(0, 16)}…
                </span>
              </header>
              <ul>
                {group.items.map((item, itemIndex) => (
                  <li
                    key={item.path}
                    className="flex items-center gap-2 border-t border-border px-3 py-1.5 first:border-t-0"
                  >
                    <Badge
                      variant={itemIndex === 0 ? "success" : "warning"}
                      size="xs"
                    >
                      {itemIndex === 0 ? t.kept : t.duplicate}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={item.path}>
                      {item.path}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-foreground-subtle">
                      {formatBytes(item.file.size)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
