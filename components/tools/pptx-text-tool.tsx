"use client";

import * as React from "react";
import { Download, Loader2, Presentation } from "lucide-react";
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
import { errorText } from "@/lib/errors";
import { baseName, downloadBlob } from "@/lib/files";
import {
  parsePptx,
  pptxToMarkdown,
  pptxToText,
  slideCharCount,
  type PptxDocument,
} from "@/lib/pptx";

const COPY = {
  zh: {
    format: "输出格式",
    markdown: "Markdown",
    text: "纯文本",
    result: "提取结果",
    copy: "复制",
    download: "下载",
    slides: (n: number) => `${n} 页`,
    chars: (n: number) => `${n} 字`,
    loading: "正在读取演示文稿…",
    notPptx: "只支持 .pptx；老的 .ppt 请先用 PowerPoint 另存为 .pptx",
    note: "按放映顺序提取每页的文字，表格按「单元格 | 单元格」拍平成一行。图片、图表数据、备注和动画都不包含——需要备注或版式请另存为 PDF 再处理。",
    local: "文件在浏览器内解析，不会上传。",
  },
  en: {
    format: "Output",
    markdown: "Markdown",
    text: "Plain text",
    result: "Extracted text",
    copy: "Copy",
    download: "Download",
    slides: (n: number) => `${n} slide${n === 1 ? "" : "s"}`,
    chars: (n: number) => `${n} chars`,
    loading: "Reading the deck…",
    notPptx: "Only .pptx — save old .ppt files as .pptx in PowerPoint first",
    note: "Text is pulled out in slide-show order, and tables are flattened into “cell | cell” lines. Pictures, chart data, speaker notes and animations are not included — export to PDF if you need notes or layout.",
    local: "The file is parsed in your browser and never uploaded.",
  },
};

type Format = "markdown" | "text";

export function PptxTextTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [files, setFiles] = React.useState<File[]>([]);
  const [deck, setDeck] = React.useState<PptxDocument | null>(null);
  const [format, setFormat] = React.useState<Format>("markdown");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const file = files[0] ?? null;

  const output = React.useMemo(() => {
    if (!deck) return "";
    return format === "markdown" ? pptxToMarkdown(deck) : pptxToText(deck);
  }, [deck, format]);

  const reset = () => {
    setFiles([]);
    setDeck(null);
    setError(null);
  };

  const load = async (picked: File) => {
    setLoading(true);
    setError(null);
    setDeck(null);
    try {
      const bytes = new Uint8Array(await picked.arrayBuffer());
      setDeck(parsePptx(bytes as Uint8Array<ArrayBuffer>));
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
    const extension = format === "markdown" ? "md" : "txt";
    const type = format === "markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8";
    downloadBlob(new Blob([output], { type }), `${baseName(file.name)}-text.${extension}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <FilePicker
        files={files}
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        loading={loading}
        hint={t.local}
        onAdd={(list) => {
          const picked = list?.[0];
          if (!picked) return;
          if (!/\.pptx$/i.test(picked.name)) {
            setError(new Error(t.notPptx));
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

      {file && deck && (
        <>
          <OptionBar>
            <Segmented
              ariaLabel={t.format}
              value={format}
              onChange={setFormat}
              options={[
                { value: "markdown", label: t.markdown },
                { value: "text", label: t.text },
              ]}
            />
            <span className="font-mono text-[11px] text-foreground-subtle">
              {t.slides(deck.slides.length)} · {t.chars(slideCharCount(deck))}
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
            <Presentation className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t.note}
          </p>
        </>
      )}
    </div>
  );
}
