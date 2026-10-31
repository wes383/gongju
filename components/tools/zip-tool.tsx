"use client";

import * as React from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";
import { FilePicker, fileKey } from "@/components/tools/file-picker";
import { ErrorNote, OptionBar, OptionField, Pane, Segmented } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { codedError, errorText } from "@/lib/errors";
import { downloadBlob, formatBytes } from "@/lib/files";

const COPY = {
  zh: {
    mode: "模式",
    pack: "打包",
    unpack: "解压",
    level: "压缩级别",
    store: "仅存储",
    normal: "标准",
    maximum: "最大",
    packButton: "生成 ZIP",
    packing: "正在打包…",
    unpacked: "压缩包内容",
    pickHint: "选好文件后点「生成 ZIP」",
    zipHint: "拖入 .zip 文件后自动列出内容",
    empty: "还没有选择文件",
    files: "个文件",
    total: "合计",
    download: "下载",
    downloadAll: "全部下载",
    downloadZip: "下载 ZIP",
    note: "打包与解压都走 fflate，在浏览器内存中完成。压缩级别越高越慢：对已压缩的图片、视频用「仅存储」更快，对文本用「最大」能省一些体积。",
  },
  en: {
    mode: "Mode",
    pack: "Pack",
    unpack: "Unpack",
    level: "Compression",
    store: "Store only",
    normal: "Standard",
    maximum: "Maximum",
    packButton: "Create ZIP",
    packing: "Packing…",
    unpacked: "Archive contents",
    pickHint: "Pick files, then hit “Create ZIP”",
    zipHint: "Drop a .zip to list what is inside",
    empty: "No files selected yet",
    files: "files",
    total: "Total",
    download: "Download",
    downloadAll: "Download all",
    downloadZip: "Download ZIP",
    note: "Packing and unpacking run through fflate in browser memory. Higher levels are slower: “store only” is the right call for already-compressed images and video, while text benefits from “maximum”.",
  },
};

type Mode = "pack" | "unpack";

interface Entry {
  name: string;
  data: Uint8Array;
}

function uniqueName(existing: Record<string, unknown>, name: string): string {
  if (!(name in existing)) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  while (`${stem}-${index}${ext}` in existing) index += 1;
  return `${stem}-${index}${ext}`;
}

export function ZipTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<Mode>("pack");
  const [level, setLevel] = React.useState("6");
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);
  const [zipFiles, setZipFiles] = React.useState<File[]>([]);
  const [entries, setEntries] = React.useState<Entry[] | null>(null);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  const pack = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { zipSync } = await import("fflate");
      const map: Record<string, Uint8Array> = {};
      for (const file of files) {
        map[uniqueName(map, file.name)] = new Uint8Array(await file.arrayBuffer());
      }
      const levelValue = Number(level) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
      const zipped = zipSync(map, { level: levelValue });
      downloadBlob(new Blob([zipped as BlobPart], { type: "application/zip" }), "archive.zip");
    } catch {
      setError(codedError("zip.invalid"));
    } finally {
      setBusy(false);
    }
  };

  const unpack = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const { unzipSync } = await import("fflate");
      const map = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const list = Object.entries(map)
        .filter(([name]) => !name.endsWith("/"))
        .map(([name, data]) => ({ name, data }));
      if (list.length === 0) throw codedError("zip.empty");
      setEntries(list);
    } catch (err) {
      setEntries(null);
      setError(err instanceof Error && "code" in err ? err : codedError("zip.invalid"));
    } finally {
      setBusy(false);
    }
  };

  const downloadEntry = (entry: Entry) => {
    downloadBlob(new Blob([entry.data as BlobPart], { type: "application/octet-stream" }), entry.name);
  };

  return (
    <div className="flex flex-col gap-3">
      <OptionBar>
        <OptionField label={t.mode}>
          <Segmented
            ariaLabel={t.mode}
            value={mode}
            onChange={(next) => {
              setMode(next);
              setError(null);
            }}
            options={[
              { value: "pack" as Mode, label: t.pack },
              { value: "unpack" as Mode, label: t.unpack },
            ]}
          />
        </OptionField>

        {mode === "pack" && (
          <>
            <OptionField label={t.level}>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger size="xs" aria-label={t.level} className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{t.store}</SelectItem>
                  <SelectItem value="6">{t.normal}</SelectItem>
                  <SelectItem value="9">{t.maximum}</SelectItem>
                </SelectContent>
              </Select>
            </OptionField>
            <Button
              type="button"
              size="xs"
              onClick={() => void pack()}
              disabled={files.length === 0 || busy}
              className="ml-auto gap-1.5"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileArchive className="h-3.5 w-3.5" />
              )}
              {busy ? t.packing : t.packButton}
            </Button>
          </>
        )}
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {mode === "pack" ? (
          <Pane label={t.pack} footer={files.length > 0 ? (
            <>
              <span>
                {files.length} {t.files}
              </span>
              <span>
                {t.total} {formatBytes(totalSize)}
              </span>
            </>
          ) : undefined}>
            <div className="p-3">
              <FilePicker
                files={files}
                multiple
                hint={t.pickHint}
                onAdd={(list) => {
                  if (!list) return;
                  const picked = Array.from(list);
                  setFiles((prev) => {
                    const merged = [...prev];
                    for (const file of picked) {
                      if (!merged.some((f) => fileKey(f) === fileKey(file))) merged.push(file);
                    }
                    return merged;
                  });
                }}
                onRemove={(key) => setFiles((prev) => prev.filter((f) => fileKey(f) !== key))}
                onClear={() => setFiles([])}
              />
              {error != null && (
                <div className="mt-2">
                  <ErrorNote>{errorText(error, locale)}</ErrorNote>
                </div>
              )}
            </div>
          </Pane>
        ) : (
          <Pane
            label={t.unpacked}
            actions={
              entries && entries.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    entries.forEach((entry, index) => {
                      window.setTimeout(() => downloadEntry(entry), index * 250);
                    });
                  }}
                  className="gap-1.5 text-foreground-muted"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t.downloadAll}</span>
                </Button>
              ) : undefined
            }
            footer={
              entries ? (
                <>
                  <span>
                    {entries.length} {t.files}
                  </span>
                  <span>
                    {t.total} {formatBytes(entries.reduce((sum, entry) => sum + entry.data.length, 0))}
                  </span>
                </>
              ) : undefined
            }
          >
            <div className="p-3">
              <FilePicker
                files={zipFiles}
                accept=".zip,application/zip"
                hint={t.zipHint}
                loading={busy}
                onAdd={(list) => {
                  const picked = list?.[0];
                  if (!picked) return;
                  setZipFiles([picked]);
                  void unpack(picked);
                }}
                onRemove={(key) => {
                  if (zipFiles[0] && fileKey(zipFiles[0]) === key) {
                    setZipFiles([]);
                    setEntries(null);
                    setError(null);
                  }
                }}
                onClear={() => {
                  setZipFiles([]);
                  setEntries(null);
                  setError(null);
                }}
              />

              {busy && (
                <div className="mt-3 flex items-center gap-2 text-sm text-foreground-subtle">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.packing}
                </div>
              )}

              {error != null && (
                <div className="mt-2">
                  <ErrorNote>{errorText(error, locale)}</ErrorNote>
                </div>
              )}

              {entries && entries.length > 0 && (
                <ul className="mt-3 divide-y divide-border rounded-md border border-border">
                  {entries.map((entry) => (
                    <li key={entry.name} className="flex items-center gap-2.5 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground" title={entry.name}>
                        {entry.name}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-foreground-faint">
                        {formatBytes(entry.data.length)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => downloadEntry(entry)}
                        className="shrink-0 gap-1 text-foreground-muted"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{t.download}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Pane>
        )}
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
