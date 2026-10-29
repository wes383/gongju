"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { decodeHtmlEntities, encodeHtmlEntities, safe } from "@/lib/encoding";
import { useCopy } from "@/components/locale-provider";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "encode" | "decode";

const COPY = {
  zh: {
    encode: "编码",
    decode: "解码",
    nonAscii: "中文等非 ASCII 转数字实体",
    nonAsciiHint: "把所有非 ASCII 字符转成 &#NNNN;，可避免乱码",
    hex: "十六进制实体",
    hexHint: "使用 &#x4E2D; 而不是 &#20013;",
    plain: "原文",
    withEntities: "含实体的文本",
    escaped: "转义结果",
    restored: "还原结果",
    inputPlaceholder: "输入 HTML / 文本…",
    decodePlaceholder: "粘贴含 &amp; &lt; &#20013; 的文本…",
    sample: "示例",
    sampleText: `<div class="card" data-tip="提示">Tom & Jerry < 3 "引号" '单引号'</div>`,
    note: "解码支持全部 HTML5 常用命名实体（&nbsp;、&copy;、&mdash;…）以及十进制 / 十六进制数字实体。",
  },
  en: {
    encode: "Encode",
    decode: "Decode",
    nonAscii: "Encode non-ASCII as numbers",
    nonAsciiHint: "Turn every non-ASCII character into &#NNNN; to avoid mojibake",
    hex: "Hex entities",
    hexHint: "Emit &#x4E2D; instead of &#20013;",
    plain: "Text",
    withEntities: "Text with entities",
    escaped: "Escaped",
    restored: "Decoded",
    inputPlaceholder: "HTML or plain text…",
    decodePlaceholder: "Paste text containing &amp; &lt; &#20013;…",
    sample: "Sample",
    sampleText: `<div class="card" data-tip="hi">Tom & Jerry < 3 "quotes" 'apostrophe'</div>`,
    note: "Decoding covers the common HTML5 named entities (&nbsp;, &copy;, &mdash;…) plus decimal and hex numeric entities.",
  },
};

export function HtmlEntityTool() {
  const t = useCopy(COPY);
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("encode");
  const [nonAscii, setNonAscii] = React.useState(false);
  const [hex, setHex] = React.useState(false);

  const { value: output, error } = React.useMemo(
    () =>
      safe(() => {
        if (!input) return "";
        return mode === "encode"
          ? encodeHtmlEntities(input, { encodeNonAscii: nonAscii, hex })
          : decodeHtmlEntities(input);
      }),
    [input, mode, nonAscii, hex]
  );

  const swap = () => {
    if (output) setInput(output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  };

  return (
    <div className="flex flex-col gap-4">
      <OptionBar>
        <Segmented
          ariaLabel={t.encode}
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: t.encode },
            { value: "decode", label: t.decode },
          ]}
        />
        {mode === "encode" && (
          <>
            <Toggle
              checked={nonAscii}
              onChange={setNonAscii}
              label={t.nonAscii}
              hint={t.nonAsciiHint}
            />
            <Toggle checked={hex} onChange={setHex} label={t.hex} hint={t.hexHint} />
          </>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "encode" ? t.plain : t.withEntities}
        outputLabel={mode === "encode" ? t.escaped : t.restored}
        inputPlaceholder={mode === "encode" ? t.inputPlaceholder : t.decodePlaceholder}
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
