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
import { annotateDots, convertBraille, type BrailleMode } from "@/lib/braille";

const COPY = {
  zh: {
    mode: "语言",
    en: "英文盲文",
    zh: "中文盲文",
    text: "文本",
    braille: "盲文",
    placeholder: "粘贴文本或盲文，会自动判断方向",
    dots: "点位编号",
    sampleEn: "Hello, world! 2026",
    sampleZh: "你好，世界！今天天气不错。",
    hint: "输入文本转盲文；粘贴 ⠁⠃⠉ 这类盲文字符则转回文本。",
    note: "英文按一级盲文（Grade 1）转写，中文按国家通用盲文方案逐字写声母、韵母与声调，不做省写和分词连写。中文盲文只能还原为拼音——同音字无法从点位确定；英文盲文可完整还原。",
  },
  en: {
    mode: "Language",
    en: "English",
    zh: "Chinese",
    text: "Text",
    braille: "Braille",
    placeholder: "Paste text or braille — the direction is detected",
    dots: "Dot numbers",
    sampleEn: "Hello, world! 2026",
    sampleZh: "你好，世界！今天天气不错。",
    hint: "Plain text becomes braille; braille cells such as ⠁⠃⠉ are read back as text.",
    note: "English uses Grade 1 braille. Chinese follows the national scheme, one syllable at a time with its tone, without abbreviations or word spacing. Chinese braille decodes to pinyin only — homophones cannot be recovered from the dots.",
  },
};

export function BrailleTool() {
  const t = useCopy(COPY);
  const [mode, setMode] = React.useState<BrailleMode>("en");
  const [dots, setDots] = React.useState(false);
  const [input, setInput] = React.useState("");

  const result = React.useMemo(() => convertBraille(input, mode), [input, mode]);
  const decoding = result.direction === "decode";
  const output = dots && !decoding ? annotateDots(result.output) : result.output;

  const sample = mode === "zh" ? t.sampleZh : t.sampleEn;

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
        outputFooter={output ? <span>{Array.from(output).length}</span> : null}
      />

      <p className="px-1 text-[11px] leading-relaxed text-foreground-faint">{t.note}</p>
    </div>
  );
}
