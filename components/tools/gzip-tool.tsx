"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { FilePicker, fileKey } from "@/components/tools/file-picker";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OutputArea,
  Pane,
  Segmented,
  Stats,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { base64ToBytes, bytesToBase64 } from "@/lib/bytes";
import { codedError, errorText } from "@/lib/errors";
import { baseName, downloadBlob, formatBytes } from "@/lib/files";

const COPY = {
  zh: {
    mode: "模式",
    compress: "压缩",
    decompress: "解压",
    input: "原文",
    placeholder: "粘贴要压缩的文本",
    output: "gzip 数据（Base64）",
    outputHint: "压缩结果会以 Base64 显示在这里",
    download: "下载 .gz",
    source: "来源",
    file: "文件",
    base64: "Base64",
    base64Placeholder: "粘贴 .gz 文件的 Base64 内容",
    result: "解压结果",
    resultHint: "解压后的内容会显示在这里",
    downloadRaw: "下载原文件",
    binary: "这不是文本内容，请直接下载原文件查看",
    original: "原始",
    compressed: "压缩后",
    ratio: "压缩率",
    reading: "正在读取…",
    note: "gzip 适合压缩日志、JSON、HTML 这类重复度高的文本，通常能压到原体积的 20–30%；已经压缩过的图片、视频再 gzip 几乎不会再变小。整个流程在浏览器内完成，文件不会上传。",
  },
  en: {
    mode: "Mode",
    compress: "Compress",
    decompress: "Decompress",
    input: "Text",
    placeholder: "Paste the text to compress",
    output: "gzip data (Base64)",
    outputHint: "The compressed bytes show up here as Base64",
    download: "Download .gz",
    source: "Source",
    file: "File",
    base64: "Base64",
    base64Placeholder: "Paste the Base64 of a .gz file",
    result: "Decompressed",
    resultHint: "The original content appears here",
    downloadRaw: "Download original",
    binary: "This is not text — download the original file to inspect it",
    original: "Original",
    compressed: "Compressed",
    ratio: "Ratio",
    reading: "Reading…",
    note: "gzip shines on repetitive text such as logs, JSON and HTML, usually down to 20–30% of the original size; already-compressed images and video barely shrink. Everything runs in your browser, nothing is uploaded.",
  },
};

type Mode = "compress" | "decompress";

function utf8OrNull(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function GzipTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [mode, setMode] = React.useState<Mode>("compress");
  const [text, setText] = React.useState("");
  const [packed, setPacked] = React.useState<{ bytes: Uint8Array; base64: string } | null>(null);
  const compressRun = React.useRef(0);

  const [source, setSource] = React.useState<"file" | "base64">("file");
  const [files, setFiles] = React.useState<File[]>([]);
  const [base64, setBase64] = React.useState("");
  const [raw, setRaw] = React.useState<Uint8Array | null>(null);
  const [rawName, setRawName] = React.useState("decompressed");
  const [loadError, setLoadError] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(false);

  const compress = (value: string) => {
    const id = ++compressRun.current;
    if (!value) {
      setPacked(null);
      return;
    }
    void (async () => {
      const { gzipSync } = await import("fflate");
      if (id !== compressRun.current) return;
      const bytes = gzipSync(new TextEncoder().encode(value), { level: 9 });
      setPacked({ bytes, base64: bytesToBase64(bytes) });
    })();
  };

  const decompress = async (bytes: Uint8Array, name: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const { gunzipSync } = await import("fflate");
      const out = gunzipSync(bytes);
      setRaw(out);
      setRawName(name);
    } catch {
      setRaw(null);
      setLoadError(codedError("gzip.invalid"));
    } finally {
      setLoading(false);
    }
  };

  const rawText = raw ? utf8OrNull(raw) : null;
  const originalSize = text ? new TextEncoder().encode(text).length : 0;
  const saved =
    packed && originalSize > 0 ? Math.round((1 - packed.bytes.length / originalSize) * 100) : null;

  return (
    <div className="flex flex-col gap-3">
      <OptionBar>
        <Segmented
          ariaLabel={t.mode}
          value={mode}
          onChange={(next) => setMode(next)}
          options={[
            { value: "compress" as Mode, label: t.compress },
            { value: "decompress" as Mode, label: t.decompress },
          ]}
        />
      </OptionBar>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {mode === "compress" ? (
            <>
              <Pane
                label={t.input}
                className="border-b border-border lg:border-b-0 lg:border-r"
                actions={<ClearButton onClick={() => { setText(""); setPacked(null); }} />}
                footer={<Stats text={text} />}
              >
                <InputArea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    compress(e.target.value);
                  }}
                  placeholder={t.placeholder}
                  aria-label={t.input}
                />
              </Pane>

              <Pane
                label={t.output}
                actions={
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={!packed}
                      onClick={() => {
                        if (!packed) return;
                        downloadBlob(
                          new Blob([packed.bytes as BlobPart], { type: "application/gzip" }),
                          "text.txt.gz"
                        );
                      }}
                      className="gap-1.5 text-foreground-muted"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>{t.download}</span>
                    </Button>
                    <CopyButton value={packed?.base64 ?? ""} />
                  </>
                }
                footer={
                  packed ? (
                    <>
                      <span>
                        {t.original} {formatBytes(originalSize)}
                      </span>
                      <span>
                        {t.compressed} {formatBytes(packed.bytes.length)}
                      </span>
                      {saved !== null && (
                        <span className="text-foreground-muted">
                          {t.ratio} {saved}%
                        </span>
                      )}
                    </>
                  ) : undefined
                }
              >
                <OutputArea value={packed?.base64 ?? ""} placeholder={t.outputHint} />
              </Pane>
            </>
          ) : (
            <>
              <Pane
                label={t.source}
                className="border-b border-border lg:border-b-0 lg:border-r"
                actions={
                  <Segmented
                    ariaLabel={t.source}
                    value={source}
                    onChange={(next) => setSource(next)}
                    options={[
                      { value: "file" as const, label: t.file },
                      { value: "base64" as const, label: t.base64 },
                    ]}
                  />
                }
              >
                <div className="p-3">
                  {source === "file" ? (
                    <FilePicker
                      files={files}
                      accept=".gz,.gzip,application/gzip"
                      loading={loading}
                      onAdd={(list) => {
                        const picked = list?.[0];
                        if (!picked) return;
                        setFiles([picked]);
                        void picked
                          .arrayBuffer()
                          .then((buffer) =>
                            decompress(new Uint8Array(buffer), baseName(picked.name, "decompressed"))
                          );
                      }}
                      onRemove={(key) => {
                        if (files[0] && fileKey(files[0]) === key) {
                          setFiles([]);
                          setRaw(null);
                          setLoadError(null);
                        }
                      }}
                      onClear={() => {
                        setFiles([]);
                        setRaw(null);
                        setLoadError(null);
                      }}
                    />
                  ) : (
                    <InputArea
                      value={base64}
                      onChange={(e) => {
                        const value = e.target.value;
                        setBase64(value);
                        if (!value.trim()) {
                          setRaw(null);
                          setLoadError(null);
                          return;
                        }
                        try {
                          const bytes = base64ToBytes(value);
                          void decompress(bytes, "decompressed");
                        } catch {
                          setRaw(null);
                          setLoadError(codedError("gzip.invalid"));
                        }
                      }}
                      placeholder={t.base64Placeholder}
                      aria-label={t.base64}
                      className="min-h-[220px]"
                    />
                  )}
                  {loadError != null && (
                    <div className="mt-2">
                      <ErrorNote>{errorText(loadError, locale)}</ErrorNote>
                    </div>
                  )}
                </div>
              </Pane>

              <Pane
                label={t.result}
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={!raw}
                    onClick={() => {
                      if (!raw) return;
                      downloadBlob(
                        new Blob([raw as BlobPart], { type: "application/octet-stream" }),
                        rawName
                      );
                    }}
                    className="gap-1.5 text-foreground-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t.downloadRaw}</span>
                  </Button>
                }
                footer={
                  raw ? (
                    <span>
                      {t.result} {formatBytes(raw.length)}
                    </span>
                  ) : undefined
                }
              >
                {loading ? (
                  <div className="flex items-center gap-2 p-4 text-sm text-foreground-subtle">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.reading}
                  </div>
                ) : rawText !== null ? (
                  <OutputArea value={rawText} placeholder={t.resultHint} />
                ) : (
                  <p className="p-4 text-sm text-foreground-subtle">{t.binary}</p>
                )}
              </Pane>
            </>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
