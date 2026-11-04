"use client";

import * as React from "react";
import { Blocks, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  CopyButton,
  ErrorNote,
  InputArea,
  OptionBar,
  OptionField,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { downloadBlob } from "@/lib/files";
import { chunkText, summariseChunks } from "@/lib/chunker";
import { formatTokens, tokenizerChoices, type TokenizerFamily } from "@/lib/tokens";
import { cn } from "@/lib/utils";

const COPY = {
  zh: {
    maxTokens: "每块上限",
    overlap: "重叠",
    tokenizer: "分词器",
    input: "原文",
    output: "分块结果",
    tokens: "tokens",
    chunks: (shown: number, total: number) =>
      total > shown ? `前 ${shown} 块 / 共 ${total} 块` : `${total} 块`,
    empty: "分块结果会显示在这里",
    summary: (chunks: string, avg: string, max: string) =>
      `${chunks} 块 · 平均 ${avg} · 最大 ${max}`,
    sample: "示例",
    clear: "清空",
    download: "下载 JSONL",
    copy: "复制 JSONL",
    loading: "正在切分…",
    note: "优先在句子边界切开，单句超过上限时才按字符硬切；重叠会把上一块结尾的整句带到下一块开头，所以块数会略多。导出的 JSONL 每行是 { id, tokens, text }，可以直接喂给 embedding 脚本。上限按估算 token 计算，与模型真实计数会有少量偏差。",
    sampleText:
      "检索增强生成的第一步是把文档切成合适的片段。片段太大，检索会带回一堆无关内容；片段太小，答案需要的上下文又被切断。\n\n所以切分点通常选在句子边界，并保留少量重叠。重叠太小，跨块的问题仍然答不出来；重叠太大，索引里会存下大量重复内容，既费钱又会让检索结果变得冗余。\n\n实际项目里，先按语义把文档拆成小节，再在小节内部按 token 上限切分，最后把标题和路径作为元数据一起存进向量库，通常比单纯按字符数切分效果好得多。",
  },
  en: {
    maxTokens: "Max tokens",
    overlap: "Overlap",
    tokenizer: "Tokenizer",
    input: "Source",
    output: "Chunks",
    tokens: "tokens",
    chunks: (shown: number, total: number) =>
      total > shown ? `First ${shown} of ${total}` : `${total} chunks`,
    empty: "Chunks will show up here",
    summary: (chunks: string, avg: string, max: string) =>
      `${chunks} chunks · avg ${avg} · max ${max}`,
    sample: "Sample",
    clear: "Clear",
    download: "Download JSONL",
    copy: "Copy JSONL",
    loading: "Splitting…",
    note: "Cuts land on sentence boundaries; a sentence longer than the limit is split by characters. Overlap carries whole sentences from the end of one chunk to the start of the next, so you get a few more chunks. The exported JSONL holds one { id, tokens, text } object per line, ready for an embedding script. Limits are estimated tokens, so real counts drift slightly.",
    sampleText:
      "Retrieval augmented generation starts by cutting documents into chunks. Make them too large and the retriever drags in unrelated paragraphs; make them too small and the answer loses the context it needs.\n\nThat is why cut points land on sentence boundaries, with a little overlap. Too little overlap and a question spanning two chunks stays unanswerable; too much and the index fills with duplicates, which costs money and makes results redundant.\n\nIn practice, split the document into sections first, chunk inside each section, then store the heading path as metadata alongside the text. That beats cutting on character counts alone.",
  },
};

const MAX_VISIBLE = 50;

export function TextChunkerTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [text, setText] = React.useState("");
  const [maxTokens, setMaxTokens] = React.useState("300");
  const [overlap, setOverlap] = React.useState("30");
  const [family, setFamily] = React.useState<TokenizerFamily>("o200k");

  const limit = Number(maxTokens.replace(/[\s,_]/g, "")) || 0;
  const carry = Number(overlap.replace(/[\s,_]/g, "")) || 0;

  const result = React.useMemo(() => {
    // Do not nag about the limit while the box is still empty
    if (!text.trim()) return { value: [] as ReturnType<typeof chunkText>, error: null };
    return safe(() =>
      chunkText(text, { maxTokens: limit, overlapTokens: carry, family })
    );
  }, [text, limit, carry, family]);

  const chunks = result.value ?? [];
  const summary = summariseChunks(chunks);
  const jsonl = chunks
    .map((chunk) =>
      JSON.stringify({ id: chunk.index + 1, tokens: chunk.tokens, text: chunk.text })
    )
    .join("\n");

  const format = (value: number) => formatTokens(value, locale);

  const save = () => {
    if (!jsonl) return;
    downloadBlob(new Blob([jsonl], { type: "application/x-ndjson;charset=utf-8" }), "chunks.jsonl");
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.maxTokens}>
          <Input
            value={maxTokens}
            onChange={(event) => setMaxTokens(event.target.value)}
            inputMode="numeric"
            spellCheck={false}
            aria-label={t.maxTokens}
            size="xs"
            className="w-20 font-mono text-xs"
          />
        </OptionField>
        <OptionField label={t.overlap}>
          <Input
            value={overlap}
            onChange={(event) => setOverlap(event.target.value)}
            inputMode="numeric"
            spellCheck={false}
            aria-label={t.overlap}
            size="xs"
            className="w-16 font-mono text-xs"
          />
        </OptionField>
        <OptionField label={t.tokenizer}>
          <Segmented
            ariaLabel={t.tokenizer}
            value={family}
            onChange={setFamily}
            options={tokenizerChoices(locale)}
          />
        </OptionField>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.input}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <SampleButton onClick={() => setText(t.sampleText)} label={t.sample} />
              <ClearButton onClick={() => setText("")} label={t.clear} />
            </div>
          </header>
          <InputArea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t.sampleText}
            className="min-h-[380px]"
          />
        </section>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.output}
            </span>
            <span className="font-mono text-[11px] text-foreground-faint">
              {chunks.length > 0 ? t.chunks(Math.min(chunks.length, MAX_VISIBLE), chunks.length) : ""}
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <CopyButton value={jsonl} label={t.copy} disabled={chunks.length === 0} />
              <Button
                type="button"
                size="xs"
                className="gap-1.5"
                onClick={save}
                disabled={chunks.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                {t.download}
              </Button>
            </div>
          </header>

          {result.error ? (
            <div className="p-3">
              <ErrorNote>{errorText(result.error, locale)}</ErrorNote>
            </div>
          ) : chunks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-4 py-16 text-xs text-foreground-faint">
              <Blocks className="mr-2 h-4 w-4" />
              {t.empty}
            </div>
          ) : (
            <ol className="max-h-[520px] divide-y divide-border overflow-auto">
              {chunks.slice(0, MAX_VISIBLE).map((chunk) => (
                <li key={chunk.index} className="flex flex-col gap-1 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-foreground-faint">
                      #{chunk.index + 1}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[11px] tabular-nums",
                        chunk.tokens > limit ? "text-red-fg" : "text-foreground-subtle"
                      )}
                    >
                      {format(chunk.tokens)} {t.tokens}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground-muted">
                    {chunk.text}
                  </p>
                </li>
              ))}
            </ol>
          )}

          {chunks.length > 0 && (
            <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-border px-3 font-mono text-[11px] text-foreground-faint">
              {t.summary(format(summary.chunks), format(summary.avgTokens), format(summary.maxTokens))}
            </footer>
          )}
        </section>
      </div>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
        <Blocks className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
