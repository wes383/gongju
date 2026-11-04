"use client";

import * as React from "react";
import { CopyButton, ErrorNote, InputArea, Pane, SampleButton, Segmented, Toggle } from "@/components/tools/tool-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { frequency, glossaryTsv, type Frequency, type WordMode } from "@/lib/words";

const SAMPLE = `The lighthouse had been dark for eleven years before the new keeper arrived.

She climbed the spiral staircase every evening, counting the steps out loud, and the habit made the tower feel smaller than it was. Most nights the sea stayed quiet. On the others the wind found the gaps in the old glass and played them like a broken instrument.`;

const COPY = {
  zh: {
    input: "文本",
    placeholder: "粘贴一段文章，词频会实时统计…",
    sample: "示例",
    mode: "统计单位",
    latin: "拉丁词",
    cjk: "汉字",
    stopwords: "忽略虚词",
    minLength: "最短长度",
    any: "不限",
    top: "显示",
    results: "词频",
    empty: "输入文本后这里会按出现次数排序",
    rank: "序号",
    word: "词",
    count: "次数",
    share: "占比",
    context: "首次出现的句子",
    tokens: "词数",
    unique: "不同词",
    filtered: "过滤前",
    copy: "复制词表",
    hint: "拉丁模式按字母串切词，撇号和连字符算词内字符（don't 与 don’t 视为同一个词）；汉字模式按单个汉字计数，中文分词需要词典，这里不假装能分。",
    note: "虚词表只包含 a / the / of / 的 / 了 这类功能词，实义动词和名词不会被过滤。所有统计在浏览器里完成，文本不会上传。",
    summary: (tokens: number, unique: number) => `${tokens} 词 · ${unique} 个不同词`,
  },
  en: {
    input: "Text",
    placeholder: "Paste an article — the word counts update as you type…",
    sample: "Sample",
    mode: "Count by",
    latin: "Latin words",
    cjk: "Han characters",
    stopwords: "Skip function words",
    minLength: "Min length",
    any: "Any",
    top: "Show",
    results: "Frequency",
    empty: "Paste some text and the words appear here, most frequent first",
    rank: "#",
    word: "Word",
    count: "Count",
    share: "Share",
    context: "First sentence",
    tokens: "Tokens",
    unique: "Unique",
    filtered: "Before filtering",
    copy: "Copy list",
    hint: "Latin mode splits on letter runs and keeps apostrophes and hyphens inside the word, so don't and don’t are one entry. Han mode counts single characters — real Chinese word segmentation needs a dictionary, and this tool does not pretend to have one.",
    note: "The stopword list only holds function words such as a, the, of, 的 and 了; content words are never removed. Every count happens in the browser.",
    summary: (tokens: number, unique: number) => `${tokens} tokens · ${unique} unique`,
  },
};

const MIN_LENGTHS = [1, 2, 3, 4];
const LIMITS = [25, 50, 100, 200];

function ShareBar({ share }: { share: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-hover-bg">
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, share * 100)}%` }} />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-foreground-faint">
        {(share * 100).toFixed(1)}%
      </span>
    </div>
  );
}

export function WordFrequencyTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState(SAMPLE);
  const [mode, setMode] = React.useState<WordMode>("latin");
  const [stopwords, setStopwords] = React.useState(true);
  const [minLength, setMinLength] = React.useState("1");
  const [limit, setLimit] = React.useState("50");

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: null, error: null };
    const run = safe(() =>
      frequency(input, {
        mode,
        stopwords,
        minLength: Number(minLength),
        limit: Number(limit),
      })
    );
    return run;
  }, [input, mode, stopwords, minLength, limit]);

  const data: Frequency | null = result.value;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              ariaLabel={t.mode}
              value={mode}
              onChange={setMode}
              options={[
                { value: "latin", label: t.latin },
                { value: "cjk", label: t.cjk },
              ]}
            />
            <Toggle checked={stopwords} onChange={setStopwords} label={t.stopwords} />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.input}
              footer={<span>{data ? t.summary(data.tokens, data.unique) : "—"}</span>}
            >
              <InputArea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label={t.input}
                placeholder={t.placeholder}
                className="min-h-[300px]"
              />
            </Pane>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />
            <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
              {t.minLength}
              <Select value={minLength} onValueChange={setMinLength}>
                <SelectTrigger size="xs" className="h-7 w-auto min-w-[76px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MIN_LENGTHS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value === 1 ? t.any : String(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
              {t.top}
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger size="xs" className="h-7 w-auto min-w-[68px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMITS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
            <h2 className="text-xs font-medium text-foreground-muted">{t.results}</h2>
            {data && (
              <CopyButton
                value={glossaryTsv(data.entries)}
                label={t.copy}
                size="xs"
              />
            )}
          </div>

          {result.error ? (
            <div className="p-3">
              <ErrorNote>{errorText(result.error, locale)}</ErrorNote>
            </div>
          ) : !data ? (
            <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
          ) : (
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead className="sticky top-0 bg-surface text-[11px] text-foreground-subtle">
                  <tr className="border-b border-border">
                    <th className="w-10 px-2 py-1.5 text-right font-medium">{t.rank}</th>
                    <th className="px-1 py-1.5 text-left font-medium">{t.word}</th>
                    <th className="w-14 px-1 py-1.5 text-right font-medium">{t.count}</th>
                    <th className="w-32 px-2 py-1.5 text-left font-medium">{t.share}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry, index) => (
                    <tr key={entry.word} className="border-b border-border last:border-b-0">
                      <td className="px-2 py-1.5 text-right font-mono text-[11px] text-foreground-faint">
                        {index + 1}
                      </td>
                      <td className="max-w-0 px-1 py-1.5">
                        <div className="truncate font-medium text-foreground" title={entry.word}>
                          {entry.word}
                        </div>
                        {entry.context && (
                          <div
                            className="truncate text-[11px] text-foreground-faint"
                            title={entry.context}
                          >
                            {entry.context}
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-1.5 text-right font-mono tabular-nums text-foreground">
                        {entry.count}
                      </td>
                      <td className="px-2 py-1.5">
                        <ShareBar share={entry.share} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-foreground-subtle">
        {data && (
          <>
            <span>
              {t.tokens} <span className="font-mono text-foreground-muted">{data.tokens}</span>
            </span>
            <span>
              {t.unique} <span className="font-mono text-foreground-muted">{data.unique}</span>
            </span>
            <span>
              {t.filtered} <span className="font-mono text-foreground-muted">{data.total}</span>
            </span>
          </>
        )}
        <span className="max-w-[68ch] leading-relaxed">{t.hint}</span>
      </div>
      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
