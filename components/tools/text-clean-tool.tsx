"use client";

import * as React from "react";
import { cleanText, type CleanOptions } from "@/lib/text";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  SampleButton,
  Toggle,
} from "@/components/tools/tool-ui";

const COPY = {
  zh: {
    trimLines: "去掉行首尾空格",
    collapseSpaces: "合并连续空格",
    removeEmptyLines: "删除空行",
    removeDuplicateLines: "删除重复行",
    inputLabel: "原文",
    outputLabel: "清理结果",
    placeholder: "粘贴需要清理的文本…",
    lines: "行",
    sampleText:
      "  第一行有缩进  \n\n\n第二行   中间有多个空格\n第二行   中间有多个空格\n\n  第四行  ",
  },
  en: {
    trimLines: "Trim each line",
    collapseSpaces: "Collapse repeated spaces",
    removeEmptyLines: "Remove empty lines",
    removeDuplicateLines: "Remove duplicate lines",
    inputLabel: "Input",
    outputLabel: "Cleaned",
    placeholder: "Paste the text you want to clean…",
    lines: "lines",
    sampleText:
      "  indented first line  \n\n\nsecond line   with   extra spaces\nsecond line   with   extra spaces\n\n  fourth line  ",
  },
};

export function TextCleanTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [opts, setOpts] = React.useState<CleanOptions>({
    trimLines: true,
    collapseSpaces: true,
    removeEmptyLines: true,
    removeDuplicateLines: false,
  });

  const output = React.useMemo(() => cleanText(input, opts), [input, opts]);

  const set = (key: keyof CleanOptions) => (value: boolean) =>
    setOpts((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Toggle checked={opts.trimLines} onChange={set("trimLines")} label={t.trimLines} />
        <Toggle
          checked={opts.collapseSpaces}
          onChange={set("collapseSpaces")}
          label={t.collapseSpaces}
        />
        <Toggle
          checked={opts.removeEmptyLines}
          onChange={set("removeEmptyLines")}
          label={t.removeEmptyLines}
        />
        <Toggle
          checked={opts.removeDuplicateLines}
          onChange={set("removeDuplicateLines")}
          label={t.removeDuplicateLines}
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
        inputFooter={<span>
            {input.split("\n").length} {t.lines}
          </span>}
        outputFooter={output ? <span>
              {output.split("\n").length} {t.lines}
            </span> : null}
      />
    </div>
  );
}
