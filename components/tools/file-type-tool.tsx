"use client";

import * as React from "react";
import { FileScan, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileSetPicker, useFileSet, type PickedFile } from "@/components/tools/file-set-picker";
import { OptionBar } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { formatBytes } from "@/lib/files";
import {
  extensionMismatch,
  extensionOf,
  sniffFileType,
  typeLabel,
  type TypeDetection,
} from "@/lib/file-batch";

const COPY = {
  zh: {
    hint: "读取文件开头的字节判断真实类型，与扩展名对比",
    empty: "导入文件或文件夹后显示识别结果",
    reading: "正在读取文件头",
    file: "文件",
    type: "识别结果",
    mime: "MIME",
    declared: "扩展名",
    status: "状态",
    matched: "一致",
    mismatch: "扩展名不符",
    unknown: "无法识别",
    pending: "识别中",
    mismatchCount: (n: number) => `${n} 个文件的扩展名与内容不符`,
    note: "只读取每个文件的前 512 字节比对文件头，不会读取全部内容，也不会上传。Office、EPUB、APK 等本质是 ZIP 容器，识别为 ZIP 不算冲突。",
  },
  en: {
    hint: "Read the first bytes to find the real type, then compare with the extension",
    empty: "Import files or a folder to see what they really are",
    reading: "Reading file headers",
    file: "File",
    type: "Detected",
    mime: "MIME",
    declared: "Extension",
    status: "Status",
    matched: "Match",
    mismatch: "Mismatch",
    unknown: "Unknown",
    pending: "Reading",
    mismatchCount: (n: number) => `${n} file${n === 1 ? "" : "s"} disagree with the extension`,
    note: "Only the first 512 bytes of each file are read to inspect the header — nothing else is read, and nothing is uploaded. Office, EPUB and APK files are ZIP containers, so being detected as ZIP is not a mismatch.",
  },
};

export function FileTypeTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const { entries, add, remove, clear } = useFileSet();
  const [detections, setDetections] = React.useState<Record<string, TypeDetection>>({});
  const [reading, setReading] = React.useState(false);

  const inspect = async (files: PickedFile[]) => {
    if (files.length === 0) return;
    setReading(true);
    try {
      const updates: Record<string, TypeDetection> = {};
      for (const entry of files) {
        const buffer = await entry.file.slice(0, 512).arrayBuffer();
        updates[entry.path] = sniffFileType(new Uint8Array(buffer), entry.file.name);
      }
      setDetections((prev) => ({ ...prev, ...updates }));
    } finally {
      setReading(false);
    }
  };

  const mismatches = entries.filter((entry) => {
    const detection = detections[entry.path];
    return detection ? extensionMismatch(detection, entry.file.name) : false;
  }).length;

  return (
    <div className="flex flex-col gap-4">
      <FileSetPicker
        entries={entries}
        onAdd={(files) => {
          add(files);
          void inspect(files);
        }}
        onRemove={(path) => {
          remove(path);
          setDetections((prev) => {
            const next = { ...prev };
            delete next[path];
            return next;
          });
        }}
        onClear={() => {
          clear();
          setDetections({});
        }}
        hint={t.hint}
      />

      <OptionBar>
        <span className="flex items-center gap-1.5 text-[11px] text-foreground-subtle">
          {reading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <FileScan className="h-3 w-3" />
          )}
          {reading ? t.reading : `${entries.length}`}
        </span>
        {mismatches > 0 && (
          <Badge variant="warning" size="xs">
            {t.mismatchCount(mismatches)}
          </Badge>
        )}
      </OptionBar>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        {entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-foreground-subtle">{t.empty}</p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full table-fixed text-xs">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-border text-left text-foreground-subtle">
                  <th className="w-[28%] px-3 py-2 font-medium">{t.file}</th>
                  <th className="w-[22%] px-3 py-2 font-medium">{t.type}</th>
                  <th className="w-[22%] px-3 py-2 font-medium">{t.mime}</th>
                  <th className="w-[12%] px-3 py-2 font-medium">{t.declared}</th>
                  <th className="w-[16%] px-3 py-2 text-right font-medium">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const detection = detections[entry.path];
                  const mismatch = detection
                    ? extensionMismatch(detection, entry.file.name)
                    : false;
                  const actualExt = extensionOf(entry.file.name);
                  return (
                    <tr key={entry.path} className="border-b border-border last:border-b-0">
                      <td className="max-w-0 px-3 py-2">
                        <p className="truncate font-mono text-foreground" title={entry.path}>
                          {entry.path}
                        </p>
                        <p className="font-mono text-[11px] text-foreground-faint">
                          {formatBytes(entry.file.size)}
                          {detection?.hex ? ` · ${detection.hex}` : ""}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-foreground">
                        {detection ? typeLabel(detection, locale) : t.pending}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-foreground-muted">
                        {detection?.mime ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-foreground-muted">
                        {actualExt ? `.${actualExt}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {!detection ? (
                          <Badge variant="secondary" size="xs">
                            {t.pending}
                          </Badge>
                        ) : detection.source === "none" ? (
                          <Badge variant="secondary" size="xs">
                            {t.unknown}
                          </Badge>
                        ) : mismatch ? (
                          <Badge variant="warning" size="xs">
                            {t.mismatch}
                          </Badge>
                        ) : (
                          <Badge variant="success" size="xs">
                            {t.matched}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
