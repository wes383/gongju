"use client";

import * as React from "react";
import { DualPane, OptionBar, OptionField, SampleButton, Segmented } from "@/components/tools/tool-ui";
import { useCopy } from "@/components/locale-provider";
import { escapeText, type EscapeKind } from "@/lib/escape";
import { safe } from "@/lib/errors";

const COPY = {
  zh: {
    format: "格式",
    direction: "方向",
    escape: "转义",
    unescape: "反转义",
    json: "JSON",
    javascript: "JavaScript",
    html: "HTML",
    url: "URL",
    input: "原文",
    escaped: "转义后",
    unescaped: "还原后",
    inputPlaceholder: "粘贴要处理的内容",
    clear: "清空",
    sample: "示例",
    note: "JSON 与 JavaScript 遵循同一套反斜杠规则，JavaScript 额外转义单引号，方便放进 '…' 里；HTML 只处理 & < > \" ' 五个字符；URL 用百分号编码，空格会变成 %20。",
  },
  en: {
    format: "Format",
    direction: "Direction",
    escape: "Escape",
    unescape: "Unescape",
    json: "JSON",
    javascript: "JavaScript",
    html: "HTML",
    url: "URL",
    input: "Input",
    escaped: "Escaped",
    unescaped: "Unescaped",
    inputPlaceholder: "Paste the text to process",
    clear: "Clear",
    sample: "Sample",
    note: "JSON and JavaScript share the same backslash rules; JavaScript also escapes single quotes so the result drops into '…'. HTML only touches & < > \" '. URL uses percent-encoding, where a space becomes %20.",
  },
};

const SAMPLES: Record<EscapeKind, { raw: string }> = {
  json: { raw: 'He said "hi"\nand left\t— 100% done' },
  javascript: { raw: "it's a \"test\"\nwith a newline" },
  html: { raw: '<a href="/x?a=1&b=2">链接</a>' },
  url: { raw: "q=中文 搜索&page=1" },
};

export function StringEscapeTool() {
  const t = useCopy(COPY);
  const [kind, setKind] = React.useState<EscapeKind>("json");
  const [unescape, setUnescape] = React.useState(false);
  const [input, setInput] = React.useState("");

  const { value, error } = React.useMemo(
    () => safe(() => escapeText(kind, input, unescape)),
    [kind, input, unescape]
  );
  const output = value ?? "";

  return (
    <div className="flex flex-col gap-3">
      <OptionBar>
        <OptionField label={t.format}>
          <Segmented
            ariaLabel={t.format}
            value={kind}
            onChange={setKind}
            options={[
              { value: "json" as EscapeKind, label: t.json },
              { value: "javascript" as EscapeKind, label: t.javascript },
              { value: "html" as EscapeKind, label: t.html },
              { value: "url" as EscapeKind, label: t.url },
            ]}
          />
        </OptionField>
        <OptionField label={t.direction}>
          <Segmented
            ariaLabel={t.direction}
            value={unescape ? "unescape" : "escape"}
            onChange={(next) => setUnescape(next === "unescape")}
            options={[
              { value: "escape", label: t.escape },
              { value: "unescape", label: t.unescape },
            ]}
          />
        </OptionField>
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output}
        error={error}
        inputLabel={unescape ? t.escaped : t.input}
        outputLabel={unescape ? t.unescaped : t.escaped}
        inputPlaceholder={t.inputPlaceholder}
        inputActions={
          <SampleButton
            onClick={() => {
              setInput(SAMPLES[kind].raw);
              setUnescape(false);
            }}
            label={t.sample}
          />
        }
        onSwap={
          output
            ? () => {
                setInput(output);
                setUnescape(!unescape);
              }
            : undefined
        }
        onClear={() => setInput("")}
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
