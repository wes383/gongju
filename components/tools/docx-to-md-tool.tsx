"use client";

import * as React from "react";
import { Download, FileText, Loader2 } from "lucide-react";
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
import { docxToHtml, docxToMarkdown, parseDocx, type DocxDocument } from "@/lib/docx";
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
    blocks: (n: number) => `${n} 段`,
    images: (n: number) => `${n} 张图`,
    loading: "正在解析文档…",
    notDocx: "只支持 .docx 文件；老的 .doc 请先用 Word 另存为 .docx",
    note: "标题、列表、表格、超链接会按结构转换，图片内嵌成 data URL，导出的 Markdown 可以直接放进博客或笔记。Word 的分栏、文本框、浮动图片和页眉页脚不保留——这是文本级转换，不是版式还原。",
    local: "文件在浏览器内解析，不会上传。",
  },
  en: {
    format: "Output",
    markdown: "Markdown",
    html: "HTML",
    result: "Result",
    copy: "Copy",
    download: "Download",
    blocks: (n: number) => `${n} blocks`,
    images: (n: number) => `${n} image${n === 1 ? "" : "s"}`,
    loading: "Parsing the document…",
    notDocx: "Only .docx is supported — save old .doc files as .docx in Word first",
    note: "Headings, lists, tables and links keep their structure, and pictures are inlined as data URLs so the Markdown drops straight into a blog or note. Columns, text boxes, floating images and headers are dropped — this is a text-level conversion, not a layout copy.",
    local: "The file is parsed in your browser and never uploaded.",
  },
};

type Format = "markdown" | "html";

export function DocxToMdTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [files, setFiles] = React.useState<File[]>([]);
  const [doc, setDoc] = React.useState<DocxDocument | null>(null);
  const [format, setFormat] = React.useState<Format>("markdown");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const file = files[0] ?? null;

  const output = React.useMemo(() => {
    if (!doc) return "";
    return format === "markdown" ? docxToMarkdown(doc) : docxToHtml(doc);
  }, [doc, format]);

  const reset = () => {
    setFiles([]);
    setDoc(null);
    setError(null);
  };

  const load = async (picked: File) => {
    setLoading(true);
    setError(null);
    setDoc(null);
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      setDoc(parseDocx(bytes as Uint8Array<ArrayBuffer>));
      setFiles([picked]);
    } catch (err) {
      setError(err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const extension = format === "markdown" ? "md" : "html";
  const save = () => {
    if (!file) return;
    const type =
      format === "markdown" ? "text/markdown;charset=utf-8" : "text/html;charset=utf-8";
    downloadBlob(new Blob([output], { type }), `${baseName(file.name)}.${extension}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        files={files}
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        loading={loading}
        hint={t.local}
        onAdd={(list) => {
          const picked = list?.[0];
          if (!picked) return;
          if (!/\.docx$/i.test(picked.name)) {
            setError(new Error(t.notDocx));
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

      {file && doc && (
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
            <span className="font-mono text-[11px] text-foreground-subtle">
              {t.blocks(doc.blocks.length)} · {t.images(doc.images)}
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
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t.note}
          </p>
        </>
      )}
    </div>
  );
}
