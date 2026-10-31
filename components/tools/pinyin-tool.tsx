"use client";

import * as React from "react";
import { pinyin } from "pinyin-pro";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  SampleButton,
  Segmented,
  Toggle,
} from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    symbol: "带声调",
    num: "数字声调",
    none: "不带声调",
    initials: "只取首字母",
    separator: "分隔符",
    space: "空格",
    hyphen: "连字符",
    compact: "不分隔",
    inputLabel: "中文",
    outputLabel: "拼音",
    placeholder: "输入中文，例如 中文测试",
    sampleText: "中文测试，你好世界！",
    hint: "非汉字字符会原样保留",
  },
  en: {
    symbol: "With tones",
    num: "Numeric tones",
    none: "No tones",
    initials: "Initials only",
    separator: "Separator",
    space: "Space",
    hyphen: "Hyphen",
    compact: "None",
    inputLabel: "Chinese",
    outputLabel: "Pinyin",
    placeholder: "Type Chinese characters…",
    sampleText: "中文测试，你好世界！",
    hint: "Non-Chinese characters are kept as-is",
  },
};

type ToneType = "symbol" | "num" | "none";
type Sep = " " | "-" | "";

export function PinyinTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [tone, setTone] = React.useState<ToneType>("symbol");
  const [initials, setInitials] = React.useState(false);
  const [sep, setSep] = React.useState<Sep>(" ");

  const output = React.useMemo(() => {
    if (!input.trim()) return "";
    try {
      const parts = pinyin(input, {
        toneType: initials ? "none" : tone,
        pattern: initials ? "first" : "pinyin",
        type: "array",
        nonZh: "consecutive",
      });
      return parts.join(sep);
    } catch {
      return "";
    }
  }, [input, tone, initials, sep]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.outputLabel}
          value={tone}
          onChange={setTone}
          options={[
            { value: "symbol", label: t.symbol },
            { value: "num", label: t.num },
            { value: "none", label: t.none },
          ]}
        />
        <Toggle checked={initials} onChange={setInitials} label={t.initials} />
        <span className="text-xs font-medium text-foreground-muted">{t.separator}</span>
        <Segmented
          ariaLabel={t.separator}
          value={sep}
          onChange={setSep}
          options={[
            { value: " ", label: t.space },
            { value: "-", label: t.hyphen },
            { value: "", label: t.compact },
          ]}
        />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        inputLabel={t.inputLabel}
        outputLabel={t.outputLabel}
        inputPlaceholder={t.placeholder}
        inputActions={<SampleButton onClick={() => setInput(t.sampleText)} />}
        onClear={() => setInput("")}
        inputFooter={<span>{t.hint}</span>}
        outputFooter={output ? <span>{output.length}</span> : null}
      />
    </div>
  );
}
