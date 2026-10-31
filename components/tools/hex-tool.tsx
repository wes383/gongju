"use client";

import * as React from "react";

import {
  hexToText,
  textToHex,
  type HexSeparator,
} from "@/lib/encoding";
import { safe } from "@/lib/errors";
import {
  useCopy,
} from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  Segmented,
  Stats,
  Toggle,
  SampleButton,
} from "@/components/tools/tool-ui";

type Mode = "encode" | "decode";

const COPY = {
  zh: {
    toHex: "字符串 → 十六进制",
    toText: "十六进制 → 字符串",
    upper: "大写",
    separator: "分隔符",
    none: "无",
    space: "空格",
    comma: "逗号",
    prefix: "0x 前缀",
    plain: "原文",
    hex: "十六进制",
    inputPlaceholder: "输入文本…",
    decodePlaceholder: "粘贴 48 65 6c 6c 6f 或 48656c6c6f…",
    sample: "示例",
    sampleText: "Hello 世界",
    note: "按 UTF-8 字节转换，空格、逗号、0x 前缀与换行都会被自动忽略，因此可以直接粘贴 hexdump 片段。",
  },
  en: {
    toHex: "Text → Hex",
    toText: "Hex → Text",
    upper: "Uppercase",
    separator: "Separator",
    none: "None",
    space: "Space",
    comma: "Comma",
    prefix: "0x prefix",
    plain: "Text",
    hex: "Hex",
    inputPlaceholder: "Enter text…",
    decodePlaceholder: "Paste 48 65 6c 6c 6f or 48656c6c6f…",
    sample: "Sample",
    sampleText: "Hello, world! ✓",
    note: "Conversion is byte-wise on UTF-8, and spaces, commas, 0x prefixes and newlines are ignored, so you can paste a hexdump fragment directly.",
  },
};

export function HexTool() {
  const t = useCopy(COPY);
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
          ariaLabel={t.toHex}
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: t.toHex },
            { value: "decode", label: t.toText },
          ]}
        />
        {mode === "encode" && (
          <>
            <Toggle checked={upper} onChange={setUpper} label={t.upper} />
            <Segmented
              ariaLabel={t.separator}
              value={separator}
              onChange={setSeparator}
              options={[
                { value: "none", label: t.none },
                { value: "space", label: t.space },
                { value: "comma", label: t.comma },
                { value: "0x", label: t.prefix },
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
        inputLabel={mode === "encode" ? t.plain : t.hex}
        outputLabel={mode === "encode" ? t.hex : t.plain}
        inputPlaceholder={mode === "encode" ? t.inputPlaceholder : t.decodePlaceholder}
        inputActions={
          <SampleButton onClick={() => setInput(t.sampleText)} />
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
