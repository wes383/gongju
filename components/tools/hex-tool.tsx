"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { hexToText, safe, textToHex, type HexSeparator } from "@/lib/encoding";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "encode" | "decode";

const SAMPLE = "Hello 世界";

export function HexTool() {
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("encode");
  const [upper, setUpper] = React.useState(false);
  const [separator, setSeparator] = React.useState<HexSeparator>("space");

  const { value: output, error } = React.useMemo(
    () =>
      safe(() => {
        if (!input) return "";
        return mode === "encode"
          ? textToHex(input, { upper, separator })
          : hexToText(input);
      }),
    [input, mode, upper, separator]
  );

  const swap = () => {
    if (output) setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel="转换方向"
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: "字符串 → 十六进制" },
            { value: "decode", label: "十六进制 → 字符串" },
          ]}
        />
        {mode === "encode" && (
          <>
            <Toggle checked={upper} onChange={setUpper} label="大写" />
            <Segmented
              ariaLabel="分隔符"
              value={separator}
              onChange={setSeparator}
              options={[
                { value: "none", label: "无" },
                { value: "space", label: "空格" },
                { value: "comma", label: "逗号" },
                { value: "0x", label: "0x 前缀" },
              ]}
            />
          </>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "encode" ? "原文" : "十六进制"}
        outputLabel={mode === "encode" ? "十六进制" : "原文"}
        inputPlaceholder={
          mode === "encode" ? "输入文本…" : "粘贴 48 65 6c 6c 6f 或 48656c6c6f…"
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
        按 UTF-8 字节转换，空格、逗号、<code className="font-mono">0x</code> 前缀与换行都会被自动忽略，
        因此可以直接粘贴 hexdump 片段。
      </p>
    </div>
  );
}
