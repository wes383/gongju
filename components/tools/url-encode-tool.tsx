"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { decodeUrl, encodeUrl, safe, type UrlEncodeMode } from "@/lib/encoding";
import {
  DualPane,
  OptionBar,
  PaneButton,
  Segmented,
  Stats,
} from "@/components/tools/tool-ui";

type Mode = "encode" | "decode";

const SAMPLE = "https://example.com/搜索?q=你好 世界&tag=编码 解码";

export function UrlEncodeTool() {
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<Mode>("encode");
  const [scope, setScope] = React.useState<UrlEncodeMode>("component");

  const { value: output, error } = React.useMemo(
    () =>
      safe(() => {
        if (!input) return "";
        return mode === "encode" ? encodeUrl(input, scope) : decodeUrl(input, scope);
      }),
    [input, mode, scope]
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
        <Segmented
          ariaLabel="编码范围"
          value={scope}
          onChange={setScope}
          options={[
            { value: "component", label: "参数值", hint: "encodeURIComponent：& = ? / 也会被编码" },
            { value: "uri", label: "整条 URL", hint: "encodeURI：保留 :/?#[]@ 等结构字符" },
            { value: "form", label: "表单", hint: "application/x-www-form-urlencoded：空格转 +" },
          ]}
        />
      </OptionBar>

      <DualPane
        input={input}
        onInputChange={setInput}
        output={output ?? ""}
        error={error}
        inputLabel={mode === "encode" ? "原文" : "已编码"}
        outputLabel={mode === "encode" ? "已编码" : "原文"}
        inputPlaceholder={
          mode === "encode" ? "输入需要编码的文本或 URL…" : "粘贴含 %XX 的字符串…"
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

      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-relaxed text-foreground-muted">
        <span className="font-medium text-foreground">怎么选：</span>
        只编码查询参数的值用「参数值」；整条链接要放进另一个 URL 里用「整条 URL」；
        对接表单提交或后端按 <code className="font-mono text-foreground">+</code> 解析空格的场景用「表单」。
      </div>
    </div>
  );
}
