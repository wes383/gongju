"use client";

import * as React from "react";
import { Download, FileJson2, GitCompare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSetPicker, useFileSet, type PickedFile } from "@/components/tools/file-set-picker";
import { ErrorNote, OptionBar, Toggle } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText } from "@/lib/errors";
import { downloadBlob, formatBytes } from "@/lib/files";
import { hashFile } from "@/lib/hash";
import {
  compareFolders,
  summarizeComparison,
  type CompareRow,
  type CompareStatus,
} from "@/lib/file-batch";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    sideA: "文件夹 A（原始）",
    sideB: "文件夹 B（新版）",
    hintA: "选择原始文件夹，或直接拖进来",
    hintB: "选择要对比的文件夹",
    exact: "精确比对（SHA-256）",
    compare: "开始对比",
    comparing: "对比中",
    empty: "两侧都导入文件夹后开始对比",
    noDifference: "两个文件夹完全一致",
    same: "一致",
    changed: "有修改",
    onlyA: "仅 A 有",
    onlyB: "仅 B 有",
    path: "相对路径",
    sizeA: "A 大小",
    sizeB: "B 大小",
    status: "状态",
    exportCsv: "导出 CSV",
    exportJson: "导出 JSON",
    needBoth: "请先给两侧各选择一个文件夹",
    note: "按相对路径逐文件对比，根目录名称不参与比较，所以「photos」和「photos-copy」可以直接对比。默认只看文件大小；开启精确比对比会计算 SHA-256，能发现大小相同但内容不同的文件。",
  },
  en: {
    sideA: "Folder A (original)",
    sideB: "Folder B (new)",
    hintA: "Pick the original folder, or drop it in",
    hintB: "Pick the folder to compare against",
    exact: "Exact compare (SHA-256)",
    compare: "Compare",
    comparing: "Comparing",
    empty: "Import a folder on both sides, then compare",
    noDifference: "The two folders are identical",
    same: "Same",
    changed: "Changed",
    onlyA: "Only in A",
    onlyB: "Only in B",
    path: "Relative path",
    sizeA: "A size",
    sizeB: "B size",
    status: "Status",
    exportCsv: "Export CSV",
    exportJson: "Export JSON",
    needBoth: "Pick a folder on each side first",
    note: "Files are compared by relative path, ignoring the root folder name, so “photos” and “photos-copy” can be compared directly. By default only sizes are compared; exact compare also hashes each pair with SHA-256 to catch same-size edits.",
  },
};

const STATUS_VARIANT: Record<CompareStatus, "success" | "warning" | "info" | "secondary"> = {
  same: "success",
  changed: "warning",
  "only-a": "info",
  "only-b": "secondary",
};

function quoteCsv(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function statusLabel(status: CompareStatus, t: (typeof COPY)["zh"]) {
  if (status === "same") return t.same;
  if (status === "changed") return t.changed;
  if (status === "only-a") return t.onlyA;
  return t.onlyB;
}

export function FolderCompareTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const left = useFileSet();
  const right = useFileSet();
  const [exact, setExact] = React.useState(false);
  const [rows, setRows] = React.useState<CompareRow<PickedFile>[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [error, setError] = React.useState<unknown>(null);
  const runId = React.useRef(0);

  const reset = () => {
    runId.current += 1;
    setRows(null);
    setProgress(null);
    setError(null);
    setBusy(false);
  };

  const run = async () => {
    if (left.entries.length === 0 || right.entries.length === 0) return;
    const id = ++runId.current;
    setBusy(true);
    setError(null);
    setRows(null);

    const a = left.entries.map((entry) => ({
      path: entry.path,
      size: entry.file.size,
      item: entry,
    }));
    const b = right.entries.map((entry) => ({
      path: entry.path,
      size: entry.file.size,
      item: entry,
    }));

    try {
      let hashes: { a: Map<string, string>; b: Map<string, string> } | undefined;
      if (exact) {
        const mapB = new Map(b.map((entry) => [entry.path, entry]));
        const candidates = a.filter((entry) => {
          const other = mapB.get(entry.path);
          return other !== undefined && other.size === entry.size;
        });
        setProgress({ done: 0, total: candidates.length * 2 });
        const hashA = new Map<string, string>();
        const hashB = new Map<string, string>();
        let done = 0;
        for (const entry of candidates) {
          const digest = await hashFile(entry.item.file, ["sha256"]);
          if (id !== runId.current) return;
          hashA.set(entry.path, digest.sha256 ?? "");
          done += 1;
          setProgress({ done, total: candidates.length * 2 });

          const counterpart = mapB.get(entry.path)!;
          const other = await hashFile(counterpart.item.file, ["sha256"]);
          if (id !== runId.current) return;
          hashB.set(entry.path, other.sha256 ?? "");
          done += 1;
          setProgress({ done, total: candidates.length * 2 });
        }
        hashes = { a: hashA, b: hashB };
      }

      if (id !== runId.current) return;
      setRows(compareFolders(a, b, hashes));
    } catch (err) {
      if (id === runId.current) setError(err);
    } finally {
      if (id === runId.current) setBusy(false);
    }
  };

  const summary = rows ? summarizeComparison(rows) : null;

  const exportCsv = () => {
    if (!rows) return;
    const lines = ["path,status,a_size,b_size,a_sha256,b_sha256"];
    for (const row of rows) {
      lines.push(
        [
          quoteCsv(row.path),
          row.status,
          row.a ? String(row.a.size) : "",
          row.b ? String(row.b.size) : "",
          row.hashA ?? "",
          row.hashB ?? "",
        ].join(",")
      );
    }
    downloadBlob(
      new Blob(["\uFEFF" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" }),
      "folder-compare.csv"
    );
  };

  const exportJson = () => {
    if (!rows) return;
    const data = {
      generatedAt: new Date().toISOString(),
      exact,
      files: rows.map((row) => ({
        path: row.path,
        status: row.status,
        aSize: row.a?.size ?? null,
        bSize: row.b?.size ?? null,
        aHash: row.hashA ?? null,
        bHash: row.hashB ?? null,
      })),
    };
    downloadBlob(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      "folder-compare.json"
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-foreground">{t.sideA}</span>
          <FileSetPicker
            entries={left.entries}
            onAdd={(files) => {
              reset();
              left.add(files);
            }}
            onRemove={(path) => {
              reset();
              left.remove(path);
            }}
            onClear={() => {
              reset();
              left.clear();
            }}
            hint={t.hintA}
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-foreground">{t.sideB}</span>
          <FileSetPicker
            entries={right.entries}
            onAdd={(files) => {
              reset();
              right.add(files);
            }}
            onRemove={(path) => {
              reset();
              right.remove(path);
            }}
            onClear={() => {
              reset();
              right.clear();
            }}
            hint={t.hintB}
          />
        </div>
      </div>

      <OptionBar>
        <Toggle
          checked={exact}
          onChange={(value) => {
            setExact(value);
            reset();
          }}
          label={t.exact}
        />
        {progress && (
          <span className="font-mono text-[11px] text-foreground-subtle">
            {progress.done}/{progress.total}
          </span>
        )}
        <Button
          type="button"
          size="xs"
          onClick={run}
          disabled={busy || left.entries.length === 0 || right.entries.length === 0}
          className="ml-auto gap-1.5"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitCompare className="h-3.5 w-3.5" />
          )}
          {busy ? t.comparing : t.compare}
        </Button>
      </OptionBar>

      {error != null && <ErrorNote>{errorText(error, locale)}</ErrorNote>}
      {(left.entries.length === 0 || right.entries.length === 0) && (
        <p className="text-xs text-foreground-subtle">{t.needBoth}</p>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.path}
          </span>
          {summary && (
            <>
              <Badge variant="success" size="xs">
                {t.same}: {summary.same}
              </Badge>
              <Badge variant="warning" size="xs">
                {t.changed}: {summary.changed}
              </Badge>
              <Badge variant="info" size="xs">
                {t.onlyA}: {summary.onlyA}
              </Badge>
              <Badge variant="secondary" size="xs">
                {t.onlyB}: {summary.onlyB}
              </Badge>
            </>
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
          </div>
        </header>

        {!rows ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        ) : rows.length === 0 || summary?.same === rows.length ? (
          <p className="px-4 py-10 text-center text-sm text-green-fg">{t.noDifference}</p>
        ) : (
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-border text-left text-foreground-subtle">
                  <th className="px-3 py-2 font-medium">{t.path}</th>
                  <th className="w-24 px-3 py-2 text-right font-medium">{t.sizeA}</th>
                  <th className="w-24 px-3 py-2 text-right font-medium">{t.sizeB}</th>
                  <th className="w-24 px-3 py-2 text-right font-medium">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.path}
                    className={cn(
                      "border-b border-border last:border-b-0",
                      row.status === "same" && "text-foreground-muted"
                    )}
                  >
                    <td className="max-w-0 px-3 py-1.5 font-mono">
                      <p className="truncate" title={row.path}>
                        {row.path}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-[11px]">
                      {row.a ? formatBytes(row.a.size) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-[11px]">
                      {row.b ? formatBytes(row.b.size) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-right">
                      <Badge variant={STATUS_VARIANT[row.status]} size="xs">
                        {statusLabel(row.status, t)}
                      </Badge>
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
