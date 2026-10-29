"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { safe, textToUnicode, unicodeToText, type UnicodeFormat } from "@/lib/encoding";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "escape" | "unescape";

const COPY = {
  zh: {
    escape: "转 Unicode",
    unescape: "还原文本",
    jsHint: "JavaScript 字符串转义",
    htmlHint: "HTML 十进制实体",
    codepointHint: "Unicode 码位写法",
    nonAsciiOnly: "仅转换非 ASCII",
    nonAsciiOnlyHint: "关闭后英文与标点也会一起转义",
    plain: "原文",
    escapes: "转义序列",
    unicode: "Unicode",
    inputPlaceholder: "输入中文或任意文本…",
    unescapePlaceholder: "粘贴 \\u4E2D\\u6587 / &#20013; / U+4E2D 等转义序列…",
    sample: "示例",
    sampleText: "中文转 Unicode：你好，世界！",
    note: "还原时同时识别 \\uXXXX、\\u{1F600}、&#20013;、U+4E2D、0x4E2D。emoji 等补充平面字符会输出为代理对（JS 格式）。",
  },
  en: {
    escape: "To Unicode",
    unescape: "To text",
    jsHint: "JavaScript string escape",
    htmlHint: "HTML decimal entity",
    codepointHint: "Unicode code point notation",
    nonAsciiOnly: "Non-ASCII only",
    nonAsciiOnlyHint: "Turn off to escape ASCII letters and punctuation too",
    plain: "Text",
    escapes: "Escapes",
    unicode: "Unicode",
    inputPlaceholder: "Any text, e.g. 你好 or hello…",
    unescapePlaceholder: "Paste \\u4E2D\\u6587 / &#20013; / U+4E2D sequences…",
    sample: "Sample",
    sampleText: "Unicode escape: 你好，世界！",
    note: "Unescaping understands \\uXXXX, \\u{1F600}, &#20013;, U+4E2D and 0x4E2D. Characters outside the BMP such as emoji are emitted as surrogate pairs in JS format.",
  },
};

export function UnicodeTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("escape");
  const [format, setFormat] = React.useState<UnicodeFormat>("js");
  const [nonAsciiOnly, setNonAsciiOnly] = React.useState(true);

  const { value: output, error } = React.useMemo(
    () =>
      safe(() => {
        if (!input) return "";
        return mode === "escape"
          ? textToUnicode(input, { format, nonAsciiOnly })
          : unicodeToText(input);
      }),
    [input, mode, format, nonAsciiOnly]
  );

  const swap = () => {
    if (output) setInput(output);
    setMode((m) => (m === "escape" ? "unescape" : "escape"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.escape}
          value={mode}
          onChange={setMode}
          options={[
            { value: "escape", label: t.escape },
            { value: "unescape", label: t.unescape },
          ]}
        />
        {mode === "escape" && (
          <>
            <Segmented
              ariaLabel={t.unicode}
              value={format}
              onChange={setFormat}
              options={[
                { value: "js", label: "\\uXXXX", hint: t.jsHint },
                { value: "html", label: "&#NNNN;", hint: t.htmlHint },
                { value: "codepoint", label: "U+XXXX", hint: t.codepointHint },
              ]}
            />
            <Toggle
              checked={nonAsciiOnly}
              onChange={setNonAsciiOnly}
              label={t.nonAsciiOnly}
              hint={t.nonAsciiOnlyHint}
            />
          </>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "escape" ? t.plain : t.escapes}
        outputLabel={mode === "escape" ? t.unicode : t.plain}
        inputPlaceholder={mode === "escape" ? t.inputPlaceholder : t.unescapePlaceholder}
        inputActions={
          <PaneButton onClick={() => setInput(t.sampleText)} title={t.sample}>
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t.sample}</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={output ? <Stats text={output} /> : null}
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">{t.note}</p>
    </div>
  );
}
