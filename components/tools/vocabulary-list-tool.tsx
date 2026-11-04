"use client";

import * as React from "react";
import { CopyButton, ErrorNote, InputArea, Pane, SampleButton, Segmented } from "@/components/tools/tool-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { buildGlossary, glossaryTsv, type Glossary, type WordMode } from "@/lib/words";

const SAMPLE = `The expedition left the valley before dawn, carrying little more than dried food and a compass that had already begun to drift.

By noon the ridge had vanished behind a wall of cloud, and the guide admitted that the map was older than either of them. Nobody panicked. They simply walked more slowly, stopping every hundred paces to listen for water.`;

type SortMode = "frequency" | "appearance" | "alphabetical";

const COPY = {
  zh: {
    input: "原文",
    placeholder: "粘贴一段要精读的文章…",
    known: "已掌握的词",
    knownPlaceholder: "每行一个，或用逗号分隔。这些词不会进入生词表：\nthe, expedition, valley",
    knownHint: "留空则不对照，所有词都算候选",
    sample: "示例",
    mode: "语言",
    latin: "英文",
    cjk: "汉字",
    minCount: "至少出现",
    times: (n: number) => `${n} 次`,
    limit: "数量",
    sort: "排序",
    byFrequency: "出现次数",
    byAppearance: "首次出现",
    byAlphabet: "字母",
    results: "生词表",
    empty: "输入原文后，这里列出还没掌握的词",
    count: "次",
    copyList: "复制词表",
    copyWords: "只复制单词",
    summary: (n: number) => `${n} 个生词`,
    filtered: (known: number, rare: number) =>
      [known > 0 ? `已掌握 ${known} 个` : "", rare > 0 ? `太少见 ${rare} 个` : ""]
        .filter(Boolean)
        .join(" · "),
    hint: "生词表按出现次数排序，每行附上该词第一次出现的句子——背词时能带回原文语境，比孤立的词表更容易记住。",
    note: "虚词（a / the / of / 的 / 了…）默认不进入生词表。中文按单个汉字统计，日文假名不参与统计。",
  },
  en: {
    input: "Passage",
    placeholder: "Paste the text you want to read closely…",
    known: "Words you know",
    knownPlaceholder: "One per line, or comma separated. They stay out of the list:\nthe, expedition, valley",
    knownHint: "Leave empty to consider every word a candidate",
    sample: "Sample",
    mode: "Language",
    latin: "English",
    cjk: "Han",
    minCount: "Appears at least",
    times: (n: number) => `${n}×`,
    limit: "Count",
    sort: "Sort by",
    byFrequency: "Frequency",
    byAppearance: "First seen",
    byAlphabet: "Alphabet",
    results: "Study list",
    empty: "Paste a passage and the words you have not learned yet show up here",
    count: "×",
    copyList: "Copy list",
    copyWords: "Copy words only",
    summary: (n: number) => `${n} words`,
    filtered: (known: number, rare: number) =>
      [known > 0 ? `${known} already known` : "", rare > 0 ? `${rare} too rare` : ""]
        .filter(Boolean)
        .join(" · "),
    hint: "Entries are ordered by how often they appear, each with the sentence it first showed up in — words stick better when the context comes along.",
    note: "Function words (a, the, of, 的, 了…) never make the list. Han text is counted per character; kana is ignored.",
  },
};

const MIN_COUNTS = [1, 2, 3, 5];
const LIMITS = [50, 100, 200, 500];

export function VocabularyListTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState(SAMPLE);
  const [known, setKnown] = React.useState("");
  const [mode, setMode] = React.useState<WordMode>("latin");
  const [minCount, setMinCount] = React.useState("1");
  const [limit, setLimit] = React.useState("100");
  const [sort, setSort] = React.useState<SortMode>("frequency");

  const result = React.useMemo(() => {
    if (!input.trim()) return { value: null, error: null };
    return safe(() =>
      buildGlossary(input, {
        mode,
        known: known.trim() === "" ? undefined : known,
        minCount: Number(minCount),
        minLength: mode === "cjk" ? 1 : 2,
        stopwords: true,
        limit: Number(limit),
      })
    );
  }, [input, known, mode, minCount, limit]);

  const data: Glossary | null = result.value;

  const entries = React.useMemo(() => {
    if (!data) return [];
    const list = [...data.entries];
    if (sort === "appearance") list.sort((a, b) => a.first - b.first);
    else if (sort === "alphabetical") list.sort((a, b) => a.word.localeCompare(b.word));
    return list;
  }, [data, sort]);

  const filtered = data ? t.filtered(data.knownSkipped, data.rareSkipped) : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.input}
              footer={<span>{data ? t.summary(entries.length) : "—"}</span>}
            >
              <InputArea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label={t.input}
                placeholder={t.placeholder}
                className="min-h-[240px]"
              />
            </Pane>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane label={t.known} footer={<span className="truncate">{t.knownHint}</span>}>
              <InputArea
                value={known}
                onChange={(event) => setKnown(event.target.value)}
                aria-label={t.known}
                placeholder={t.knownPlaceholder}
                className="min-h-[88px] font-mono text-[12px]"
              />
            </Pane>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Segmented
              ariaLabel={t.mode}
              value={mode}
              onChange={setMode}
              options={[
                { value: "latin", label: t.latin },
                { value: "cjk", label: t.cjk },
              ]}
            />
            <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
              {t.minCount}
              <Select value={minCount} onValueChange={setMinCount}>
                <SelectTrigger size="xs" className="h-7 w-auto min-w-[76px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MIN_COUNTS.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {t.times(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-foreground-muted">
              {t.limit}
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
            <SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <h2 className="text-xs font-medium text-foreground-muted">{t.results}</h2>
            {data && (
              <span className="text-[11px] text-foreground-faint">{filtered}</span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
                <SelectTrigger size="xs" className="h-7 w-auto min-w-[108px] text-xs" aria-label={t.sort}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frequency">{t.byFrequency}</SelectItem>
                  <SelectItem value="appearance">{t.byAppearance}</SelectItem>
                  <SelectItem value="alphabetical">{t.byAlphabet}</SelectItem>
                </SelectContent>
              </Select>
              {data && (
                <>
                  <CopyButton value={entries.map((entry) => entry.word).join("\n")} label={t.copyWords} size="xs" />
                  <CopyButton value={glossaryTsv(entries)} label={t.copyList} size="xs" />
                </>
              )}
            </div>
          </div>

          {result.error ? (
            <div className="p-3">
              <ErrorNote>{errorText(result.error, locale)}</ErrorNote>
            </div>
          ) : entries.length === 0 ? (
            <p className="px-3 py-6 text-[13px] text-foreground-faint">{t.empty}</p>
          ) : (
            <ol className="max-h-[520px] overflow-y-auto">
              {entries.map((entry, index) => (
                <li
                  key={entry.word}
                  className="flex gap-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <span className="w-6 shrink-0 pt-0.5 text-right font-mono text-[11px] text-foreground-faint">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-medium text-foreground">{entry.word}</span>
                      <span className="font-mono text-[11px] text-foreground-faint">
                        {entry.count}
                        {t.count}
                      </span>
                    </div>
                    {entry.context && (
                      <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-foreground-subtle">
                        {entry.context}
                      </p>
                    )}
                  </div>
                  <CopyButton value={entry.word} size="icon-xs" />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
