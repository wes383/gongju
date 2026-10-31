"use client";

import * as React from "react";
import {
  DualPane,
  OptionBar,
  SampleButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { annotateDots, convertBraille, type BrailleMode, type ToneLevel } from "@/lib/braille";

const COPY = {
  zh: {
    mode: "语言",
    en: "英文盲文",
    zh: "中文盲文",
    text: "文本",
    braille: "盲文",
    placeholder: "粘贴文本或盲文，会自动判断方向",
    dots: "点位编号",
    grade: "缩写级别",
    grade1: "Grade 1",
    grade2: "Grade 2",
    tone: "标调",
    tone1: "一级",
    tone2: "二级",
    approximate: "近似还原",
    sampleEn: "Hello, world! 2026",
    sampleZh: "你好，世界！今天天气不错。",
    hint: "输入文本转盲文；粘贴 ⠁⠃⠉ 这类盲文字符则转回文本。",
    noteEn1: "英文按一级盲文（Grade 1）逐字母转写，可以完整还原。",
    noteEn2:
      "英文按 UEB 二级盲文（Grade 2）缩写转写：整词缩写、部分词缩写与 75 个简写词都已覆盖。一级模式标记、音节边界、连字符复合词和“最佳缩写”优先级未做处理，个别位置会与出版级转写不同；反向是多解还原，只能给出最可能的原文。",
    noteZh1:
      "中文按国家通用盲文方案逐字写声母、韵母与声调（一级标调：每个音节都标调），不做省写和分词连写。中文盲文只能还原为拼音——同音字无法从点位确定。",
    noteZh2:
      "中文按国家通用盲文二级标调：在逐音节标调的基础上，按声母组别省写特定声调——f 省阴平，p/m/t/n/h/q/ch/r/c 省阳平，b/d/l/g/k/j/x/zh/sh/z/s 省去声，零声母省去声，o 系列省、e 系列不省。规范还要求“需要声调区分音义时不省”，这需要判断语义，工具做不到，这类位置仍需人工复核。",
  },
  en: {
    mode: "Language",
    en: "English",
    zh: "Chinese",
    text: "Text",
    braille: "Braille",
    placeholder: "Paste text or braille — the direction is detected",
    dots: "Dot numbers",
    grade: "Contractions",
    grade1: "Grade 1",
    grade2: "Grade 2",
    tone: "Tones",
    tone1: "Level 1",
    tone2: "Level 2",
    approximate: "approximate",
    sampleEn: "Hello, world! 2026",
    sampleZh: "你好，世界！今天天气不错。",
    hint: "Plain text becomes braille; braille cells such as ⠁⠃⠉ are read back as text.",
    noteEn1: "English uses Grade 1 braille, one cell per letter, and reads back exactly.",
    noteEn2:
      "English uses UEB Grade 2 contractions: whole-word signs, part-word signs and all 75 shortforms. Grade 1 mode indicators, syllable boundaries, hyphenated compounds and the “best contraction” preference rules are not modelled, so a few positions differ from a press-quality transcription. Decoding is a best-effort expansion because most cells carry more than one reading.",
    noteZh1:
      "Chinese follows the national scheme, one syllable at a time with its tone (level 1 marks every syllable), without abbreviations or word spacing. Chinese braille decodes to pinyin only — homophones cannot be recovered from the dots.",
    noteZh2:
      "Chinese uses the national level 2 tone rules: on top of marking every syllable, tones are elided by initial group — f drops 阴平; p/m/t/n/h/q/ch/r/c drop 阳平; b/d/l/g/k/j/x/zh/sh/z/s drop 去声; zero initials drop 去声; o keeps nothing while e keeps everything. The scheme also requires a tone wherever it disambiguates meaning, which needs semantics — those few spots still need a human check.",
  },
};

export function BrailleTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<BrailleMode>("en");
  const [dots, setDots] = React.useState(false);
  const [grade, setGrade] = React.useState<1 | 2>(1);
  const [toneLevel, setToneLevel] = React.useState<ToneLevel>(1);
  const [input, setInput] = React.useState("");

  const result = React.useMemo(
    () => convertBraille(input, mode, { grade, toneLevel }),
    [input, mode, grade, toneLevel]
  );
  const decoding = result.direction === "decode";
  const output = dots && !decoding ? annotateDots(result.output) : result.output;

  const sample = mode === "zh" ? t.sampleZh : t.sampleEn;

  const note =
    mode === "en" ? (grade === 2 ? t.noteEn2 : t.noteEn1) : toneLevel === 2 ? t.noteZh2 : t.noteZh1;

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.mode}
          value={mode}
          onChange={setMode}
          options={[
            { value: "en", label: t.en },
            { value: "zh", label: t.zh },
          ]}
        />
        {mode === "en" ? (
          <Segmented
            ariaLabel={t.grade}
            value={String(grade)}
            onChange={(value) => setGrade(value === "2" ? 2 : 1)}
            options={[
              { value: "1", label: t.grade1 },
              { value: "2", label: t.grade2 },
            ]}
          />
        ) : (
          <Segmented
            ariaLabel={t.tone}
            value={String(toneLevel)}
            onChange={(value) => setToneLevel(value === "2" ? 2 : 1)}
            options={[
              { value: "1", label: t.tone1 },
              { value: "2", label: t.tone2 },
            ]}
          />
        )}
        <Toggle checked={dots} onChange={setDots} label={t.dots} />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={decoding ? t.braille : t.text}
        outputLabel={decoding ? t.text : t.braille}
        inputPlaceholder={t.placeholder}
        inputActions={<SampleButton onClick={() => setInput(sample)} />}
        onClear={() => setInput("")}
        inputFooter={<span>{t.hint}</span>}
        outputFooter={
          output ? (
            <span>
              {Array.from(output).length}
              {result.approximate ? ` · ${t.approximate}` : ""}
            </span>
          ) : null
        }
      />

      <p className="px-1 text-[11px] leading-relaxed text-foreground-faint">{note}</p>
    </div>
  );
}
