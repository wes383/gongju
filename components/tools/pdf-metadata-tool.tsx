"use client";

import * as React from "react";
import { Info, Loader2, Save } from "lucide-react";
import type { PDFDocument } from "pdf-lib";
import { useCopy } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfDrop, usePdfFiles, type PdfEntry } from "@/components/tools/pdf-drop";
import { PdfOutputList, usePdfOutputs } from "@/components/tools/pdf-output";
import { baseName, formatBytes } from "@/lib/files";
import { openPdfBytes, savePdf } from "@/lib/pdf";
import { pageSizeLabel } from "@/lib/pdf-pages";

const COPY = {
  zh: {
    overview: "文件信息",
    pages: "页数",
    size: "大小",
    pageSize: "页面尺寸",
    version: "PDF 版本",
    producer: "生成程序",
    created: "创建时间",
    modified: "修改时间",
    metadata: "文档信息",
    title: "标题",
    author: "作者",
    subject: "主题",
    keywords: "关键词",
    creator: "创建工具",
    keywordsHint: "用逗号分隔",
    run: "保存并下载",
    running: "保存中…",
    reset: "还原",
    untouched: "未修改",
    edited: "已修改",
    note: "只修改文档信息字典，页面内容不会变动。留空表示清除该字段。",
  },
  en: {
    overview: "File",
    pages: "Pages",
    size: "Size",
    pageSize: "Page size",
    version: "PDF version",
    producer: "Producer",
    created: "Created",
    modified: "Modified",
    metadata: "Document info",
    title: "Title",
    author: "Author",
    subject: "Subject",
    keywords: "Keywords",
    creator: "Creator",
    keywordsHint: "Comma separated",
    run: "Save & download",
    running: "Saving…",
    reset: "Revert",
    untouched: "unchanged",
    edited: "edited",
    note: "Only the document info dictionary changes, page content is left alone. An empty field clears that entry.",
  },
};

const TEXT_FIELDS = ["title", "author", "subject", "keywords", "creator"] as const;
type Field = (typeof TEXT_FIELDS)[number];

type Draft = Record<Field, string>;

function readMetadata(doc: PDFDocument): Draft {
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: doc.getKeywords() ?? "",
    creator: doc.getCreator() ?? "",
  };
}

function pdfVersion(bytes: Uint8Array): string {
  // The header is ASCII and must start with %PDF-1.x
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 8));
  const match = /^%PDF-(\d\.\d)/.exec(header);
  return match ? match[1] : "—";
}

function formatDate(value: Date | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(
    value.getHours()
  )}:${pad(value.getMinutes())}`;
}

export function PdfMetadataTool() {
  const { files, add, remove, clear, error, loading, setError } = usePdfFiles();
  const entry = files[0];

  return (
    <div className="flex flex-col gap-4">
      <PdfDrop
        files={files}
        onAdd={add}
        onRemove={remove}
        onClear={clear}
        error={error}
        loading={loading}
      />

      {/* Keyed by file id so the form starts from that file's own metadata */}
      {entry && <MetadataPanel key={entry.id} entry={entry} onError={setError} />}
    </div>
  );
}

function MetadataPanel({ entry, onError }: { entry: PdfEntry; onError: (error: unknown) => void }) {
  const t = useCopy(COPY);
  const { outputs, replace } = usePdfOutputs();
  const doc = entry.doc;
  const original = React.useMemo(() => readMetadata(doc), [doc]);
  const [draft, setDraft] = React.useState<Draft>(() => readMetadata(doc));
  const [version, setVersion] = React.useState("—");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const bytes = new Uint8Array(await entry.file.arrayBuffer());
      if (!cancelled) setVersion(pdfVersion(bytes));
    })();
    return () => {
      cancelled = true;
    };
  }, [entry]);

  const dirty = TEXT_FIELDS.some((field) => draft[field] !== original[field]);
  const firstPage = doc.getPageCount() > 0 ? doc.getPage(0) : null;

  const run = async () => {
    setBusy(true);
    onError(null);
    try {
      const out = await openPdfBytes(new Uint8Array(await entry.file.arrayBuffer()));
      const setters: Record<Field, (value: string) => void> = {
        title: (value) => out.setTitle(value),
        author: (value) => out.setAuthor(value),
        subject: (value) => out.setSubject(value),
        keywords: (value) => out.setKeywords(value ? value.split(/[,，]\s*/) : []),
        creator: (value) => out.setCreator(value),
      };
      for (const field of TEXT_FIELDS) setters[field](draft[field].trim());

      replace([
        {
          name: `${baseName(entry.name, "document")}-meta.pdf`,
          blob: await savePdf(out),
          note: t.edited,
        },
      ]);
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="grid gap-x-6 gap-y-2 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2">
        <InfoRow label={t.pages} value={String(entry.pages)} />
        <InfoRow label={t.size} value={formatBytes(entry.size)} />
        <InfoRow
          label={t.pageSize}
          value={firstPage ? pageSizeLabel(firstPage.getWidth(), firstPage.getHeight()) : "—"}
        />
        <InfoRow label={t.version} value={version} />
        <InfoRow label={t.producer} value={doc.getProducer() || "—"} truncate />
        <InfoRow label={t.created} value={formatDate(doc.getCreationDate())} />
        <InfoRow label={t.modified} value={formatDate(doc.getModificationDate())} />
      </div>

      <section className="rounded-lg border border-border bg-surface p-4">
        <header className="mb-3 flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-foreground-subtle" />
          <h2 className="font-display text-sm font-semibold text-foreground">{t.metadata}</h2>
          <span className="ml-auto font-mono text-[11px] text-foreground-faint">
            {dirty ? t.edited : t.untouched}
          </span>
        </header>

        <div className="flex flex-col gap-2">
          {TEXT_FIELDS.map((field) => (
            <label key={field} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-foreground-muted">{t[field]}</span>
              <Input
                value={draft[field]}
                onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))}
                placeholder={field === "keywords" ? t.keywordsHint : ""}
                aria-label={t[field]}
                size="xs"
                className="flex-1"
              />
            </label>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button type="button" size="xs" onClick={run} disabled={busy} className="gap-1.5">
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {busy ? t.running : t.run}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setDraft(original)}
            disabled={!dirty}
          >
            {t.reset}
          </Button>
        </div>
      </section>

      <PdfOutputList outputs={outputs} zipName="metadata.zip" />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </>
  );
}

function InfoRow({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="w-24 shrink-0 text-xs text-foreground-subtle">{label}</span>
      <span
        className={`min-w-0 flex-1 font-mono text-xs text-foreground ${truncate ? "truncate" : "break-words"}`}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}
