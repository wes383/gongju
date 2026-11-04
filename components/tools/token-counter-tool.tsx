"use client";

import * as React from "react";
import { ArrowDownToLine, ScanText, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClearButton,
  InputArea,
  OptionBar,
  OptionField,
  SampleButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { cn } from "@/lib/utils";
import {
  CONTEXT_PRESETS,
  TOKENIZERS,
  contextBudget,
  estimateTokens,
  formatTokens,
  longContextSurcharge,
  tokenizerChoices,
  tokenizerProfile,
  type TokenizerFamily,
} from "@/lib/tokens";
import { countTokensExact, supportsExact } from "@/lib/tokenizer-exact";

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
    symbols: "符号 / Emoji / 空白",
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
    exactMode: "精确模式",
    exactHint: "用官方 BPE 词表计数，首次开启需要下载约 1 MB 词表",
    exact: "精确",
    estimate: "估算",
    exactLoading: "加载词表…",
    exactFailed: "词表加载失败，已回退估算",
    exactUnsupported: "该家族没有公开词表，仍为估算",
    compareEstimate: "各分词器对比（估算）",
    surcharge: "提示词超过 272K：OpenAI 会把整次请求按 2 倍计价，而不是只算超出的部分。",
    note: "默认按拉丁词、中日韩字符、数字、标点与 Emoji 分段估算：英文段落通常偏差 5% 以内，代码偏低约 10%，中文可能差 15%。开启精确模式后，GPT 家族改用官方词表计算总数（首次加载约 1 MB），构成明细仍是估算拆分；Claude、Gemini、Llama 没有公开词表，只能估算。上下文预算里的“预留回答”是给模型留的空间，剩下的才是提示词可用的上限。",
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
    symbols: "Symbols / emoji / spaces",
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
    exactMode: "Exact mode",
    exactHint: "Counts with the official BPE vocabulary; the first run downloads about 1 MB",
    exact: "Exact",
    estimate: "Estimate",
    exactLoading: "Loading vocabulary…",
    exactFailed: "Vocabulary failed to load, falling back to the estimate",
    exactUnsupported: "No public vocabulary for this family, still an estimate",
    compareEstimate: "Across tokenizers (estimate)",
    surcharge: "Prompt is above 272K: OpenAI bills the whole request at double, not just the part over the line.",
    note: "By default the estimate splits text into Latin words, CJK characters, digits, punctuation and emoji: English prose usually lands within five percent, code runs about ten percent low, Chinese can drift fifteen percent. Turn on exact mode and the GPT families count with their official vocabulary (about 1 MB on first load), while the breakdown stays an estimate; Claude, Gemini and Llama publish no vocabulary, so they stay estimated. In the budget below, the reserve is the room you leave for the model, and the rest is what the prompt may use.",
    sampleText:
      "Retrieval augmented generation starts by cutting documents into chunks. Make them too large and the retriever drags in unrelated paragraphs; make them too small and the answer loses the context it needs. That is why cut points land on sentence boundaries, with a little overlap.",
  },
};



function num(value: string): number {
  const cleaned = value.replace(/[\s,_]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** 8_192 → "8.2k", 1_050_000 → "1.05M" */
function presetLabel(value: number): string {
  if (value >= 1_000_000) return `${Number((value / 1_000_000).toFixed(2))}M`;
  return `${Number((value / 1000).toFixed(1))}k`;
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

type ExactCount = { key: string; tokens: number } | { key: string; failed: true };

/** Debounce so a fast typist does not re-encode on every keystroke */
const EXACT_DELAY_MS = 250;

export function TokenCounterTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [text, setText] = React.useState("");
  const [family, setFamily] = React.useState<TokenizerFamily>("o200k");
  const [contextWindow, setContextWindow] = React.useState("128000");
  const [used, setUsed] = React.useState("");
  const [reserve, setReserve] = React.useState("4000");
  const [expected, setExpected] = React.useState("800");
  const [exact, setExact] = React.useState(false);
  const [exactCount, setExactCount] = React.useState<ExactCount | null>(null);

  const families = tokenizerChoices(locale);
  const estimate = React.useMemo(() => estimateTokens(text, family), [text, family]);
  const profile = tokenizerProfile(family);
  const format = (value: number) => formatTokens(value, locale);

  // Results are keyed by family + text, so switching either one shows "loading"
  // immediately without a synchronous state update inside the effect.
  const exactKey = `${family}\u0000${text}`;
  const current = exactCount?.key === exactKey ? exactCount : null;
  const exactTokens = exact && current && "tokens" in current ? current.tokens : null;

  const exactStatus: "off" | "unsupported" | "empty" | "loading" | "failed" | "done" = !exact
    ? "off"
    : !supportsExact(family)
      ? "unsupported"
      : text.trim() === ""
        ? "empty"
        : !current
          ? "loading"
          : "tokens" in current
            ? "done"
            : "failed";

  React.useEffect(() => {
    if (!exact || text.trim() === "" || !supportsExact(family)) return;
    const target = family;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      countTokensExact(text, target)
        .then((tokens) => {
          if (!cancelled) setExactCount({ key: exactKey, tokens });
        })
        .catch(() => {
          if (!cancelled) setExactCount({ key: exactKey, failed: true });
        });
    }, EXACT_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [exact, text, family, exactKey]);

  const displayTotal = exactTokens ?? estimate.total;
  const exactNote =
    exactStatus === "done"
      ? `${t.exact} · ${profile.detail}`
      : exactStatus === "loading"
        ? t.exactLoading
        : exactStatus === "failed"
          ? t.exactFailed
          : exactStatus === "unsupported"
            ? t.exactUnsupported
            : t.estimate;

  const budget = contextBudget({
    window: num(contextWindow),
    used: num(used),
    reserve: num(reserve),
    expected: num(expected),
  });

  // The doubling applies to what actually goes into the request: whatever is in
  // the prompt field, or the text being measured when that field is empty.
  const surcharge = longContextSurcharge(family, num(used) || displayTotal);

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
        <div className="ml-auto flex items-center gap-3">
          <Toggle checked={exact} onChange={setExact} label={t.exactMode} hint={t.exactHint} />
        </div>
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

          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 pb-3 pt-4">
            <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">
              {format(displayTotal)}
            </span>
            <span className="text-[11px] text-foreground-faint">{t.tokens}</span>
            <span
              className={cn(
                "text-[11px]",
                exactStatus === "done"
                  ? "text-green-fg"
                  : exactStatus === "failed"
                    ? "text-red-fg"
                    : "text-foreground-faint"
              )}
            >
              {exactNote}
            </span>
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
                onClick={() => setContextWindow(String(preset))}
              >
                {presetLabel(preset)}
              </Button>
            ))}
          </div>
        </header>

        <div className="grid gap-x-6 gap-y-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.window} suffix="tokens" value={contextWindow} onChange={setContextWindow} />
          <Field
            label={t.used}
            suffix="tokens"
            value={used}
            onChange={setUsed}
            action={
              <button
                type="button"
                onClick={() => setUsed(String(displayTotal))}
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
          {surcharge ? (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-yellow-fg">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t.surcharge}
            </p>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex h-9 items-center border-b border-border px-4">
          <span className="font-mono text-[11px] uppercase tracking-wide text-foreground-subtle">
            {exact ? t.compareEstimate : t.compare}
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
