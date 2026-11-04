"use client";

import * as React from "react";
import { Download, FileCheck2, FileJson2, Loader2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSetPicker, useFileSet } from "@/components/tools/file-set-picker";
import { ErrorNote, OptionBar, OptionField } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { downloadBlob, formatBytes } from "@/lib/files";
import { HASH_ALGORITHMS, hashFile, type HashAlgorithm } from "@/lib/hash";
import {
  checksumText,
  manifestCsv,
  type ManifestRow,
} from "@/lib/file-batch";

const COPY = {
  zh: {
    hint: "为文件夹里的每个文件计算校验和，导出清单",
    algorithm: "算法",
    run: "生成清单",
    running: "计算中",
    empty: "导入文件或文件夹后生成清单",
    file: "路径",
    size: "大小",
    modified: "修改日期",
    digest: "校验和",
    exportCsv: "导出 CSV",
    exportJson: "导出 JSON",
    exportTxt: "导出校验文件",
    files: (n: number, size: string) => `${n} 个文件 · ${size}`,
    note: "大文件按 4 MB 分片流式计算，不会一次性读进内存。CSV 带 BOM，Excel 打开中文路径不会乱码；校验文件是 sha256sum 格式，可在命令行用 -c 校验。文件不会上传。",
  },
  en: {
    hint: "Hash every file in the folder and export a manifest",
    algorithm: "Algorithm",
    run: "Build manifest",
    running: "Hashing",
    empty: "Import files or a folder to build a manifest",
    file: "Path",
    size: "Size",
    modified: "Modified",
    digest: "Digest",
    exportCsv: "Export CSV",
    exportJson: "Export JSON",
    exportTxt: "Export checksums",
    files: (n: number, size: string) => `${n} file${n === 1 ? "" : "s"} · ${size}`,
    note: "Large files are hashed in 4 MB slices so memory stays flat. The CSV carries a BOM so Excel shows Chinese paths correctly, and the checksum file use the sha256sum format, verifiable with -c. Nothing is uploaded.",
  },
};

export function FileManifestTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { entries, add, remove, clear } = useFileSet();
  const [algorithm, setAlgorithm] = React.useState<HashAlgorithm>("sha256");
  const [rows, setRows] = React.useState<ManifestRow[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const runId = React.useRef(0);

  const label =
    HASH_ALGORITHMS.find((item) => item.value === algorithm)?.label ?? algorithm;
  const totalSize = entries.reduce((sum, entry) => sum + entry.file.size, 0);

  const reset = () => {
    runId.current += 1;
    setRows(null);
    setProgress(null);
    setError(null);
    setBusy(false);
  };

  const run = async () => {
    if (entries.length === 0) return;
    const id = ++runId.current;
    setBusy(true);
    setRows(null);
    setError(null);
    setProgress({ done: 0, total: entries.length });

    try {
      const out: ManifestRow[] = [];
      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        const digest = await hashFile(entry.file, [algorithm]);
        if (id !== runId.current) return;
        out.push({
          path: entry.path,
          size: entry.file.size,
          lastModified: entry.file.lastModified,
          hash: digest[algorithm],
        });
        setProgress({ done: index + 1, total: entries.length });
      }
      if (id !== runId.current) return;
      setRows(out);
    } catch (err) {
      if (id === runId.current) setError(err);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  };

  const exportCsv = () => {
    if (!rows) return;
    downloadBlob(
      new Blob([manifestCsv(rows, label)], { type: "text/csv;charset=utf-8" }),
      "file-manifest.csv"
    );
  };

  const exportJson = () => {
    if (!rows) return;
    const data = {
      algorithm: label,
      generatedAt: new Date().toISOString(),
      files: rows.map((row) => ({
        path: row.path,
        size: row.size,
        lastModified:
          row.lastModified > 0 ? new Date(row.lastModified).toISOString() : null,
        digest: row.hash ?? null,
      })),
    };
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      "file-manifest.json"
    );
  };

  const exportChecksums = () => {
    if (!rows) return;
    downloadBlob(
      new Blob([checksumText(rows)], { type: "text/plain;charset=utf-8" }),
      "checksums.txt"
    );
  };

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
        <OptionField label={t.algorithm}>
          <Select
            value={algorithm}
            onValueChange={(value) => {
              setAlgorithm(value as HashAlgorithm);
              reset();
            }}
          >
            <SelectTrigger size="xs" aria-label={t.algorithm} className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HASH_ALGORITHMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </OptionField>

        {entries.length > 0 && (
          <span className="text-[11px] text-foreground-subtle">
            {t.files(entries.length, formatBytes(totalSize))}
          </span>
        )}

        {progress && (
          <div className="h-1 w-40 overflow-hidden rounded-full bg-hover-bg">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={exportCsv}
            disabled={!rows || rows.length === 0}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {t.exportCsv}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={exportJson}
            disabled={!rows || rows.length === 0}
            className="gap-1.5"
          >
            <FileJson2 className="h-3.5 w-3.5" />
            {t.exportJson}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={exportChecksums}
            disabled={!rows || rows.length === 0}
            className="gap-1.5"
          >
            <ScrollText className="h-3.5 w-3.5" />
            {t.exportTxt}
          </Button>
          <Button
            type="button"
            size="xs"
            onClick={run}
            disabled={busy || entries.length === 0}
            className="gap-1.5"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileCheck2 className="h-3.5 w-3.5" />
            )}
            {busy ? t.running : t.run}
          </Button>
        </div>
      </OptionBar>

      {error != null && <ErrorNote>{errorText(error, locale)}</ErrorNote>}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        {!rows ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        ) : (
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-border text-left text-foreground-subtle">
                  <th className="w-[38%] px-3 py-2 font-medium">{t.file}</th>
                  <th className="w-[12%] px-3 py-2 text-right font-medium">{t.size}</th>
                  <th className="w-[16%] px-3 py-2 font-medium">{t.modified}</th>
                  <th className="w-[34%] px-3 py-2 font-medium">{t.digest}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.path} className="border-b border-border last:border-b-0">
                    <td className="max-w-0 px-3 py-1.5 font-mono text-foreground">
                      <p className="truncate" title={row.path}>
                        {row.path}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-[11px] text-foreground-muted">
                      {formatBytes(row.size)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[11px] text-foreground-muted">
                      {row.lastModified > 0
                        ? new Date(row.lastModified).toISOString().slice(0, 10)
                        : "—"}
                    </td>
                    <td className="max-w-0 px-3 py-1.5">
                      <p
                        className="truncate font-mono text-[11px] text-foreground-muted"
                        title={row.hash}
                      >
                        {row.hash}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
