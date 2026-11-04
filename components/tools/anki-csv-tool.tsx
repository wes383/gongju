"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CopyButton, ErrorNote, InputArea, Pane, PaneButton, SampleButton, Segmented, Toggle } from "@/components/tools/tool-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { buildAnkiSheet, parseTermList, type AnkiSeparator } from "@/lib/anki";
import { downloadBlob } from "@/lib/files";

const SAMPLE = `serendipity	意外发现美好事物的运气	noun
ephemeral	短暂的，转瞬即逝的	adjective
ubiquitous	无处不在的	adjective
meticulous	一丝不苟的	adjective
resilience	恢复力，韧性	noun`;

const COPY = {
  zh: {
    input: "词表",
    placeholder: [
      "每行一张卡片，正面和背面用 Tab 或逗号分隔：",
      "",
      "hello\t你好",
      "serendipity\t意外发现美好事物的运气",
    ].join("\n"),
    sample: "示例",
    separator: "输出分隔符",
    tab: "Tab",
    comma: "逗号",
    semicolon: "分号",
    tags: "标签列",
    noTags: "没有",
    column: (n: number) => `第 ${n} 列`,
    dedupe: "去掉重复行",
    deck: "卡组",
    notetype: "笔记类型",
    deckPlaceholder: "英语词汇",
    notetypePlaceholder: "Basic",
    output: "导入文件",
    empty: "在左侧粘贴词表，这里生成可直接导入 Anki 的文本",
    copy: "复制",
    download: "下载",
    summary: (cards: number, skipped: number) =>
      `${cards} 张卡片${skipped > 0 ? ` · 跳过 ${skipped} 行` : ""}`,
    columnCount: (n: number) => `${n} 列`,
    hint: "Anki → 文件 → 导入，选中这个文件即可。开头几行的 # 是 Anki 的指令行，指明分隔符、HTML 与标签列，导入对话框会自动读出来。",
    note: "字段里的换行会转成 <br>，& < > 会被转义，因此可以安全地粘进 HTML 字段；标签列的多个标签用空格分隔。「标签列」不参与卡片正面背面，只是额外的一列。",
  },
  en: {
    input: "Term list",
    placeholder: [
      "One card per line, front and back separated by a tab or comma:",
      "",
      "hello\thello",
      "serendipity\tthe luck of finding something good by accident",
    ].join("\n"),
    sample: "Sample",
    separator: "Output delimiter",
    tab: "Tab",
    comma: "Comma",
    semicolon: "Semicolon",
    tags: "Tag column",
    noTags: "None",
    column: (n: number) => `Column ${n}`,
    dedupe: "Drop duplicate rows",
    deck: "Deck",
    notetype: "Note type",
    deckPlaceholder: "English vocabulary",
    notetypePlaceholder: "Basic",
    output: "Import file",
    empty: "Paste a term list on the left to build a file Anki can import",
    copy: "Copy",
    download: "Download",
    summary: (cards: number, skipped: number) =>
      `${cards} cards${skipped > 0 ? ` · ${skipped} rows skipped` : ""}`,
    columnCount: (n: number) => `${n} columns`,
    hint: "In Anki use File → Import and pick this file. The leading # lines are Anki directives for the delimiter, HTML rendering and the tag column, so the import dialog reads them for you.",
    note: "Line breaks inside a field become <br> and & < > are escaped, so the text is safe in an HTML field; a tag cell holds several tags separated by spaces. The tag column is not part of the card itself.",
  },
};

const SEPARATORS: { value: AnkiSeparator; label: { zh: string; en: string } }[] = [
  { value: "tab", label: { zh: "Tab", en: "Tab" } },
  { value: "comma", label: { zh: "逗号", en: "Comma" } },
  { value: "semicolon", label: { zh: "分号", en: "Semicolon" } },
];

export function AnkiCsvTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState(SAMPLE);
  const [separator, setSeparator] = React.useState<AnkiSeparator>("tab");
  const [tags, setTags] = React.useState("none");
  const [dedupe, setDedupe] = React.useState(true);
  const [deck, setDeck] = React.useState("");
  const [notetype, setNotetype] = React.useState("");

  const columns = React.useMemo(
    () => parseTermList(input).reduce((max, row) => Math.max(max, row.length), 0),
    [input]
  );

  const tagsColumn = tags === "none" ? null : Number(tags) - 1;
  // A tag column that no longer exists would quietly eat the last field
  const activeTags = tagsColumn !== null && tagsColumn < columns ? tagsColumn : null;

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: null, error: null };
    return safe(() =>
      buildAnkiSheet(input, {
        separator,
        tagsColumn: activeTags,
        dedupe,
        deck,
        notetype,
        html: true,
        escape: true,
      })
    );
  }, [input, separator, activeTags, dedupe, deck, notetype]);

  const sheet = result.value;

  const download = () => {
    if (!sheet) return;
    downloadBlob(
      new Blob([sheet.text], { type: "text/plain;charset=utf-8" }),
      `${(deck.trim() || "anki").replace(/[\\/:*?"<>|]/g, "-")}.txt`
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Segmented
          ariaLabel={t.separator}
          value={separator}
          onChange={setSeparator}
          options={SEPARATORS.map((item) => ({ value: item.value, label: t[item.value] }))}
        />
        <Toggle checked={dedupe} onChange={setDedupe} label={t.dedupe} />
        {columns >= 2 && (
          <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
            {t.tags}
            <Select value={tags} onValueChange={setTags}>
              <SelectTrigger size="xs" className="h-7 w-auto min-w-[100px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t.noTags}</SelectItem>
                {Array.from({ length: columns }, (_, index) => index + 1).map((column) => (
                  <SelectItem key={column} value={String(column)}>
                    {t.column(column)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
        <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
          {t.deck}
          <Input
            value={deck}
            onChange={(event) => setDeck(event.target.value)}
            placeholder={t.deckPlaceholder}
            className="h-7 w-[140px] text-xs"
          />
        </label>
        <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
          {t.notetype}
          <Input
            value={notetype}
            onChange={(event) => setNotetype(event.target.value)}
            placeholder={t.notetypePlaceholder}
            className="h-7 w-[120px] text-xs"
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane label={t.input} footer={<span>{columns > 0 ? t.columnCount(columns) : "—"}</span>}>
              <InputArea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label={t.input}
                placeholder={t.placeholder}
                className="min-h-[320px] font-mono text-[12.5px]"
              />
            </Pane>
          </div>
          <div className="flex items-center gap-1">
            <SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <h2 className="text-xs font-medium text-foreground-muted">{t.output}</h2>
            {sheet && (
              <span className="text-[11px] text-foreground-faint">
                {t.summary(sheet.cards, sheet.skipped)}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {sheet && <CopyButton value={sheet.text} label={t.copy} size="xs" />}
              {sheet && (
                <PaneButton onClick={download}>
                  <Download className="size-3.5" />
                  {t.download}
                </PaneButton>
              )}
            </div>
          </div>

          {result.error ? (
            <div className="p-3">
              <ErrorNote>{errorText(result.error, locale)}</ErrorNote>
            </div>
          ) : !sheet ? (
            <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
          ) : (
            <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground">
              {sheet.text}
            </pre>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
