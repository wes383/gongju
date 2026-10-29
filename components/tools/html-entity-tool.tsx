"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { decodeHtmlEntities, encodeHtmlEntities, safe } from "@/lib/encoding";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
  Toggle,
} from "@/components/tools/tool-ui";

type Mode = "encode" | "decode";

const SAMPLE = `<div class="card" data-tip="提示">Tom & Jerry < 3 "引号" '单引号'</div>`;

export function HtmlEntityTool() {
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
          ariaLabel="转换方向"
          value={mode}
          onChange={setMode}
          options={[
            { value: "encode", label: "编码" },
            { value: "decode", label: "解码" },
          ]}
        />
        {mode === "encode" && (
          <>
            <Toggle
              checked={nonAscii}
              onChange={setNonAscii}
              label="中文等非 ASCII 转数字实体"
              hint="把所有非 ASCII 字符转成 &#NNNN;，可避免乱码"
            />
            <Toggle
              checked={hex}
              onChange={setHex}
              label="十六进制实体"
              hint="使用 &#x4E2D; 而不是 &#20013;"
            />
          </>
        )}
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "encode" ? "原文" : "含实体的文本"}
        outputLabel={mode === "encode" ? "转义结果" : "还原结果"}
        inputPlaceholder={
          mode === "encode" ? "输入 HTML / 文本…" : "粘贴含 &amp; &lt; &#20013; 的文本…"
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
        解码支持全部 HTML5 常用命名实体（<code className="font-mono">&amp;nbsp;</code>、
        <code className="font-mono">&amp;copy;</code>、<code className="font-mono">&amp;mdash;</code>…）
        以及十进制 / 十六进制数字实体。
      </p>
    </div>
  );
}
