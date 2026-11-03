"use client";

import * as React from "react";
import { Type } from "lucide-react";
import { DualPane, OptionBar, SampleButton, Stats, Toggle } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { DEFAULT_PANGU, pangu, PANGU_SAMPLE, type PanguOptions } from "@/lib/pangu";

const COPY = {
  zh: {
    spacing: "中英文之间加空格",
    spacingHint: "盘古之白：汉字与字母、数字之间插入一个空格",
    punctuation: "中文标点",
    punctuationHint: "把紧跟在汉字后的 , ; : ? ! 换成全角标点",
    quotes: "中文引号",
    quotesHint: "把直引号换成 “ ” 与 ‘ ’",
    fullwidth: "全角字母数字转半角",
    fullwidthHint: "ＡＢＣ１２３ → ABC123",
    halfwidthPunct: "半角标点转全角",
    halfwidthPunctHint: "中文语境里的 , ; ! ? : 与括号转成全角",
    trim: "清理空白",
    trimHint: "去掉行尾空格，把连续空行压成一个",
    input: "原文",
    output: "排版后",
    added: (n: number) => `插入 ${n} 个空格`,
    note: "链接与邮箱会先被保护起来，不会被插入空格。加空格只影响排版，不改变文字内容。",
  },
  en: {
    spacing: "Space between CJK and Latin",
    spacingHint: "Insert a space between Chinese characters, Latin letters and digits",
    punctuation: "Chinese punctuation",
    punctuationHint: "Turn , ; : ? ! directly after Chinese text into full-width forms",
    quotes: "Curly quotes",
    quotesHint: "Replace straight quotes with “ ” and ‘ ’",
    fullwidth: "Full-width to half-width",
    fullwidthHint: "ＡＢＣ１２３ → ABC123",
    halfwidthPunct: "Half-width to full-width",
    halfwidthPunctHint: "Convert , ; ! ? : and brackets in Chinese context",
    trim: "Tidy whitespace",
    trimHint: "Strip trailing spaces and collapse runs of blank lines",
    input: "Text",
    output: "Typeset",
    added: (n: number) => `${n} space${n === 1 ? "" : "s"} inserted`,
    note: "URLs and e-mail addresses are protected first, so no spaces land inside them. The pass only changes typography, never the words.",
  },
};

export function PanguTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [options, setOptions] = React.useState<PanguOptions>(DEFAULT_PANGU);

  const result = React.useMemo(() => pangu(input, options), [input, options]);

  const set = (key: keyof PanguOptions) => (value: boolean) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Toggle
          checked={options.spacing}
          onChange={set("spacing")}
          label={t.spacing}
          hint={t.spacingHint}
        />
        <Toggle
          checked={options.punctuation}
          onChange={set("punctuation")}
          label={t.punctuation}
          hint={t.punctuationHint}
        />
        <Toggle checked={options.quotes} onChange={set("quotes")} label={t.quotes} hint={t.quotesHint} />
        <Toggle
          checked={options.fullwidth}
          onChange={set("fullwidth")}
          label={t.fullwidth}
          hint={t.fullwidthHint}
        />
        <Toggle
          checked={options.halfwidthPunct}
          onChange={set("halfwidthPunct")}
          label={t.halfwidthPunct}
          hint={t.halfwidthPunctHint}
        />
        <Toggle checked={options.trim} onChange={set("trim")} label={t.trim} hint={t.trimHint} />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={result.text}
        inputLabel={t.input}
        outputLabel={t.output}
        inputActions={<SampleButton onClick={() => setInput(PANGU_SAMPLE)} />}
        onClear={() => setInput("")}
        inputFooter={<Stats text={input} />}
        outputFooter={
          <>
            <span>{t.added(result.added)}</span>
            <Stats text={result.text} />
          </>
        }
      />

      <p className="flex items-start gap-1.5 px-1 text-[11px] leading-relaxed text-foreground-faint">
        <Type className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t.note}
      </p>
    </div>
  );
}
