"use client";

import * as React from "react";
import { convertCase, type CaseStyle } from "@/lib/text";
import { useCopy } from "@/components/locale-provider";
import { DualPane, OptionBar, SampleButton, Segmented } from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    upper: "全部大写",
    lower: "全部小写",
    title: "标题式",
    sentence: "句首大写",
    camel: "小驼峰",
    pascal: "大驼峰",
    snake: "下划线",
    kebab: "中划线",
    constant: "常量式",
    dot: "点号",
    inputLabel: "原文",
    outputLabel: "转换结果",
    placeholder: "输入文本，例如 user profile settings",
    sampleText: "user profile settings",
  },
  en: {
    upper: "UPPER",
    lower: "lower",
    title: "Title Case",
    sentence: "Sentence case",
    camel: "camelCase",
    pascal: "PascalCase",
    snake: "snake_case",
    kebab: "kebab-case",
    constant: "CONSTANT",
    dot: "dot.case",
    inputLabel: "Input",
    outputLabel: "Result",
    placeholder: "Type something, e.g. user profile settings",
    sampleText: "user profile settings",
  },
};

const STYLES: { value: CaseStyle; key: keyof (typeof COPY)["zh"] }[] = [
  { value: "upper", key: "upper" },
  { value: "lower", key: "lower" },
  { value: "title", key: "title" },
  { value: "sentence", key: "sentence" },
  { value: "camel", key: "camel" },
  { value: "pascal", key: "pascal" },
  { value: "snake", key: "snake" },
  { value: "kebab", key: "kebab" },
  { value: "constant", key: "constant" },
  { value: "dot", key: "dot" },
];

export function TextCaseTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [style, setStyle] = React.useState<CaseStyle>("camel");

  const output = React.useMemo(() => convertCase(input, style), [input, style]);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.outputLabel}
          className="flex-wrap"
          value={style}
          onChange={setStyle}
          options={STYLES.map((s) => ({ value: s.value, label: t[s.key] as string }))}
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
        inputFooter={<span>{input.length}</span>}
        outputFooter={output ? <span>{output.length}</span> : null}
      />
    </div>
  );
}
