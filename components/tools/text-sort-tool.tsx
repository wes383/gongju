"use client";

import * as React from "react";
import { sortLines, type SortMode } from "@/lib/text";
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
    asc: "升序",
    desc: "降序",
    lengthAsc: "短 → 长",
    lengthDesc: "长 → 短",
    numeric: "按数字",
    reverse: "反转行序",
    dedupe: "去重",
    ignoreCase: "忽略大小写",
    inputLabel: "原文",
    outputLabel: "排序结果",
    placeholder: "每行一条，粘贴后自动排序…",
    sampleText: "banana\nApple\ncherry\napple\n42\n7\n100",
    lines: "行",
  },
  en: {
    asc: "A → Z",
    desc: "Z → A",
    lengthAsc: "Short → long",
    lengthDesc: "Long → short",
    numeric: "Numeric",
    reverse: "Reverse",
    dedupe: "Dedupe",
    ignoreCase: "Ignore case",
    inputLabel: "Input",
    outputLabel: "Sorted",
    placeholder: "One item per line, sorted as you type…",
    sampleText: "banana\nApple\ncherry\napple\n42\n7\n100",
    lines: "lines",
  },
};

const MODES: { value: SortMode; key: keyof (typeof COPY)["zh"] }[] = [
  { value: "asc", key: "asc" },
  { value: "desc", key: "desc" },
  { value: "lengthAsc", key: "lengthAsc" },
  { value: "lengthDesc", key: "lengthDesc" },
  { value: "numeric", key: "numeric" },
  { value: "reverse", key: "reverse" },
];

export function TextSortTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<SortMode>("asc");
  const [dedupe, setDedupe] = React.useState(false);
  const [ignoreCase, setIgnoreCase] = React.useState(true);

  const output = React.useMemo(
    () => sortLines(input, { mode, dedupe, ignoreCase }),
    [input, mode, dedupe, ignoreCase]
  );

  const lineCount = (text: string) => (text ? text.split("\n").filter(Boolean).length : 0);

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.outputLabel}
          value={mode}
          onChange={setMode}
          options={MODES.map((m) => ({ value: m.value, label: t[m.key] as string }))}
        />
        <Toggle checked={dedupe} onChange={setDedupe} label={t.dedupe} />
        <Toggle checked={ignoreCase} onChange={setIgnoreCase} label={t.ignoreCase} />
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
        inputFooter={
          <span>
            {lineCount(input)} {t.lines}
          </span>
        }
        outputFooter={
          output ? (
            <span>
              {lineCount(output)} {t.lines}
            </span>
          ) : null
        }
      />
    </div>
  );
}
