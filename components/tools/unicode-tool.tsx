"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { safe, textToUnicode, unicodeToText, type UnicodeFormat } from "@/lib/encoding";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "escape" | "unescape";

const SAMPLE = "中文转 Unicode：你好，世界！";

export function UnicodeTool() {
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
          ariaLabel="转换方向"
          value={mode}
          onChange={setMode}
          options={[
            { value: "escape", label: "转 Unicode" },
            { value: "unescape", label: "还原文本" },
          ]}
        />
        {mode === "escape" && (
          <>
            <Segmented
              ariaLabel="输出格式"
              value={format}
              onChange={setFormat}
              options={[
                { value: "js", label: "\\uXXXX", hint: "JavaScript 字符串转义" },
                { value: "html", label: "&#NNNN;", hint: "HTML 十进制实体" },
                { value: "codepoint", label: "U+XXXX", hint: "Unicode 码位写法" },
              ]}
            />
            <Toggle
              checked={nonAsciiOnly}
              onChange={setNonAsciiOnly}
              label="仅转换非 ASCII"
              hint="关闭后英文与标点也会一起转义"
            />
          </>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "escape" ? "原文" : "转义序列"}
        outputLabel={mode === "escape" ? "Unicode" : "原文"}
        inputPlaceholder={
          mode === "escape"
            ? "输入中文或任意文本…"
            : "粘贴 \\u4E2D\\u6587 / &#20013; / U+4E2D 等转义序列…"
        }
        inputActions={
          <PaneButton onClick={() => setInput(SAMPLE)} title="填入示例">
            <Sparkles className="h-3.5 w-3.5" />
            <span>示例</span>
          </PaneButton>
        }
        onClear={() => setInput("")}
        onSwap={swap}
        inputFooter={<Stats text={input} />}
        outputFooter={output ? <Stats text={output} /> : null}
      />

      <p className="text-xs leading-relaxed text-foreground-subtle">
        还原时同时识别 <code className="font-mono">\uXXXX</code>、
        <code className="font-mono">\u&#123;1F600&#125;</code>、
        <code className="font-mono">&#38;#20013;</code>、
        <code className="font-mono">U+4E2D</code>、<code className="font-mono">0x4E2D</code>。
        emoji 等补充平面字符会输出为代理对（JS 格式）。
      </p>
    </div>
  );
}
