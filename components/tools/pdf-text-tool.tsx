"use client";

import * as React from "react";
import { Download, Loader2 } from "lucide-react";
import { PdfDrop, usePdfFiles } from "@/components/tools/pdf-drop";
import { CopyButton, OptionBar, OutputArea, Pane, Toggle } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { baseName, downloadBlob } from "@/lib/files";
import { openForRender } from "@/lib/pdf-render";

const COPY = {
  zh: {
    pages: "分页标记",
    result: "提取结果",
    empty: "选择 PDF 后自动提取文字",
    working: "正在提取…",
    noText: "没有提取到文字：这份 PDF 可能是扫描件，页面内容其实是图片",
    download: "下载 .txt",
    hint: "只读取文字层，不渲染页面",
    pagesCount: (n: number) => `${n} 页`,
    note: "提取的是 PDF 里的文字层，排版顺序按内容流还原，多栏或表格可能不连贯；扫描件没有文字层，需要先做 OCR。文件只在本地解析。",
  },
  en: {
    pages: "Page markers",
    result: "Extracted text",
    empty: "Pick a PDF to pull its text out",
    working: "Extracting…",
    noText: "No text found — this PDF is probably a scan, where the pages are just images",
    download: "Download .txt",
    hint: "Reads the text layer, never renders pages",
    pagesCount: (n: number) => `${n} page${n > 1 ? "s" : ""}`,
    note: "This reads the text layer and follows the content stream, so multi-column layouts and tables may come out interleaved; scans have no text layer and need OCR first. The file is parsed locally.",
  },
};

export function PdfTextTool() {
  const t = useCopy(COPY);
  const { files, add, remove, clear, error, loading } = usePdfFiles({ multiple: false });
  const entry = files[0];

  const [pages, setPages] = React.useState<string[]>([]);
  const [extracting, setExtracting] = React.useState(false);
  const [pageBreaks, setPageBreaks] = React.useState(true);

  React.useEffect(() => {
    if (!entry) return;
    let cancelled = false;

    void (async () => {
      setExtracting(true);
      setPages([]);
      try {
        const bytes = new Uint8Array(await entry.file.arrayBuffer());
        const { doc, destroy } = await openForRender(bytes);
        const collected: string[] = [];
        for (let index = 1; index <= doc.numPages; index++) {
          const page = await doc.getPage(index);
          const content = await page.getTextContent();
          let pageText = "";
          for (const item of content.items) {
            if (!("str" in item)) continue;
            pageText += item.str;
            pageText += item.hasEOL ? "\n" : " ";
          }
          collected.push(pageText.replace(/[ \t]+\n/g, "\n").trim());
        }
        await destroy();
        if (!cancelled) setPages(collected);
      } finally {
        if (!cancelled) setExtracting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entry]);

  const text = React.useMemo(() => {
    if (pages.length === 0) return "";
    if (!pageBreaks) return pages.filter(Boolean).join("\n\n");
    return pages
      .map((page, index) => `----- ${index + 1} -----\n${page}`)
      .join("\n\n");
  }, [pages, pageBreaks]);

  return (
    <div className="flex flex-col gap-3">
      <PdfDrop
        files={files}
        onAdd={(next) => {
          setPages([]);
          void add(next);
        }}
        onRemove={remove}
        onClear={() => {
          setPages([]);
          clear();
        }}
        error={error}
        loading={loading}
        hint={t.hint}
      />

      {entry && (
        <>
          <OptionBar>
            <Toggle checked={pageBreaks} onChange={setPageBreaks} label={t.pages} />
            <span className="ml-auto font-mono text-[11px] text-foreground-faint">
              {extracting ? t.working : t.pagesCount(entry.pages)}
            </span>
          </OptionBar>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.result}
              actions={
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={!text}
                    onClick={() => {
                      if (!text) return;
                      downloadBlob(
                        new Blob([text], { type: "text/plain;charset=utf-8" }),
                        `${baseName(entry.name, "document")}.txt`
                      );
                    }}
                    className="gap-1.5 text-foreground-muted"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t.download}</span>
                  </Button>
                  <CopyButton value={text} />
                </>
              }
            >
              {extracting ? (
                <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-foreground-subtle">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.working}
                </div>
              ) : text ? (
                <OutputArea value={text} minHeight="min-h-[320px]" />
              ) : (
                <div className="flex min-h-[240px] items-center px-4 text-sm leading-relaxed text-foreground-subtle">
                  {t.noText}
                </div>
              )}
            </Pane>
          </div>
        </>
      )}

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
