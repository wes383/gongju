"use client";

import * as React from "react";
import { BookOpen, Download, Loader2 } from "lucide-react";
import { FilePicker } from "@/components/tools/file-picker";
import {
  CopyButton,
  ErrorNote,
  OptionBar,
  OutputArea,
  Segmented,
} from "@/components/tools/tool-ui";
import { Button } from "@/components/ui/button";
import { useCopy, useLocale } from "@/components/locale-provider";
import { epubToHtml, epubToMarkdown, parseEpub, type EpubBook } from "@/lib/epub";
import { errorText } from "@/lib/errors";
import { baseName, downloadBlob } from "@/lib/files";

const COPY = {
  zh: {
    format: "输出格式",
    markdown: "Markdown",
    html: "HTML",
    result: "转换结果",
    copy: "复制",
    download: "下载",
    chapters: (n: number) => `${n} 章`,
    loading: "正在解析电子书…",
    notEpub: "只支持 .epub；加密的（带 DRM）电子书无法读取",
    note: "按书脊顺序合并所有章节，章节标题取自各自的 title 或一级标题。图片以内嵌 data URL 保留，所以单个文件会比较大；脚注、目录页和样式表不会重建，只保留正文结构。",
    local: "文件在浏览器内解析，不会上传。",
  },
  en: {
    format: "Output",
    markdown: "Markdown",
    html: "HTML",
    result: "Result",
    copy: "Copy",
    download: "Download",
    chapters: (n: number) => `${n} chapter${n === 1 ? "" : "s"}`,
    loading: "Parsing the book…",
    notEpub: "Only .epub — books with DRM cannot be read",
    note: "Chapters are merged in spine order, with titles taken from each document's title or first heading. Images stay inline as data URLs, so the single file can get large; footnotes, the table of contents and stylesheets are not rebuilt, only the body structure survives.",
    local: "The file is parsed in your browser and never uploaded.",
  },
};

type Format = "markdown" | "html";

export function EpubToMdTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [files, setFiles] = React.useState<File[]>([]);
  const [book, setBook] = React.useState<EpubBook | null>(null);
  const [format, setFormat] = React.useState<Format>("markdown");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const file = files[0] ?? null;

  const output = React.useMemo(() => {
    if (!book) return "";
    return format === "markdown" ? epubToMarkdown(book) : epubToHtml(book);
  }, [book, format]);

  const reset = () => {
    setFiles([]);
    setBook(null);
    setError(null);
  };

  const load = async (picked: File) => {
    setLoading(true);
    setError(null);
    setBook(null);
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      setBook(parseEpub(bytes as Uint8Array<ArrayBuffer>));
      setFiles([picked]);
    } catch (err) {
      setError(err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!file) return;
    const extension = format === "markdown" ? "md" : "html";
    const type =
      format === "markdown" ? "text/markdown;charset=utf-8" : "text/html;charset=utf-8";
    downloadBlob(new Blob([output], { type }), `${baseName(file.name)}.${extension}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        files={files}
        accept=".epub,application/epub+zip"
        loading={loading}
        hint={t.local}
        onAdd={(list) => {
          const picked = list?.[0];
          if (!picked) return;
          if (!/\.epub$/i.test(picked.name)) {
            setError(new Error(t.notEpub));
            return;
          }
          void load(picked);
        }}
        onRemove={reset}
        onClear={reset}
      />

      {error ? <ErrorNote>{errorText(error, locale)}</ErrorNote> : null}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-foreground-subtle">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t.loading}
        </p>
      ) : null}

      {file && book && (
        <>
          <OptionBar>
            <Segmented
              ariaLabel={t.format}
              value={format}
              onChange={setFormat}
              options={[
                { value: "markdown", label: t.markdown },
                { value: "html", label: t.html },
              ]}
            />
            <span className="max-w-[16rem] truncate font-mono text-[11px] text-foreground-subtle">
              {t.chapters(book.chapters.length)} · {book.title}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <CopyButton value={output} label={t.copy} />
              <Button type="button" size="xs" className="gap-1.5" onClick={save}>
                <Download className="h-3.5 w-3.5" />
                {t.download}
              </Button>
            </div>
          </OptionBar>

          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="flex h-11 items-center border-b border-border px-2.5">
              <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
                {t.result}
              </span>
            </header>
            <OutputArea value={output} minHeight="min-h-[420px] max-h-[68vh]" />
          </section>

          <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
            <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t.note}
          </p>
        </>
      )}
    </div>
  );
}
