"use client";

import * as React from "react";
import { textStats } from "@/lib/text";
import { useCopy } from "@/components/locale-provider";
import { ClearButton, SampleButton } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    inputLabel: "文本",
    placeholder: "粘贴或输入文本，统计结果会实时更新…",
    sample: "示例",
    sampleText:
      "GongJu 是一个纯前端的在线工具箱。\n\n它包含编码解码、JSON 处理、文本处理等工具，所有计算都在浏览器本地完成。\nEverything stays in your browser — no upload, no tracking.",
    chars: "字符（含空格）",
    charsNoSpaces: "字符（不含空格）",
    words: "词数",
    cjk: "汉字数",
    lines: "行数",
    nonEmptyLines: "非空行",
    paragraphs: "段落",
    sentences: "句子",
    bytes: "字节（UTF-8）",
    reading: "阅读时长",
    minute: "分钟",
    second: "秒",
    empty: "输入文本后这里会显示统计结果",
  },
  en: {
    inputLabel: "Text",
    placeholder: "Paste or type text, the numbers update as you go…",
    sample: "Sample",
    sampleText:
      "GongJu is a browser-only toolbox.\n\nIt covers encoding, JSON and text utilities, and every calculation runs locally.\nEverything stays in your browser — no upload, no tracking.",
    chars: "Characters",
    charsNoSpaces: "Characters (no spaces)",
    words: "Words",
    cjk: "CJK characters",
    lines: "Lines",
    nonEmptyLines: "Non-empty lines",
    paragraphs: "Paragraphs",
    sentences: "Sentences",
    bytes: "Bytes (UTF-8)",
    reading: "Reading time",
    minute: "min",
    second: "sec",
    empty: "Statistics appear once you type something",
  },
};

export function TextStatsTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");

  const stats = React.useMemo(() => textStats(input), [input]);
  const reading =
    stats.readingMinutes >= 1
      ? `${Math.round(stats.readingMinutes)} ${t.minute}`
      : `${Math.round(stats.readingMinutes * 60)} ${t.second}`;

  const items = [
    { label: t.chars, value: stats.chars },
    { label: t.charsNoSpaces, value: stats.charsNoSpaces },
    { label: t.words, value: stats.words },
    { label: t.cjk, value: stats.cjk },
    { label: t.lines, value: stats.lines },
    { label: t.nonEmptyLines, value: stats.nonEmptyLines },
    { label: t.paragraphs, value: stats.paragraphs },
    { label: t.sentences, value: stats.sentences },
    { label: t.bytes, value: stats.bytes },
    { label: t.reading, value: input.trim() ? reading : "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-11 items-center gap-2 border-b border-border px-3">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.inputLabel}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <SampleButton onClick={() => setInput(t.sampleText)} />
            <ClearButton onClick={() => setInput("")} />
          </div>
        </header>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          placeholder={t.placeholder}
          aria-label={t.inputLabel}
          className="min-h-[220px] w-full resize-y bg-transparent px-3.5 py-3 text-[13px] leading-relaxed text-foreground placeholder:text-foreground-faint focus:outline-none"
        />
      </div>

      {input.trim() ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <span className="text-[11px] leading-tight text-foreground-subtle">
                {item.label}
              </span>
              <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-foreground-subtle">
          {t.empty}
        </p>
      )}
    </div>
  );
}
