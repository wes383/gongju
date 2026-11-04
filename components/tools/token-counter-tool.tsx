"use client";

import * as React from "react";
import { ArrowDownToLine, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  InputArea,
  OptionBar,
  OptionField,
  SampleButton,
  Segmented,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import {
  CONTEXT_PRESETS,
  TOKENIZERS,
  contextBudget,
  estimateTokens,
  formatTokens,
  tokenizerChoices,
  tokenizerProfile,
  type TokenizerFamily,
} from "@/lib/tokens";

const COPY = {
  zh: {
    tokenizer: "分词器",
    input: "文本",
    stats: "估算结果",
    tokens: "tokens",
    breakdown: "构成",
    cjk: "中日韩字符",
    latin: "拉丁词",
    numeric: "数字",
    symbols: "符号与空白",
    chars: "字符",
    words: "词",
    ratio: "字符 / token",
    compare: "各分词器对比",
    budget: "上下文预算",
    window: "上下文窗口",
    used: "提示词",
    reserve: "预留回答",
    expected: "预计输出",
    fill: "用当前文本",
    available: "可用于提示词",
    remaining: "剩余",
    fits: "放得下",
    overflow: (value: string) => `超出 ${value} tokens`,
    usage: "窗口占用",
    sample: "示例",
    clear: "清空",
    note: "没有加载真正的分词词表：按拉丁词、中日韩字符、数字与符号分段估算，命中率通常在 10% 以内；代码、Emoji 与生僻字的偏差会更大。要精确数字，请用对应模型的官方 tokenizer。上下文预算里的“预留回答”是给模型留的空间，剩下的才是提示词可用的上限。",
    sampleText:
      "检索增强生成的第一步是把文档切成合适的片段。片段太大，检索会带回一堆无关内容；片段太小，答案需要的上下文又被切断。所以切分点通常选在句子边界，并保留少量重叠。",
  },
  en: {
    tokenizer: "Tokenizer",
    input: "Text",
    stats: "Estimate",
    tokens: "tokens",
    breakdown: "Breakdown",
    cjk: "CJK characters",
    latin: "Latin words",
    numeric: "Digits",
    symbols: "Symbols & spaces",
    chars: "Characters",
    words: "Words",
    ratio: "Chars / token",
    compare: "Across tokenizers",
    budget: "Context budget",
    window: "Context window",
    used: "Prompt",
    reserve: "Answer reserve",
    expected: "Planned answer",
    fill: "Use this text",
    available: "Available for prompt",
    remaining: "Remaining",
    fits: "Fits",
    overflow: (value: string) => `${value} tokens over`,
    usage: "Window used",
    sample: "Sample",
    clear: "Clear",
    note: "No real vocabulary is loaded: the estimate splits text into Latin words, CJK characters, digits and symbols, and usually lands within ten percent. Code, emoji and rare characters drift further. For exact numbers use the vendor tokenizer. In the budget below, the reserve is the room you leave for the model, and the rest is what the prompt may use.",
    sampleText:
      "Retrieval augmented generation starts by cutting documents into chunks. Make them too large and the retriever drags in unrelated paragraphs; make them too small and the answer loses the context it needs. That is why cut points land on sentence boundaries, with a little overlap.",
  },
};



function num(value: string): number {
  const cleaned = value.replace(/[\s,_]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function Field({
  label,
  value,
  onChange,
  suffix,
  action,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  suffix: string;
  action?: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] text-foreground-muted">
        {label}
        {action}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="numeric"
          spellCheck={false}
          aria-label={label}
          size="xs"
          className="min-w-0 font-mono text-sm"
        />
        <span className="shrink-0 text-[11px] text-foreground-faint">{suffix}</span>
      </span>
    </label>
  );
}

export function TokenCounterTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [text, setText] = React.useState("");
  const [family, setFamily] = React.useState<TokenizerFamily>("o200k");
  const [window, setWindow] = React.useState("128000");
  const [used, setUsed] = React.useState("");
  const [reserve, setReserve] = React.useState("4000");
  const [expected, setExpected] = React.useState("800");

  const families = tokenizerChoices(locale);
  const estimate = React.useMemo(() => estimateTokens(text, family), [text, family]);
  const profile = tokenizerProfile(family);
  const format = (value: number) => formatTokens(value, locale);

  const budget = contextBudget({
    window: num(window),
    used: num(used),
    reserve: num(reserve),
    expected: num(expected),
  });

  const parts = [
    { key: t.cjk, value: estimate.cjk, className: "bg-foreground" },
    { key: t.latin, value: estimate.latin, className: "bg-foreground-muted" },
    { key: t.numeric, value: estimate.numeric, className: "bg-border-strong" },
    { key: t.symbols, value: estimate.symbols, className: "bg-foreground-faint" },
  ];
  const total = Math.max(1, parts.reduce((sum, part) => sum + part.value, 0));

  const row = (label: string, value: string, strong = false) => (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1 truncate text-xs text-foreground-muted">{label}</span>
      <span
        className={cn(
          "shrink-0 font-mono text-xs tabular-nums",
          strong ? "font-semibold text-foreground" : "text-foreground-muted"
        )}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <OptionField label={t.tokenizer}>
          <Segmented
            ariaLabel={t.tokenizer}
            value={family}
            onChange={setFamily}
            options={families}
          />
        </OptionField>
        <span className="font-mono text-[11px] text-foreground-subtle">{profile.detail}</span>
      </OptionBar>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
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
            className="min-h-[300px]"
          />
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex h-11 items-center border-b border-border px-4">
            <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
              {t.stats}
            </span>
          </header>

          <div className="flex items-baseline gap-2 px-4 pb-3 pt-4">
            <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">
              {format(estimate.total)}
            </span>
            <span className="text-[11px] text-foreground-faint">{t.tokens}</span>
          </div>

          <div className="flex h-1.5 gap-px overflow-hidden px-4">
            {parts.map((part) => (
              <span
                key={part.key}
                className={cn("h-full", part.className)}
                style={{ width: `${(part.value / total) * 100}%` }}
                title={`${part.key}: ${format(part.value)}`}
              />
            ))}
          </div>

          <div className="mt-3 divide-y divide-border border-t border-border">
            {parts.map((part) => row(part.key, format(part.value)))}
            {row(t.chars, format(estimate.chars))}
            {row(t.words, format(estimate.words))}
            {row(t.ratio, estimate.charsPerToken > 0 ? estimate.charsPerToken.toFixed(2) : "—")}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
          <span className="text-xs font-medium text-foreground-muted">{t.budget}</span>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {CONTEXT_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="ghost"
                size="xs"
                className="font-mono text-[11px]"
                onClick={() => setWindow(String(preset))}
              >
                {preset >= 1_000_000 ? `${preset / 1_000_000}M` : `${preset / 1000}k`}
              </Button>
            ))}
          </div>
        </header>

        <div className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.window} suffix="tokens" value={window} onChange={setWindow} />
          <Field
            label={t.used}
            suffix="tokens"
            value={used}
            onChange={setUsed}
            action={
              <button
                type="button"
                onClick={() => setUsed(String(estimate.total))}
                className="inline-flex items-center gap-0.5 rounded px-1 text-[10px] text-foreground-faint transition-colors hover:bg-hover-bg hover:text-foreground"
              >
                <ArrowDownToLine className="h-3 w-3" />
                {t.fill}
              </button>
            }
          />
          <Field label={t.reserve} suffix="tokens" value={reserve} onChange={setReserve} />
          <Field label={t.expected} suffix="tokens" value={expected} onChange={setExpected} />
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-hover-bg-strong">
            <span
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${budget.usage * 100}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-foreground-subtle">
            <span>
              {t.available}{" "}
              <span className="font-mono tabular-nums text-foreground">
                {format(budget.available)}
              </span>
            </span>
            <span>
              {t.remaining}{" "}
              <span
                className={cn(
                  "font-mono tabular-nums",
                  budget.fits ? "text-foreground" : "text-red-fg"
                )}
              >
                {format(Math.max(0, budget.remaining))}
              </span>
            </span>
            <span className="ml-auto">
              {budget.fits ? (
                <span className="text-green-fg">{t.fits}</span>
              ) : (
                <span className="text-red-fg">{t.overflow(format(budget.overflow))}</span>
              )}
            </span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-9 items-center border-b border-border px-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {t.compare}
          </span>
        </header>
        <div className="divide-y divide-border">
          {TOKENIZERS.map((item) => {
            const value = estimateTokens(text, item.id).total;
            const active = item.id === family;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFamily(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                  active ? "bg-hover-bg" : "hover:bg-hover-bg"
                )}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-xs",
                    active ? "font-medium text-foreground" : "text-foreground-muted"
                  )}
                >
                  {item.label[locale]}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-foreground-faint">
                  {item.detail}
                </span>
                <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-foreground">
                  {format(value)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-subtle">
        <ScanText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
