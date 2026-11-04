"use client";

import * as React from "react";
import { InputArea, Pane, SampleButton, WarningNote } from "@/components/tools/tool-ui";
import { useCopy, useLocale } from "@/components/locale-provider";
import { errorText, safe } from "@/lib/errors";
import { readability, readingLevel, type Readability, type ReadingLevel } from "@/lib/readability";

const SAMPLE = `The old harbour was quiet that morning. A few boats rocked against the wooden pier, and the gulls argued over something invisible in the water.

Nobody had told the fishermen that the ferry would stop running, so they waited on the stones with their hands in their pockets, watching the horizon for a shape that never appeared.`;

const COPY = {
  zh: {
    input: "文本",
    placeholder: "粘贴一段英文（或中文）文本，可读性指标会实时更新…",
    sample: "示例",
    empty: "输入文本后这里会给出难度指标",
    english: "英文指标",
    chinese: "中文概况",
    words: "词数",
    sentences: "句子",
    syllables: "音节",
    avgSentence: "平均句长",
    avgSyllable: "平均音节",
    complex: "多音节词",
    flesch: "Flesch 阅读难度",
    fk: "Flesch–Kincaid 年级",
    fog: "Gunning Fog 指数",
    ari: "ARI 指数",
    coleman: "Coleman–Liau 指数",
    smog: "SMOG 指数",
    grade: "年级",
    needSentences: "至少需要 3 句",
    characters: "汉字",
    cjkSentences: "句子",
    cjkAvg: "平均句长",
    unique: "不重复字",
    levels: {
      veryEasy: "很容易",
      easy: "容易",
      fairlyEasy: "较容易",
      plain: "标准",
      fairlyHard: "较难",
      hard: "难",
      veryHard: "很难",
    } as Record<ReadingLevel, string>,
    hint: "这些指数都建立在「词数、句数、音节数」上。英文是母语读写研究里的经典公式，适合比较两篇文章的相对难度，不是绝对标准。",
    cjkNote: "中文没有对应的成熟指数（需要分词和词表），这里只给出文本规模：字数、平均句长和不重复字数。",
    note: "音节按元音组估算，常见例外（people、science、idea 等）单独处理；多音节词指 3 个音节及以上。分数仅供参考，不构成学习建议。",
  },
  en: {
    input: "Text",
    placeholder: "Paste an English (or Chinese) passage — the scores update as you type…",
    sample: "Sample",
    empty: "Paste some text and the readability scores appear here",
    english: "English metrics",
    chinese: "Chinese profile",
    words: "Words",
    sentences: "Sentences",
    syllables: "Syllables",
    avgSentence: "Words / sentence",
    avgSyllable: "Syllables / word",
    complex: "Polysyllables",
    flesch: "Flesch reading ease",
    fk: "Flesch–Kincaid grade",
    fog: "Gunning Fog",
    ari: "ARI",
    coleman: "Coleman–Liau",
    smog: "SMOG",
    grade: "grade",
    needSentences: "needs 3+ sentences",
    characters: "Han characters",
    cjkSentences: "Sentences",
    cjkAvg: "Characters / sentence",
    unique: "Unique characters",
    levels: {
      veryEasy: "Very easy",
      easy: "Easy",
      fairlyEasy: "Fairly easy",
      plain: "Plain",
      fairlyHard: "Fairly hard",
      hard: "Hard",
      veryHard: "Very hard",
    } as Record<ReadingLevel, string>,
    hint: "Every index here rests on three counts: words, sentences and syllables. They come from first-language reading research, so they compare two passages well but say little in absolute terms.",
    cjkNote: "Chinese has no comparable index without word segmentation and a word list, so this side reports the shape of the text only: characters, sentence length and character variety.",
    note: "Syllables are estimated from vowel groups, with a short list of common exceptions (people, science, idea…). Polysyllables have three syllables or more. The numbers are a guide, not a study plan.",
  },
};

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-b-0">
      <dt className="text-[11px] text-foreground-muted" title={hint}>
        {label}
      </dt>
      <dd className="font-mono text-[12.5px] tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function FleschScale({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-2 rounded-full bg-hover-bg">
        <div
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface bg-accent"
          style={{ left: `${clamped}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-foreground-faint">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

export function ReadabilityTool() {
  const t = useCopy(COPY);
  const locale = useLocale();
  const [input, setInput] = React.useState(SAMPLE);

  const result = React.useMemo(
    () => (input.trim() ? safe(() => readability(input)) : { value: null, error: null }),
    [input]
  );

  const data: Readability | null = result.value;
  const english = data?.english ?? null;
  const cjk = data?.cjk ?? null;
  const num = (value: number | null | undefined, digits = 1) =>
    value === null || value === undefined ? "—" : value.toFixed(digits);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <Pane
              label={t.input}
              footer={
                <span>
                  {data
                    ? [
                        english ? `${english.words} ${t.words.toLowerCase()}` : "",
                        cjk && cjk.characters > 0 ? `${cjk.characters} ${t.characters}` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "—"}
                </span>
              }
            >
              <InputArea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                aria-label={t.input}
                placeholder={t.placeholder}
                className="min-h-[340px]"
              />
            </Pane>
          </div>
          <div className="flex items-center gap-1">
            <SampleButton onClick={() => setInput(SAMPLE)} label={t.sample} />
          </div>
          <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.hint}</p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {result.error ? (
            <div className="rounded-lg border border-border bg-surface p-3">
              <WarningNote>{errorText(result.error, locale)}</WarningNote>
            </div>
          ) : !data ? (
            <div className="rounded-lg border border-border bg-surface px-3 py-6 text-[13px] text-foreground-faint">
              {t.empty}
            </div>
          ) : (
            <>
              {english && (
                <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-xs font-medium text-foreground-muted">{t.english}</h2>
                    <span className="font-mono text-[11px] text-foreground-faint">
                      {english.words} {t.words.toLowerCase()} · {english.sentences}{" "}
                      {t.sentences.toLowerCase()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[11px] text-foreground-muted">{t.flesch}</span>
                      <span className="font-mono text-[13px] tabular-nums text-foreground">
                        {num(english.scores.flesch)} · {t.levels[readingLevel(english.scores.flesch)]}
                      </span>
                    </div>
                    <FleschScale score={english.scores.flesch} />
                  </div>

                  <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    <Row label={t.fk} value={`${num(english.scores.fk)} ${t.grade}`} />
                    <Row label={t.fog} value={num(english.scores.fog)} />
                    <Row label={t.ari} value={num(english.scores.ari)} />
                    <Row label={t.coleman} value={num(english.scores.colemanLiau)} />
                    <Row
                      label={t.smog}
                      value={
                        english.scores.smog === null
                          ? t.needSentences
                          : num(english.scores.smog)
                      }
                    />
                    <Row label={t.complex} value={String(english.complexWords)} />
                    <Row label={t.avgSentence} value={num(english.avgSentence, 1)} />
                    <Row label={t.avgSyllable} value={num(english.avgSyllables, 2)} />
                    <Row label={t.syllables} value={String(english.syllables)} />
                  </dl>
                </section>
              )}

              {cjk && cjk.characters > 0 && (
                <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
                  <h2 className="text-xs font-medium text-foreground-muted">{t.chinese}</h2>
                  <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    <Row label={t.characters} value={String(cjk.characters)} />
                    <Row label={t.cjkSentences} value={String(cjk.sentences)} />
                    <Row label={t.cjkAvg} value={num(cjk.avgSentence, 1)} />
                    <Row label={t.unique} value={String(cjk.unique)} />
                  </dl>
                  <p className="text-[11px] leading-relaxed text-foreground-subtle">{t.cjkNote}</p>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
